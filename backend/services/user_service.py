# backend/services/user_service.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from models.user_schemas import UserCreate, UserInDB, UserPublic, UserUpdate, PyObjectId # Add UserUpdate
from core.security import get_password_hash, verify_password
from fastapi import HTTPException, status # Import status
from pydantic import HttpUrl # Import HttpUrl if used for validation here

USERS_COLLECTION = "users" # Define collection name

async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[UserInDB]:
    user_data = await db[USERS_COLLECTION].find_one({"email": email})
    if user_data:
        return UserInDB(**user_data)
    return None

async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: PyObjectId) -> Optional[UserInDB]: # Helper
    user_data = await db[USERS_COLLECTION].find_one({"_id": user_id})
    if user_data:
        return UserInDB(**user_data)
    return None

async def create_user(db: AsyncIOMotorDatabase, user_create: UserCreate) -> UserPublic:
    existing_user = await get_user_by_email(db, email=user_create.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered") # Use status
    
    hashed_password = get_password_hash(user_create.password)
    
    user_in_db_data = {
        "firstname": user_create.firstname,
        "lastname": user_create.lastname,
        "email": user_create.email,
        "hashed_password": hashed_password,
        "age": user_create.age,
        "university_name": user_create.university_name,
        "image": None,       # <<< Initialize new field
        "verified": False    # <<< Initialize new field
    }
    
    result = await db[USERS_COLLECTION].insert_one(user_in_db_data)
    created_user_data = await db[USERS_COLLECTION].find_one({"_id": result.inserted_id})
    if not created_user_data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create user") # Use status
        
    user_in_db_obj = UserInDB(**created_user_data)
    return UserPublic.from_user_in_db(user_in_db_obj)

async def authenticate_user(db: AsyncIOMotorDatabase, email: str, password: str) -> Optional[UserInDB]:
    user = await get_user_by_email(db, email=email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

# --- New function to update user profile details ---
async def update_user_profile(
    db: AsyncIOMotorDatabase, 
    user_id: PyObjectId, 
    user_update_data: UserUpdate
) -> Optional[UserInDB]:
    
    # Create a dictionary of fields to update, excluding None values from user_update_data
    # Pydantic v2 .model_dump()
    update_data = user_update_data.model_dump(exclude_unset=True)

    if not update_data: # If no actual data was provided for update
        # Fetch and return the current user data without making an update call
        current_user_doc = await db[USERS_COLLECTION].find_one({"_id": user_id})
        if current_user_doc:
            return UserInDB(**current_user_doc)
        return None # Should not happen if user_id is valid

    result = await db[USERS_COLLECTION].update_one(
        {"_id": user_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        return None # User not found

    updated_user_doc = await db[USERS_COLLECTION].find_one({"_id": user_id})
    if updated_user_doc:
        return UserInDB(**updated_user_doc)
    return None