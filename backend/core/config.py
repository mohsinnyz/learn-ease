# C:\Users\mohsi\Projects\learn-ease-fyp\backend\core\config.py
import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path) 


MONGO_DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_NAME = "learn_ease_db" # Or load from env if preferred

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_string")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# --- AI API KEYS ---
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

PROJECT_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BOOK_SUBPATH_FROM_ROOT = os.getenv("LOCAL_BOOK_UPLOAD_DIR_SUBPATH", "user-book-files/books")
TEXT_SUBPATH_FROM_ROOT = os.getenv("LOCAL_EXTRACTED_TEXT_DIR_SUBPATH", "user-book-files/extracted-texts")
VECTOR_STORE_SUBPATH_FROM_ROOT = os.getenv("LOCAL_VECTOR_STORE_DIR_SUBPATH", "user-book-files/vector-stores")

LOCAL_BOOK_UPLOAD_DIR = os.path.join(PROJECT_ROOT_DIR, BOOK_SUBPATH_FROM_ROOT)
LOCAL_EXTRACTED_TEXT_DIR = os.path.join(PROJECT_ROOT_DIR, TEXT_SUBPATH_FROM_ROOT)
LOCAL_VECTOR_STORE_DIR = os.path.join(PROJECT_ROOT_DIR, VECTOR_STORE_SUBPATH_FROM_ROOT)

# Basic check
if not MONGO_DATABASE_URL:
    print("⚠️ WARNING: DATABASE_URL not found in .env file")