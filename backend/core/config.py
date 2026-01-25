# backend/core/config.py
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path) 

MONGO_DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_NAME = "learn_ease_db" 

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- AI API KEYS ---
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

PROJECT_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# --- FILE PATHS (Now mostly unused, but kept for compatibility) ---
BOOK_SUBPATH_FROM_ROOT = os.getenv("LOCAL_BOOK_UPLOAD_DIR_SUBPATH", "user-book-files/books")
TEXT_SUBPATH_FROM_ROOT = os.getenv("LOCAL_EXTRACTED_TEXT_DIR_SUBPATH", "user-book-files/extracted-texts")
VECTOR_STORE_SUBPATH_FROM_ROOT = os.getenv("LOCAL_VECTOR_STORE_DIR_SUBPATH", "user-book-files/vector-stores")

LOCAL_BOOK_UPLOAD_DIR = os.path.join(PROJECT_ROOT_DIR, BOOK_SUBPATH_FROM_ROOT)
LOCAL_EXTRACTED_TEXT_DIR = os.path.join(PROJECT_ROOT_DIR, TEXT_SUBPATH_FROM_ROOT)
LOCAL_VECTOR_STORE_DIR = os.path.join(PROJECT_ROOT_DIR, VECTOR_STORE_SUBPATH_FROM_ROOT)

# --- AWS S3 CONFIGURATION (NEW) ---
AWS_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY")
AWS_SECRET_KEY = os.getenv("AWS_SECRET_KEY")
AWS_REGION = os.getenv("AWS_REGION")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME")

# Basic check
if not MONGO_DATABASE_URL:
    print("⚠️ WARNING: DATABASE_URL not found in .env file")