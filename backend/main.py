# In backend/main.py

from fastapi import FastAPI
import os
from dotenv import load_dotenv
# *** ADD CORS MIDDLEWARE IMPORTS ***
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

app = FastAPI()

# *** ADD CORS MIDDLEWARE CONFIGURATION ***
origins = [
    "http://localhost:3000", # Allow your frontend origin
    # You might add other origins later, like your deployed frontend URL
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # List of allowed origins
    allow_credentials=True,
    allow_methods=["*"], # Allow all methods (GET, POST, etc.)
    allow_headers=["*"], # Allow all headers
)
# ***************************************

@app.get("/")
async def root():
    db_url = os.getenv("DATABASE_URL", "mongodb_url_not_set")
    return {"message": "Hello from Learn-Ease Backend!", "db_url_loaded": bool(db_url)}

# *** ADD A NEW TEST ENDPOINT ***
@app.get("/api/test")
async def get_test_message():
    return {"message": "Data fetched successfully from backend!"}
# ******************************

# Include routers later...