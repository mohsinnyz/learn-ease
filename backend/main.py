# backend/main.py
from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
from core.db import connect_to_mongo, close_mongo_connection, get_database # Import new functions
from motor.motor_asyncio import AsyncIOMotorDatabase # For dependency type hint

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

@app.get("/")
async def root():
    # Example using dependency injection (optional here, more useful in routers)
    # db = await get_database()
    # Example: list collections to test connection
    # collections = await db.list_collection_names()
    return {"message": "Hello from Learn-Ease Backend!"} # Simpler root

@app.get("/api/test")
async def get_test_message(db: AsyncIOMotorDatabase = Depends(get_database)): # Inject DB dependency
    try:
        # Perform a simple DB operation to test connection
        collection_names = await db.list_collection_names()
        return {"message": "Data fetched successfully from backend!", "db_status": "connected", "collections": collection_names}
    except Exception as e:
        return {"message": "Backend running, but DB connection failed!", "db_status": "error", "detail": str(e)}

# Include routers later...
# from routers import auth, books, ai
# app.include_router(auth.router)
# app.include_router(books.router)
# app.include_router(ai.router)