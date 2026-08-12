import io
import mimetypes
import os
import requests
from pathlib import Path

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "wedsnap"

LOCAL_STORAGE_DIR = Path(os.environ.get("LOCAL_STORAGE_DIR", Path(__file__).resolve().parent / "uploads"))
LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
USE_LOCAL_STORAGE = not bool(EMERGENT_KEY)

storage_key = None


def init_storage(force: bool = False):
    global storage_key
    if USE_LOCAL_STORAGE:
        return "local"
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def _local_path(path: str) -> Path:
    local_path = LOCAL_STORAGE_DIR / path
    local_path.parent.mkdir(parents=True, exist_ok=True)
    return local_path


def put_object(path: str, data: bytes, content_type: str) -> dict:
    if USE_LOCAL_STORAGE:
        local_path = _local_path(path)
        with open(local_path, "wb") as f:
            f.write(data)
        return {"path": path}

    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    if USE_LOCAL_STORAGE:
        local_path = _local_path(path)
        if not local_path.exists():
            raise FileNotFoundError(f"Local object not found: {path}")
        with open(local_path, "rb") as f:
            content = f.read()
        content_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
        return content, content_type

    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 404:
        key = init_storage(force=True)
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


def delete_object(path: str) -> None:
    """Remove an object when its parent gallery is permanently deleted."""
    if USE_LOCAL_STORAGE:
        local_path = LOCAL_STORAGE_DIR / path
        if local_path.exists():
            local_path.unlink()
        return

    key = init_storage()
    resp = requests.delete(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 404:
        return
    resp.raise_for_status()
