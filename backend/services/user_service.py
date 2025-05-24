# backend/services/user_service.py
#C:\Users\mohsi\Projects\learn-ease-fyp\backend\services\user_service.py

from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from models.user_schemas import UserCreate, UserInDB, UserPublic
from core.security import get_password_hash, verify_password
from fastapi import HTTPException

async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[UserInDB]:
    user_data = await db["users"].find_one({"email": email})
    if user_data:
        return UserInDB(**user_data)
    return None

async def create_user(db: AsyncIOMotorDatabase, user_create: UserCreate) -> UserPublic:
    existing_user = await get_user_by_email(db, email=user_create.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user_create.password)
    
    # Create a UserInDB instance but don't explicitly set _id, let MongoDB generate it
    # Pydantic will use the default_factory for 'id' if _id is not directly passed
    user_in_db_data = {
        "firstname": user_create.firstname,
        "lastname": user_create.lastname,
        "email": user_create.email,
        "hashed_password": hashed_password,
        "age": user_create.age,
        "university_name": user_create.university_name
    }
    
    # Insert into database
    result = await db["users"].insert_one(user_in_db_data)
    
    # Retrieve the created user to get the generated _id
    created_user_data = await db["users"].find_one({"_id": result.inserted_id})
    if not created_user_data:
        raise HTTPException(status_code=500, detail="Could not create user")
        
    # Convert to UserInDB to then convert to UserPublic
    # This ensures the _id from DB is correctly mapped to id
    user_in_db_obj = UserInDB(**created_user_data)
    return UserPublic.from_user_in_db(user_in_db_obj)


async def authenticate_user(db: AsyncIOMotorDatabase, email: str, password: str) -> Optional[UserInDB]:
    user = await get_user_by_email(db, email=email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user