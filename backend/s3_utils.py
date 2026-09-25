# s3_utils.py
import boto3
import os
from dotenv import load_dotenv
import uuid
import json

load_dotenv()

s3 = boto3.client(
    service_name='s3',
    endpoint_url=os.getenv("S3_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

BUCKET = os.getenv("S3_BUCKET_NAME")


def save_item_to_s3(user_address: str, item_data: dict):
    folder = f"inventory/{user_address.lower()}"
    file_name = f"{uuid.uuid4()}.json"
    key = f"{folder}/{file_name}"

    s3.put_object(
        Bucket=BUCKET,
        Key=key,
        Body=json.dumps(item_data),
        ContentType='application/json'
    )
    return key  # можно вернуть URL или путь
