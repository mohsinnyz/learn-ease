import os
from dotenv import load_dotenv

load_dotenv() # Loads variables from .env

MONGO_DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_NAME = "learn_ease_db" # Or load from env if preferred

# Basic check
if not MONGO_DATABASE_URL:
    print("⚠️ WARNING: DATABASE_URL not found in .env file")