"""Privacy tests: venue cannot see media, couple can, set-password + first-time invite."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = BASE_URL + "/api"

REST = ("venue@wedsnap.com", "Venue@2026")
COUPLE = ("aria.leo@example.com", "Couple@2026")
ADMIN = ("zx31808@seeu.edu.mk", "Admin@2026")
SLUG = "cec8f84007"  # Aria & Leo


def _login(email, password):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"{email} login failed: {r.text}"
    return s, r.json()


@pytest.fixture(scope="module")
def rest():
    s, _ = _login(*REST)
    return s


@pytest.fixture(scope="module")
def couple():
    s, u = _login(*COUPLE)
    return s, u


@pytest.fixture(scope="module")
def admin():
    s, _ = _login(*ADMIN)
    return s


# ------------------- Privacy: venue is denied media
class TestPrivacyVenueDenied:
    def test_gallery_forbidden(self, rest):
        r = rest.get(f"{API}/gallery/{SLUG}")
        assert r.status_code == 403, r.text

    def test_messages_forbidden(self, rest):
        r = rest.get(f"{API}/gallery/{SLUG}/messages")
        assert r.status_code == 403

    def test_download_forbidden(self, rest):
        r = rest.get(f"{API}/gallery/{SLUG}/download")
        assert r.status_code == 403

    def test_file_serve_forbidden(self, rest, couple):
        # get a file id via couple
        cs, _ = couple
        items = cs.get(f"{API}/gallery/{SLUG}").json()
        assert len(items) > 0
        fid = items[0]["id"]
        r = rest.get(f"{API}/files/{fid}")
        assert r.status_code == 403

    def test_wedding_meta_allowed(self, rest):
        r = rest.get(f"{API}/weddings/{SLUG}")
        assert r.status_code == 200
        assert r.json().get("slug") == SLUG

    def test_qr_allowed(self, rest):
        r = rest.get(f"{API}/weddings/{SLUG}/qr")
        assert r.status_code == 200


# ------------------- Privacy: couple can
class TestPrivacyCoupleAllowed:
    def test_gallery_ok(self, couple):
        cs, u = couple
        assert u.get("role") == "couple"
        assert u.get("password_set") is True
        r = cs.get(f"{API}/gallery/{SLUG}")
        assert r.status_code == 200
        items = r.json()
        assert len(items) >= 5, f"expected >=5 items, got {len(items)}"

    def test_messages_ok(self, couple):
        cs, _ = couple
        r = cs.get(f"{API}/gallery/{SLUG}/messages")
        assert r.status_code == 200
        assert len(r.json()) >= 2

    def test_file_serve_ok(self, couple):
        cs, _ = couple
        items = cs.get(f"{API}/gallery/{SLUG}").json()
        fid = items[0]["id"]
        r = cs.get(f"{API}/files/{fid}")
        assert r.status_code == 200
        assert len(r.content) > 0

    def test_download_ok(self, couple):
        cs, _ = couple
        r = cs.get(f"{API}/gallery/{SLUG}/download")
        assert r.status_code == 200
        assert r.content[:2] == b"PK"  # zip magic


# ------------------- Admin allowed
class TestAdminAllowed:
    def test_admin_gallery_ok(self, admin):
        r = admin.get(f"{API}/gallery/{SLUG}")
        assert r.status_code == 200


# ------------------- Set-password flow
class TestSetPassword:
    def test_set_password_requires_auth(self):
        r = requests.post(f"{API}/auth/set-password", json={"password": "abcdef"})
        assert r.status_code in (401, 403)

    def test_set_password_too_short(self, couple):
        cs, _ = couple
        r = cs.post(f"{API}/auth/set-password", json={"password": "abc"})
        assert r.status_code == 400

    def test_set_password_ok_and_login(self, rest):
        # Create a fresh couple via invite, verify password_set=false, then set password and login.
        w = rest.post(f"{API}/weddings", json={
            "bride_name": "TEST_SetP", "groom_name": "TEST_Flow",
            "wedding_date": "2026-12-01", "venue": "Hall",
            "couple_email": f"TEST_setp_{uuid.uuid4().hex[:6]}@resend.dev",
        })
        assert w.status_code == 200, w.text
        slug = w.json()["slug"]
        # invite (may or may not send email; we need the token)
        r = rest.post(f"{API}/weddings/{slug}/invite")
        # 200 with link, or 422 undeliverable — either way we can look up token in DB via list endpoint
        # Prefer to accept the link if provided
        token = None
        if r.status_code == 200 and "link" in r.json():
            token = r.json()["link"].split("/invite/")[-1]
        if not token:
            pytest.skip(f"Invite did not return token: {r.status_code} {r.text}")

        cs = requests.Session()
        cs.headers.update({"Content-Type": "application/json"})
        r2 = cs.post(f"{API}/auth/invite/{token}")
        assert r2.status_code == 200, r2.text
        user = r2.json()
        assert user["role"] == "couple"
        assert user.get("password_set") is False, "new couple should have password_set=false"

        # Set password
        new_pw = "NewPass@2026"
        r3 = cs.post(f"{API}/auth/set-password", json={"password": new_pw})
        assert r3.status_code == 200, r3.text

        # /auth/me should now say password_set=true
        me = cs.get(f"{API}/auth/me").json()
        assert me.get("password_set") is True

        # Login using new password
        s2 = requests.Session()
        s2.headers.update({"Content-Type": "application/json"})
        r4 = s2.post(f"{API}/auth/login", json={"email": user["email"], "password": new_pw})
        assert r4.status_code == 200, r4.text
        assert r4.json().get("role") == "couple"
