# import mimetypes
# import os
# from pathlib import Path

# import cloudinary
# import cloudinary.uploader
# import cloudinary.api
# import requests

# APP_NAME = "wedsnap"

# CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
# CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
# CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")

# USE_CLOUDINARY = bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

# if USE_CLOUDINARY:
#     cloudinary.config(
#         cloud_name=CLOUDINARY_CLOUD_NAME,
#         api_key=CLOUDINARY_API_KEY,
#         api_secret=CLOUDINARY_API_SECRET,
#         secure=True,
#     )

# LOCAL_STORAGE_DIR = Path(os.environ.get("LOCAL_STORAGE_DIR", Path(__file__).resolve().parent / "uploads"))
# LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


# def init_storage(force: bool = False):
#     return "cloudinary" if USE_CLOUDINARY else "local"


# def _local_path(path: str) -> Path:
#     local_path = LOCAL_STORAGE_DIR / path   
#     local_path.parent.mkdir(parents=True, exist_ok=True)
#     return local_path


# def _resource_type(content_type: str) -> str:
#     if content_type.startswith("video/"):
#         return "video"
#     if content_type.startswith("image/"):
#         return "image"
#     return "raw"


# def put_object(path: str, data: bytes, content_type: str) -> dict:
#     if USE_CLOUDINARY:
#         result = cloudinary.uploader.upload(
#             data,
#             public_id=path,
#             resource_type=_resource_type(content_type),
#             overwrite=True,
#         )
#         return {"path": path, "size": result.get("bytes", len(data))}

#     local_path = _local_path(path)
#     with open(local_path, "wb") as f:
#         f.write(data)
#     return {"path": path, "size": len(data)}


# def get_object(path: str):
#     if USE_CLOUDINARY:
#         for resource_type in ("image", "video", "raw"):
#             try:
#                 info = cloudinary.api.resource(path, resource_type=resource_type)
#                 url = info["secure_url"]
#                 resp = requests.get(url, timeout=30)
#                 if resp.status_code == 200:
#                     content_type = resp.headers.get("Content-Type") or mimetypes.guess_type(path)[0] or "application/octet-stream"
#                     return resp.content, content_type
#             except cloudinary.exceptions.NotFound:
#                 continue
#         raise FileNotFoundError(f"Cloudinary object not found: {path}")

#     local_path = _local_path(path)
#     if not local_path.exists():
#         raise FileNotFoundError(f"Local object not found: {path}")
#     with open(local_path, "rb") as f:
#         content = f.read()
#     content_type = mimetypes.guess_type(local_path.name)[0] or "application/octet-stream"
#     return content, content_type


# def delete_object(path: str) -> None:
#     if USE_CLOUDINARY:
#         for resource_type in ("image", "video", "raw"):
#             try:
#                 cloudinary.uploader.destroy(path, resource_type=resource_type)
#             except Exception:
#                 pass
#         return

#     local_path = LOCAL_STORAGE_DIR / path
#     if local_path.exists():
#         local_path.unlink()

import mimetypes
import os
from pathlib import Path

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

APP_NAME = "wedsnap"

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME")

USE_R2 = bool(R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME)

LOCAL_STORAGE_DIR = Path(os.environ.get("LOCAL_STORAGE_DIR", Path(__file__).resolve().parent / "uploads"))
LOCAL_STORAGE_DIR.mkdir(parents=True, exist_ok=True)

_r2_client = None


def _r2():
    global _r2_client
    if _r2_client is None:
        _r2_client = boto3.client(
            "s3",
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
        )
    return _r2_client
