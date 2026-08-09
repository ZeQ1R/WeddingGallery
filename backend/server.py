from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import io
import uuid
import time
import base64
import secrets
import logging
import zipfile
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

import jwt
import bcrypt
import qrcode
import httpx
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form, Query, Header
from starlette.responses import Response as StarletteResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, ConfigDict
from bson import ObjectId

import storage

# ---------------------------------------------------------------- setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ["JWT_SECRET"]
MAX_IMAGE_MB = 25
MAX_VIDEO_MB = 200
ALLOWED_IMAGE = {"jpg", "jpeg", "png", "gif", "webp", "heic", "heif"}
ALLOWED_VIDEO = {"mp4", "mov", "webm", "avi", "mpeg", "mpg", "quicktime"}

PLANS = {
    "free_trial": {"name": "Free Trial", "price": 0, "max_weddings": 25, "storage_gb": 5},
    "basic": {"name": "Basic", "price": 49, "max_weddings": 5, "storage_gb": 25},
    "pro": {"name": "Pro", "price": 149, "max_weddings": 25, "storage_gb": 150},
    "enterprise": {"name": "Enterprise", "price": 499, "max_weddings": 9999, "storage_gb": 2000},
}

# ---- email (Emergent-managed Resend) ----
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "WedSnap")


async def send_email(to_email: str, subject: str, html: str):
    payload = {"to": [to_email], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    async with httpx.AsyncClient(timeout=30) as c:
        resp = await c.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                            headers={"X-Email-Key": EMAIL_KEY}, json=payload)
    resp.raise_for_status()
    return resp.json()


def approval_email_html(business_name: str) -> str:
    login_url = f"{os.environ['FRONTEND_URL']}/login"
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFBF7;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E8E6E1;border-radius:24px;overflow:hidden">
          <tr><td style="background:#1A1A1A;padding:28px 32px" align="center">
            <span style="color:#C5A059;font-size:26px;font-weight:bold;letter-spacing:1px">WedSnap</span>
          </td></tr>
          <tr><td style="padding:40px 40px 8px" align="center">
            <p style="color:#C5A059;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px">Welcome aboard</p>
            <h1 style="color:#1A1A1A;font-size:30px;margin:0;font-weight:400">You're approved, {business_name}!</h1>
            <p style="color:#5C5C5C;font-size:15px;line-height:1.6;margin:20px 0 0">
              Your venue account is now active. You can create weddings, generate guest QR codes and invite couples to their private galleries.
            </p>
          </td></tr>
          <tr><td style="padding:28px 40px 40px" align="center">
            <a href="{login_url}" style="display:inline-block;background:#C5A059;color:#FFFFFF;text-decoration:none;padding:15px 40px;border-radius:999px;font-size:16px;font-weight:bold">Go to my dashboard</a>
          </td></tr>
        </table>
        <p style="color:#999999;font-size:12px;margin:20px 0 0">Sent with love by WedSnap</p>
      </td></tr>
    </table>
    """


# ---- abuse protection ----
UPLOAD_RATE_LIMIT = 40          # uploads per window per IP
UPLOAD_RATE_WINDOW = 60         # seconds
LOGIN_MAX_FAILS = 5
LOGIN_LOCKOUT_MIN = 15
_upload_hits = defaultdict(list)


def client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def check_upload_rate(ip: str) -> bool:
    now = time.time()
    hits = _upload_hits[ip]
    while hits and hits[0] < now - UPLOAD_RATE_WINDOW:
        hits.pop(0)
    if len(hits) >= UPLOAD_RATE_LIMIT:
        return False
    hits.append(now)
    return True


def invite_email_html(bride: str, groom: str, link: str) -> str:
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FDFBF7;padding:32px 0;font-family:Arial,Helvetica,sans-serif">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E8E6E1;border-radius:24px;overflow:hidden">
          <tr><td style="background:#1A1A1A;padding:28px 32px" align="center">
            <span style="color:#C5A059;font-size:26px;font-weight:bold;letter-spacing:1px">WedSnap</span>
          </td></tr>
          <tr><td style="padding:40px 40px 8px" align="center">
            <p style="color:#C5A059;font-size:12px;letter-spacing:3px;text-transform:uppercase;margin:0 0 12px">Your private gallery is ready</p>
            <h1 style="color:#1A1A1A;font-size:34px;margin:0;font-weight:400">{bride} &amp; {groom}</h1>
            <p style="color:#5C5C5C;font-size:15px;line-height:1.6;margin:20px 0 0">
              Every photo and video your guests captured is waiting for you in one elegant place.
              Tap below to open your private gallery — no password needed.
            </p>
          </td></tr>
          <tr><td style="padding:28px 40px 40px" align="center">
            <a href="{link}" style="display:inline-block;background:#C5A059;color:#FFFFFF;text-decoration:none;padding:15px 40px;border-radius:999px;font-size:16px;font-weight:bold">Open my gallery</a>
            <p style="color:#999999;font-size:12px;margin:24px 0 0">This secure link is just for you. Please don't share it.</p>
          </td></tr>
        </table>
        <p style="color:#999999;font-size:12px;margin:20px 0 0">Sent with love by WedSnap</p>
      </td></tr>
    </table>
    """


