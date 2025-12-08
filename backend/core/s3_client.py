# backend/core/s3_client.py
import boto3
import os
from botocore.exceptions import ClientError
from core.config import AWS_ACCESS_KEY, AWS_SECRET_KEY, AWS_REGION, S3_BUCKET_NAME

class S3Client:
    def __init__(self):
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=AWS_ACCESS_KEY,
            aws_secret_access_key=AWS_SECRET_KEY,
            region_name=AWS_REGION
        )
        self.bucket = S3_BUCKET_NAME

    def upload_file_obj(self, file_obj, object_name):
        """Streams a file-like object (e.g. UploadFile) to S3"""
        try:
            self.s3.upload_fileobj(file_obj, self.bucket, object_name)
            return True
        except ClientError as e:
            print(f"S3 Upload Error: {e}")
            return False

    def upload_file(self, file_path, object_name):
        """Uploads a file from local disk path to S3"""
        try:
            self.s3.upload_file(file_path, self.bucket, object_name)
            return True
        except ClientError as e:
            print(f"S3 Upload Error: {e}")
            return False

    def download_file(self, object_name, dest_path):
        """Downloads a file from S3 to a local path"""
        try:
            # Ensure the directory exists
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            self.s3.download_file(self.bucket, object_name, dest_path)
            return True
        except ClientError as e:
            print(f"S3 Download Error ({object_name}): {e}")
            return False

    def get_file_content(self, object_name):
        """Reads file content directly into memory (good for .txt files)"""
        try:
            response = self.s3.get_object(Bucket=self.bucket, Key=object_name)
            return response['Body'].read().decode('utf-8')
        except ClientError as e:
            print(f"S3 Read Error: {e}")
            return None

    def delete_file(self, object_name):
        """Deletes a file from S3"""
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=object_name)
            return True
        except ClientError as e:
            print(f"S3 Delete Error: {e}")
            return False

    def check_file_exists(self, object_name):
        """Fast check using HEAD to see if file exists"""
        try:
            self.s3.head_object(Bucket=self.bucket, Key=object_name)
            return True
        except ClientError:
            return False

s3_client = S3Client()