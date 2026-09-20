# R2_ACCOUNT_ID = 0ef3a7f78143e2ed32ef91c588da8597
# R2_BUCKET_NAME = wedsnap-uploads
# R2_ACCESS_KEY_ID = 7316174f4b256d92e2c53d941c3839a8
# R2_SECRET_ACCESS_KEY = 9927f80641f4f9dca0b03618b4dc847d6091be9fb5c5fe52e7ce63877a5d0123

import boto3
from botocore.client import Config

# Fill these in with your real values
R2_ACCOUNT_ID = "0ef3a7f78143e2ed32ef91c588da8597"
R2_ACCESS_KEY_ID = "7316174f4b256d92e2c53d941c3839a8"
R2_SECRET_ACCESS_KEY = "9927f80641f4f9dca0b03618b4dc847d6091be9fb5c5fe52e7ce63877a5d0123"
R2_BUCKET_NAME = "wedsnap-uploads"

client = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    region_name="auto",
    config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
)

try:
    client.put_object(
        Bucket=R2_BUCKET_NAME,
        Key="test-connection.txt",
        Body=b"Hello from WedSnap test script",
        ContentType="text/plain",
    )
    print("SUCCESS — R2 credentials work and the bucket is writable.")
except Exception as e:
    print("FAILED —", e)