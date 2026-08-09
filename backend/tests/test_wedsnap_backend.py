"""WedSnap backend API tests - auth, weddings, guest upload, gallery, admin."""
import io
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback: read frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass

API = BASE_URL + "/api"

ADMIN_EMAIL = "zx31808@seeu.edu.mk"
ADMIN_PASS = "Admin@2026"
REST_EMAIL = "venue@wedsnap.com"
REST_PASS = "Venue@2026"
DEMO_SLUG = "cec8f84007"


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, r.text
    return s


@pytest.fixture(scope="session")
def restaurant_session():
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": REST_EMAIL, "password": REST_PASS})
    assert r.status_code == 200, r.text
    return s


# --------------------------------- Auth
class TestAuth:
    def test_login_admin(self):
        s = _session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        # httpOnly cookie set
        assert "access_token" in s.cookies

    def test_login_restaurant(self):
        s = _session()
        r = s.post(f"{API}/auth/login", json={"email": REST_EMAIL, "password": REST_PASS})
        assert r.status_code == 200
        assert r.json()["role"] == "restaurant"

    def test_login_invalid(self):
        s = _session()
        r = s.post(f"{API}/auth/login", json={"email": REST_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_cookie(self, restaurant_session):
        r = restaurant_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == REST_EMAIL

    def test_logout_clears(self):
        s = _session()
        s.post(f"{API}/auth/login", json={"email": REST_EMAIL, "password": REST_PASS})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # after logout, /me should 401
        s.cookies.clear()
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 401

    def test_register_new_restaurant(self):
        s = _session()
        email = f"TEST_{uuid.uuid4().hex[:8]}@wedsnap.example.com"
        r = s.post(f"{API}/auth/register", json={
            "name": "Test Venue", "email": email, "password": "Pass@2026",
            "business_name": "Test Biz"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email.lower()
        assert data["role"] == "restaurant"
        assert data["plan"] == "free_trial"

    def test_register_duplicate(self):
        s = _session()
        r = s.post(f"{API}/auth/register", json={
            "name": "Dup", "email": REST_EMAIL, "password": "x",
        })
        assert r.status_code == 400


# --------------------------------- Weddings
class TestWeddings:
    def test_list_weddings_restaurant(self, restaurant_session):
        r = restaurant_session.get(f"{API}/weddings")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_wedding(self, restaurant_session):
        payload = {
            "bride_name": "TEST_Bride",
            "groom_name": "TEST_Groom",
            "wedding_date": "2026-06-15",
            "venue": "Test Hall",
            "couple_email": f"TEST_couple_{uuid.uuid4().hex[:6]}@test.com",
        }
        r = restaurant_session.post(f"{API}/weddings", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["bride_name"] == payload["bride_name"]
        assert "slug" in data
        slug = data["slug"]
        # GET verifies persistence
        g = restaurant_session.get(f"{API}/weddings/{slug}")
        assert g.status_code == 200
        assert g.json()["bride_name"] == payload["bride_name"]

    def test_wedding_qr(self, restaurant_session):
        r = restaurant_session.get(f"{API}/weddings/{DEMO_SLUG}/qr")
        assert r.status_code == 200
        data = r.json()
        assert data["qr_data_url"].startswith("data:image/png;base64,")
        assert DEMO_SLUG in data["url"]

    def test_wedding_status_update(self, restaurant_session):
        r = restaurant_session.patch(f"{API}/weddings/{DEMO_SLUG}/status?status=active")
        assert r.status_code == 200
        assert r.json()["status"] == "active"


# --------------------------------- Public guest endpoints
class TestGuestPublic:
    def test_public_wedding_info(self):
        r = requests.get(f"{API}/public/wedding/{DEMO_SLUG}")
        assert r.status_code == 200
        data = r.json()
        assert data["slug"] == DEMO_SLUG
        assert "bride_name" in data and "groom_name" in data

    def test_public_wedding_not_found(self):
        r = requests.get(f"{API}/public/wedding/does_not_exist_xxx")
        assert r.status_code == 404

    def test_guest_upload_photo(self):
        # Tiny valid PNG (1x1)
        png = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
            "890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
        )
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        data = {"guest_name": "TESTGuest"}
        r = requests.post(f"{API}/public/wedding/{DEMO_SLUG}/upload", files=files, data=data)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["media_type"] == "photo"
        assert "id" in j

    def test_guest_upload_unsupported_type(self):
        files = {"file": ("bad.exe", io.BytesIO(b"MZ garbage"), "application/octet-stream")}
        r = requests.post(f"{API}/public/wedding/{DEMO_SLUG}/upload", files=files)
        assert r.status_code == 400

    def test_guest_message(self):
        r = requests.post(f"{API}/public/wedding/{DEMO_SLUG}/message",
                          json={"guest_name": "TESTWisher", "text": "Congrats!"})
        assert r.status_code == 200


# --------------------------------- Gallery + files
class TestGallery:
    def test_gallery_list(self, restaurant_session):
        r = restaurant_session.get(f"{API}/gallery/{DEMO_SLUG}")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1

    def test_gallery_messages(self, restaurant_session):
        r = restaurant_session.get(f"{API}/gallery/{DEMO_SLUG}/messages")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_gallery_requires_auth(self):
        r = requests.get(f"{API}/gallery/{DEMO_SLUG}")
        assert r.status_code == 401

    def test_toggle_favorite_and_serve_file(self, restaurant_session):
        items = restaurant_session.get(f"{API}/gallery/{DEMO_SLUG}").json()
        assert items, "need at least one upload"
        uid = items[0]["id"]
        # Serve file
        f = restaurant_session.get(f"{API}/files/{uid}")
        assert f.status_code == 200
        assert f.headers.get("content-type", "").startswith(("image/", "video/"))
        # Favorite toggle
        r = restaurant_session.post(f"{API}/gallery/upload/{uid}/favorite")
        assert r.status_code == 200
        val1 = r.json()["is_favorite"]
        r2 = restaurant_session.post(f"{API}/gallery/upload/{uid}/favorite")
        assert r2.json()["is_favorite"] != val1

    def test_download_all_zip(self, restaurant_session):
        # need token via query for zip endpoint (but cookie also works)
        r = restaurant_session.get(f"{API}/gallery/{DEMO_SLUG}/download")
        assert r.status_code == 200
        assert r.headers.get("content-type") == "application/zip"
        assert len(r.content) > 0


# --------------------------------- Admin
class TestAdmin:
    def test_admin_analytics(self, admin_session):
        r = admin_session.get(f"{API}/admin/analytics")
        assert r.status_code == 200
        d = r.json()
        for key in ("total_restaurants", "total_weddings", "total_uploads",
                    "storage_bytes", "monthly_revenue"):
            assert key in d

    def test_admin_restaurants(self, admin_session):
        r = admin_session.get(f"{API}/admin/restaurants")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_admin_change_plan(self, admin_session):
        rlist = admin_session.get(f"{API}/admin/restaurants").json()
        # find our seeded venue
        target = next((x for x in rlist if x["email"] == REST_EMAIL), rlist[0])
        rid = target["id"]
        r = admin_session.patch(f"{API}/admin/restaurants/{rid}?plan=pro")
        assert r.status_code == 200
        # verify
        rlist2 = admin_session.get(f"{API}/admin/restaurants").json()
        updated = next(x for x in rlist2 if x["id"] == rid)
        assert updated["plan"] == "pro"

    def test_admin_suspend_and_reactivate(self, admin_session):
        rlist = admin_session.get(f"{API}/admin/restaurants").json()
        target = next((x for x in rlist if x["email"] == REST_EMAIL), rlist[0])
        rid = target["id"]
        r = admin_session.patch(f"{API}/admin/restaurants/{rid}?status=suspended")
        assert r.status_code == 200
        r = admin_session.patch(f"{API}/admin/restaurants/{rid}?status=active")
        assert r.status_code == 200

    def test_restaurant_cannot_access_admin(self, restaurant_session):
        r = restaurant_session.get(f"{API}/admin/analytics")
        assert r.status_code == 403


# --------------------------------- RBAC
class TestRBAC:
    def test_weddings_requires_role(self):
        r = requests.get(f"{API}/weddings")
        assert r.status_code == 401