# ---------------------------------------------------------------- models
def _validate_object_id(v):
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)

PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str
    business_name: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class WeddingInput(BaseModel):
    bride_name: str
    groom_name: str
    wedding_date: str
    venue: Optional[str] = None
    couple_email: Optional[str] = None


class MessageInput(BaseModel):
    guest_name: Optional[str] = None
    text: str


class PasswordInput(BaseModel):
    password: str


# ---------------------------------------------------------------- auth helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {"sub": user_id, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(hours=12), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def user_public(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "name": user.get("name"),
        "email": user.get("email"),
        "role": user.get("role"),
        "business_name": user.get("business_name"),
        "plan": user.get("plan"),
        "wedding_id": user.get("wedding_id"),
        "password_set": user.get("password_set", user.get("role") != "couple"),
        "status": user.get("status", "active"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_role(*roles):
    async def checker(user: dict = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker


# ---------------------------------------------------------------- auth routes
@api_router.post("/auth/register")
async def register(data: RegisterInput, response: Response):
    email = data.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "name": data.name,
        "email": email,
        "password_hash": hash_password(data.password),
        "role": "restaurant",
        "business_name": data.business_name or data.name,
        "plan": "free_trial",
        "status": "pending",
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    access = create_access_token(uid, email, "restaurant")
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await audit(uid, "register", f"Restaurant {data.business_name or data.name} registered")
    doc["_id"] = res.inserted_id
    return user_public(doc)


@api_router.post("/auth/login")
async def login(data: LoginInput, request: Request, response: Response):
    email = data.email.lower().strip()
    ip = client_ip(request)
    identifier = f"{ip}:{email}"
    now = datetime.now(timezone.utc)

    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until"):
        locked = datetime.fromisoformat(attempt["locked_until"])
        if locked > now:
            mins = max(1, int((locked - now).total_seconds() // 60) + 1)
            raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {mins} minute(s).")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        fails = (attempt.get("fails", 0) if attempt else 0) + 1
        upd = {"identifier": identifier, "fails": fails, "updated_at": now.isoformat()}
        if fails >= LOGIN_MAX_FAILS:
            upd["locked_until"] = (now + timedelta(minutes=LOGIN_LOCKOUT_MIN)).isoformat()
            upd["fails"] = 0
            await db.login_attempts.update_one({"identifier": identifier}, {"$set": upd}, upsert=True)
            raise HTTPException(status_code=429, detail=f"Too many attempts. Account locked for {LOGIN_LOCKOUT_MIN} minutes.")
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": upd}, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    uid = str(user["_id"])
    access = create_access_token(uid, email, user["role"])
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await audit(uid, "login", f"{user['role']} logged in")
    return user_public(user)


@api_router.post("/auth/invite/{token}")
async def accept_invite(token: str, response: Response):
    couple = await db.users.find_one({"invite_token": token, "role": "couple"})
    if not couple:
        raise HTTPException(status_code=404, detail="This invitation is invalid or has expired")
    exp = couple.get("invite_expires")
    if exp and datetime.fromisoformat(exp) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="This invitation has expired. Ask the venue to resend it.")
    uid = str(couple["_id"])
    await db.users.update_one({"_id": couple["_id"]}, {"$set": {"invite_opened_at": now_iso()}})
    access = create_access_token(uid, couple["email"], "couple")
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    await audit(uid, "accept_invite", "Couple opened gallery via invite link")
    return user_public(couple)


@api_router.post("/auth/set-password")
async def set_password(data: PasswordInput, user: dict = Depends(get_current_user)):
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    await db.users.update_one({"_id": user["_id"]},
                              {"$set": {"password_hash": hash_password(data.password), "password_set": True}})
    await audit(str(user["_id"]), "set_password", f"{user['role']} set/updated password")
    return {"message": "Password saved. You can now sign in anytime with your email and password."}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user_public(user)


# ---------------------------------------------------------------- audit
async def audit(user_id: Optional[str], action: str, detail: str):
    await db.audit_logs.insert_one({
        "user_id": user_id, "action": action, "detail": detail, "created_at": now_iso()
    })


# ---------------------------------------------------------------- weddings
def wedding_public(w: dict) -> dict:
    return {
        "id": str(w["_id"]),
        "slug": w["slug"],
        "bride_name": w["bride_name"],
        "groom_name": w["groom_name"],
        "wedding_date": w["wedding_date"],
        "venue": w.get("venue"),
        "couple_email": w.get("couple_email"),
        "status": w.get("status", "active"),
        "restaurant_id": w.get("restaurant_id"),
        "upload_count": w.get("upload_count", 0),
        "created_at": w.get("created_at"),
    }


@api_router.post("/weddings")
async def create_wedding(data: WeddingInput, user: dict = Depends(require_role("restaurant", "admin"))):
    if user.get("role") != "admin":
        status = user.get("status", "active")
        if status == "pending":
            raise HTTPException(status_code=403, detail="Your venue is awaiting admin approval. You'll be able to create weddings once approved.")
        if status == "suspended":
            raise HTTPException(status_code=403, detail="Your venue account is suspended. Please contact the platform admin.")
        plan = PLANS.get(user.get("plan", "free_trial"), PLANS["free_trial"])
        count = await db.weddings.count_documents({"restaurant_id": str(user["_id"])})
        if count >= plan["max_weddings"]:
            raise HTTPException(status_code=403, detail=f"Plan limit reached ({plan['name']}: {plan['max_weddings']} weddings). Upgrade to add more.")
    slug = uuid.uuid4().hex[:10]
    doc = {
        "slug": slug,
        "bride_name": data.bride_name,
        "groom_name": data.groom_name,
        "wedding_date": data.wedding_date,
        "venue": data.venue,
        "couple_email": (data.couple_email or "").lower().strip() or None,
        "status": "active",
        "restaurant_id": str(user["_id"]),
        "upload_count": 0,
        "created_at": now_iso(),
    }
    res = await db.weddings.insert_one(doc)
    doc["_id"] = res.inserted_id
    await audit(str(user["_id"]), "create_wedding", f"{data.bride_name} & {data.groom_name}")

    # optionally create a couple account (password set later via invite/set-password)
    if doc["couple_email"]:
        if not await db.users.find_one({"email": doc["couple_email"]}):
            await db.users.insert_one({
                "name": f"{data.bride_name} & {data.groom_name}",
                "email": doc["couple_email"],
                "password_hash": hash_password(uuid.uuid4().hex),
                "role": "couple",
                "wedding_id": slug,
                "password_set": False,
                "created_at": now_iso(),
            })
    return wedding_public(doc)


@api_router.get("/weddings")
async def list_weddings(status: Optional[str] = None, user: dict = Depends(require_role("restaurant", "admin"))):
    q = {} if user["role"] == "admin" else {"restaurant_id": str(user["_id"])}
    if status:
        q["status"] = status
    items = await db.weddings.find(q).sort("created_at", -1).to_list(1000)
    return [wedding_public(w) for w in items]


@api_router.get("/weddings/{slug}")
async def get_wedding(slug: str, user: dict = Depends(require_role("restaurant", "admin"))):
    w = await db.weddings.find_one({"slug": slug})
    if not w:
        raise HTTPException(status_code=404, detail="Wedding not found")
    if user["role"] != "admin" and w["restaurant_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your wedding")
    return wedding_public(w)


@api_router.patch("/weddings/{slug}/status")
async def update_wedding_status(slug: str, status: str = Query(...), user: dict = Depends(require_role("restaurant", "admin"))):
    w = await db.weddings.find_one({"slug": slug})
    if not w:
        raise HTTPException(status_code=404, detail="Wedding not found")
    if user["role"] != "admin" and w["restaurant_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your wedding")
    await db.weddings.update_one({"slug": slug}, {"$set": {"status": status}})
    return {"message": "updated", "status": status}


@api_router.get("/weddings/{slug}/qr")
async def wedding_qr(slug: str, user: dict = Depends(require_role("restaurant", "admin"))):
    w = await db.weddings.find_one({"slug": slug})
    if not w:
        raise HTTPException(status_code=404, detail="Wedding not found")
    url = f"{os.environ['FRONTEND_URL']}/wedding/{slug}"
    qr = qrcode.QRCode(box_size=10, border=2)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1A1A1A", back_color="#FFFFFF")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {"url": url, "qr_data_url": f"data:image/png;base64,{b64}"}


@api_router.get("/weddings/{slug}/invite-status")
async def invite_status(slug: str, user: dict = Depends(require_role("restaurant", "admin"))):
    w = await db.weddings.find_one({"slug": slug})
    if not w:
        raise HTTPException(status_code=404, detail="Wedding not found")
    if user["role"] != "admin" and w["restaurant_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your wedding")
    couple_email = w.get("couple_email")
    couple = await db.users.find_one({"email": couple_email, "role": "couple"}) if couple_email else None
    return {
        "couple_email": couple_email,
        "invited": bool(couple and couple.get("invite_token")),
        "opened": bool(couple and couple.get("invite_opened_at")),
        "opened_at": couple.get("invite_opened_at") if couple else None,
    }



@api_router.post("/weddings/{slug}/invite")
async def invite_couple(slug: str, user: dict = Depends(require_role("restaurant", "admin"))):
    w = await db.weddings.find_one({"slug": slug})
    if not w:
        raise HTTPException(status_code=404, detail="Wedding not found")
    if user["role"] != "admin" and w["restaurant_id"] != str(user["_id"]):
        raise HTTPException(status_code=403, detail="Not your wedding")
    couple_email = w.get("couple_email")
    if not couple_email:
        raise HTTPException(status_code=400, detail="Add the couple's email to this wedding first.")

    couple = await db.users.find_one({"email": couple_email})
    if not couple:
        res = await db.users.insert_one({
            "name": f"{w['bride_name']} & {w['groom_name']}",
            "email": couple_email,
            "password_hash": hash_password(uuid.uuid4().hex),
            "role": "couple",
            "wedding_id": slug,
            "password_set": False,
            "created_at": now_iso(),
        })
        couple = await db.users.find_one({"_id": res.inserted_id})
    elif couple.get("role") != "couple":
        raise HTTPException(status_code=400, detail="That email belongs to another account type.")

    token = secrets.token_urlsafe(32)
    expires = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    await db.users.update_one({"_id": couple["_id"]},
                              {"$set": {"invite_token": token, "invite_expires": expires, "wedding_id": slug}})

    link = f"{os.environ['FRONTEND_URL']}/invite/{token}"
    try:
        await send_email(couple_email,
                         f"Your wedding gallery — {w['bride_name']} & {w['groom_name']}",
                         invite_email_html(w["bride_name"], w["groom_name"], link))
    except httpx.HTTPStatusError as e:
        logger.error(f"invite email failed: {e.response.status_code} {e.response.text}")
        reason = "the email address looks undeliverable"
        try:
            reason = e.response.json().get("message", reason)
        except Exception:
            pass
        raise HTTPException(status_code=422, detail=f"Couldn't send invite — {reason}")
    except Exception as e:
        logger.error(f"invite email failed: {e}")
        raise HTTPException(status_code=502, detail="Could not send the invitation email. Please try again.")
    await audit(str(user["_id"]), "invite_couple", f"Invited {couple_email} to {slug}")
    return {"message": f"Invitation sent to {couple_email}", "link": link}


# ---------------------------------------------------------------- public (guest) endpoints
@api_router.get("/public/wedding/{slug}")
async def public_wedding(slug: str):
    w = await db.weddings.find_one({"slug": slug})
    if not w:
        raise HTTPException(status_code=404, detail="Wedding not found")
    if w.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="This gallery is unavailable")
    return {
        "slug": w["slug"],
        "bride_name": w["bride_name"],
        "groom_name": w["groom_name"],
        "wedding_date": w["wedding_date"],
        "venue": w.get("venue"),
        "status": w.get("status"),
    }


@api_router.post("/public/wedding/{slug}/upload")
async def guest_upload(slug: str, request: Request, file: UploadFile = File(...), guest_name: str = Form("")):
    ip = client_ip(request)
    if not check_upload_rate(ip):
        raise HTTPException(status_code=429, detail="You're uploading very fast — please wait a moment and try again.")
    w = await db.weddings.find_one({"slug": slug})
    if not w:
        raise HTTPException(status_code=404, detail="Wedding not found")
    if w.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Uploads are disabled for this wedding")

    ext = (file.filename.split(".")[-1] if "." in file.filename else "bin").lower()
    ctype = (file.content_type or "").lower()
    if ext in ALLOWED_IMAGE or ctype.startswith("image/"):
        media_type = "photo"
        limit = MAX_IMAGE_MB
    elif ext in ALLOWED_VIDEO or ctype.startswith("video/"):
        media_type = "video"
        limit = MAX_VIDEO_MB
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type. Upload a photo or video.")

    data = await file.read()
    size_mb = len(data) / (1024 * 1024)
    if size_mb > limit:
        raise HTTPException(status_code=400, detail=f"File too large. Max {limit}MB for {media_type}s.")

    path = f"{storage.APP_NAME}/{slug}/{uuid.uuid4().hex}.{ext}"
    result = storage.put_object(path, data, file.content_type or "application/octet-stream")

    upload_id = str(uuid.uuid4())
    await db.uploads.insert_one({
        "id": upload_id,
        "wedding_slug": slug,
        "storage_path": result["path"],
        "media_type": media_type,
        "content_type": file.content_type,
        "original_filename": file.filename,
        "size": result.get("size", len(data)),
        "guest_name": guest_name.strip() or "Anonymous",
        "is_favorite": False,
        "is_deleted": False,
        "created_at": now_iso(),
    })
    await db.weddings.update_one({"slug": slug}, {"$inc": {"upload_count": 1}})
    return {"id": upload_id, "media_type": media_type, "message": "Uploaded"}


@api_router.post("/public/wedding/{slug}/message")
async def guest_message(slug: str, data: MessageInput):
    w = await db.weddings.find_one({"slug": slug})
    if not w:
        raise HTTPException(status_code=404, detail="Wedding not found")
    doc = {
        "id": str(uuid.uuid4()),
        "wedding_slug": slug,
        "guest_name": (data.guest_name or "").strip() or "Anonymous",
        "text": data.text.strip(),
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc)
    return {"message": "Thank you for your wish!"}


# ---------------------------------------------------------------- file serving
async def _can_access_wedding(slug: str, user: dict) -> bool:
    # Media (photos/videos/messages) is private to the couple. Venues/restaurants
    # can manage the wedding but can NOT view or download the memories.
    if user["role"] == "admin":
        return True
    if user["role"] == "couple":
        return user.get("wedding_id") == slug
    return False


@api_router.get("/files/{upload_id}")
async def serve_file(upload_id: str, request: Request, auth: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    # authenticate via header, query token (for <img>/<video> tags), or cookie
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    else:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    rec = await db.uploads.find_one({"id": upload_id, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="File not found")
    if not await _can_access_wedding(rec["wedding_slug"], user):
        raise HTTPException(status_code=403, detail="Access denied")
    content, ctype = storage.get_object(rec["storage_path"])
    return StarletteResponse(content=content, media_type=rec.get("content_type") or ctype)


# ---------------------------------------------------------------- gallery (restaurant + couple + admin)
def upload_public(u: dict) -> dict:
    return {
        "id": u["id"],
        "media_type": u["media_type"],
        "guest_name": u.get("guest_name"),
        "original_filename": u.get("original_filename"),
        "is_favorite": u.get("is_favorite", False),
        "created_at": u.get("created_at"),
    }


@api_router.get("/gallery/{slug}")
async def gallery(slug: str, media_type: Optional[str] = None, favorites: bool = False,
                  search: Optional[str] = None, user: dict = Depends(get_current_user)):
    if not await _can_access_wedding(slug, user):
        raise HTTPException(status_code=403, detail="Access denied")
    q = {"wedding_slug": slug, "is_deleted": False}
    if media_type in ("photo", "video"):
        q["media_type"] = media_type
    if favorites:
        q["is_favorite"] = True
    if search:
        q["guest_name"] = {"$regex": search, "$options": "i"}
    items = await db.uploads.find(q).sort("created_at", -1).to_list(2000)
    return [upload_public(u) for u in items]


@api_router.get("/gallery/{slug}/messages")
async def gallery_messages(slug: str, user: dict = Depends(get_current_user)):
    if not await _can_access_wedding(slug, user):
        raise HTTPException(status_code=403, detail="Access denied")
    items = await db.messages.find({"wedding_slug": slug}).sort("created_at", -1).to_list(1000)
    return [{"id": m["id"], "guest_name": m.get("guest_name"), "text": m["text"], "created_at": m.get("created_at")} for m in items]


@api_router.post("/gallery/upload/{upload_id}/favorite")
async def toggle_favorite(upload_id: str, user: dict = Depends(get_current_user)):
    rec = await db.uploads.find_one({"id": upload_id, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _can_access_wedding(rec["wedding_slug"], user):
        raise HTTPException(status_code=403, detail="Access denied")
    new_val = not rec.get("is_favorite", False)
    await db.uploads.update_one({"id": upload_id}, {"$set": {"is_favorite": new_val}})
    return {"id": upload_id, "is_favorite": new_val}


@api_router.delete("/gallery/upload/{upload_id}")
async def delete_upload(upload_id: str, user: dict = Depends(get_current_user)):
    rec = await db.uploads.find_one({"id": upload_id, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    if not await _can_access_wedding(rec["wedding_slug"], user):
        raise HTTPException(status_code=403, detail="Access denied")
    await db.uploads.update_one({"id": upload_id}, {"$set": {"is_deleted": True}})
    await db.weddings.update_one({"slug": rec["wedding_slug"]}, {"$inc": {"upload_count": -1}})
    return {"message": "Deleted"}


@api_router.get("/gallery/{slug}/download")
async def download_all(slug: str, request: Request, favorites: bool = False, auth: Optional[str] = Query(None), authorization: Optional[str] = Header(None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif auth:
        token = auth
    else:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    if not user or not await _can_access_wedding(slug, user):
        raise HTTPException(status_code=403, detail="Access denied")

    q = {"wedding_slug": slug, "is_deleted": False}
    if favorites:
        q["is_favorite"] = True
    items = await db.uploads.find(q).to_list(2000)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for i, u in enumerate(items):
            try:
                content, _ = storage.get_object(u["storage_path"])
                ext = u["storage_path"].split(".")[-1]
                name = f"{i+1:04d}_{u.get('guest_name','guest')}.{ext}"
                zf.writestr(name, content)
            except Exception as e:
                logger.error(f"zip error {e}")
    buf.seek(0)
    fname = f"{slug}-favorites.zip" if favorites else f"{slug}-memories.zip"
    return StarletteResponse(content=buf.getvalue(), media_type="application/zip",
                             headers={"Content-Disposition": f'attachment; filename="{fname}"'})


# ---------------------------------------------------------------- plans + admin
@api_router.get("/plans")
async def get_plans():
    return PLANS


@api_router.get("/admin/analytics")
async def admin_analytics(user: dict = Depends(require_role("admin"))):
    total_restaurants = await db.users.count_documents({"role": "restaurant"})
    total_weddings = await db.weddings.count_documents({})
    active_weddings = await db.weddings.count_documents({"status": "active"})
    total_uploads = await db.uploads.count_documents({"is_deleted": False})
    photos = await db.uploads.count_documents({"is_deleted": False, "media_type": "photo"})
    videos = await db.uploads.count_documents({"is_deleted": False, "media_type": "video"})

    size_agg = await db.uploads.aggregate([
        {"$match": {"is_deleted": False}},
        {"$group": {"_id": None, "total": {"$sum": "$size"}}}
    ]).to_list(1)
    storage_bytes = size_agg[0]["total"] if size_agg else 0

    revenue = 0
    restaurants = await db.users.find({"role": "restaurant"}).to_list(1000)
    for r in restaurants:
        revenue += PLANS.get(r.get("plan", "free_trial"), {}).get("price", 0)

    return {
        "total_restaurants": total_restaurants,
        "total_weddings": total_weddings,
        "active_weddings": active_weddings,
        "total_uploads": total_uploads,
        "photos": photos,
        "videos": videos,
        "storage_bytes": storage_bytes,
        "storage_gb": round(storage_bytes / (1024 ** 3), 3),
        "monthly_revenue": revenue,
    }


@api_router.get("/admin/restaurants")
async def admin_restaurants(user: dict = Depends(require_role("admin"))):
    items = await db.users.find({"role": "restaurant"}).sort("created_at", -1).to_list(1000)
    out = []
    for r in items:
        wc = await db.weddings.count_documents({"restaurant_id": str(r["_id"])})
        out.append({
            "id": str(r["_id"]),
            "name": r.get("name"),
            "email": r.get("email"),
            "business_name": r.get("business_name"),
            "plan": r.get("plan"),
            "status": r.get("status", "active"),
            "wedding_count": wc,
            "created_at": r.get("created_at"),
        })
    return out


@api_router.patch("/admin/restaurants/{rid}")
async def admin_update_restaurant(rid: str, plan: Optional[str] = Query(None),
                                  status: Optional[str] = Query(None),
                                  user: dict = Depends(require_role("admin"))):
    updates = {}
    if plan and plan in PLANS:
        updates["plan"] = plan
    if status in ("active", "suspended", "pending"):
        updates["status"] = status
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    target = await db.users.find_one({"_id": ObjectId(rid)})
    was_pending = target and target.get("status") == "pending"
    await db.users.update_one({"_id": ObjectId(rid)}, {"$set": updates})
    await audit(str(user["_id"]), "admin_update_restaurant", f"{rid} -> {updates}")
    # notify venue on approval (pending -> active)
    if was_pending and updates.get("status") == "active" and target.get("email"):
        try:
            await send_email(target["email"],
                             "Your WedSnap venue is approved 🎉",
                             approval_email_html(target.get("business_name") or target.get("name") or "there"))
        except Exception as e:
            logger.error(f"approval email failed: {e}")
    return {"message": "updated", **updates}


# ---------------------------------------------------------------- startup
@app.on_event("startup")
async def startup():
    try:
        storage.init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")

    await db.users.create_index("email", unique=True)
    await db.weddings.create_index("slug", unique=True)
    await db.weddings.create_index("restaurant_id")
    await db.uploads.create_index("wedding_slug")
    await db.uploads.create_index("id", unique=True)
    await db.messages.create_index("wedding_slug")
    await db.login_attempts.create_index("identifier")
    await db.users.create_index("invite_token")

    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "name": "Platform Admin", "email": admin_email,
            "password_hash": hash_password(admin_pw), "role": "admin", "created_at": now_iso(),
        })
        logger.info("Admin seeded")
    elif existing["role"] != "admin" or not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email},
                                  {"$set": {"role": "admin", "password_hash": hash_password(admin_pw)}})


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "*"), "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "*"), "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
