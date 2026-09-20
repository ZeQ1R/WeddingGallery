import os, re
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import boto3
from botocore.client import Config
from pymongo import MongoClient

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
R2_ACCOUNT_ID = os.environ["R2_ACCOUNT_ID"]
R2_ACCESS_KEY_ID = os.environ["R2_ACCESS_KEY_ID"]
R2_SECRET_ACCESS_KEY = os.environ["R2_SECRET_ACCESS_KEY"]
R2_BUCKET_NAME = os.environ["R2_BUCKET_NAME"]


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or "wedding"


mongo = MongoClient(MONGO_URL)
db = mongo[DB_NAME]

r2 = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
)

for w in db.weddings.find({}):
    slug = w["slug"]
    folder_name = w.get("folder_name")
    if not folder_name:
        folder_name = f"{slugify(w['bride_name'])}-and-{slugify(w['groom_name'])}-{slug[:6]}"
        db.weddings.update_one({"_id": w["_id"]}, {"$set": {"folder_name": folder_name}})

    old_prefix = f"wedsnap/{slug}/"
    new_prefix = f"wedsnap/{folder_name}/"
    if old_prefix == new_prefix:
        continue

    moved = 0
    paginator = r2.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=R2_BUCKET_NAME, Prefix=old_prefix):
        for obj in page.get("Contents", []):
            old_key = obj["Key"]
            new_key = old_key.replace(old_prefix, new_prefix, 1)
            r2.copy_object(Bucket=R2_BUCKET_NAME, CopySource={"Bucket": R2_BUCKET_NAME, "Key": old_key}, Key=new_key)
            r2.delete_object(Bucket=R2_BUCKET_NAME, Key=old_key)
            db.uploads.update_many({"storage_path": old_key}, {"$set": {"storage_path": new_key}})
            moved += 1

    print(f"{w['bride_name']} & {w['groom_name']}: moved {moved} file(s) → {new_prefix}")

print("Done.")