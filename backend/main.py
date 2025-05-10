# backend/main.py
from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
import os
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from core.db import connect_to_mongo, close_mongo_connection, get_database 
from motor.motor_asyncio import AsyncIOMotorDatabase
from routers import auth_router

load_dotenv()

# Lifespan manager for startup/shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_to_mongo()
    yield
    # Shutdown
    await close_mongo_connection()

app = FastAPI(lifespan=lifespan) # Pass lifespan manager to app

origins = [
    "http://localhost:3000", 
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],  
)

app.include_router(auth_router.router)

@app.get("/")
async def root():
    return {"message": "Hello from Learn-Ease Backend!"}

@app.get("/api/test")
async def get_test_message(db: AsyncIOMotorDatabase = Depends(get_database)): 
    try:
        collection_names = await db.list_collection_names()
        return {"message": "Data fetched successfully from backend!", "db_status": "connected", "collections": collection_names}
    except Exception as e:
        return {"message": "Backend running, but DB connection failed!", "db_status": "error", "detail": str(e)}
