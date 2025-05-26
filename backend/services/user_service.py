# backend/services/user_service.py
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from models.user_schemas import UserCreate, UserInDB, UserPublic, UserUpdate, PyObjectId, UserPasswordChange 
from core.security import get_password_hash, verify_password
from fastapi import HTTPException, status
# from pydantic import HttpUrl # Not directly used in this file, but might be in schemas

USERS_COLLECTION = "users" 

async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[UserInDB]:
    user_data = await db[USERS_COLLECTION].find_one({"email": email})
    if user_data:
        return UserInDB(**user_data)
    return None

async def get_user_by_id(db: AsyncIOMotorDatabase, user_id: PyObjectId) -> Optional[UserInDB]:
    user_data = await db[USERS_COLLECTION].find_one({"_id": user_id})
    if user_data:
        return UserInDB(**user_data)
    return None

async def create_user(db: AsyncIOMotorDatabase, user_create: UserCreate) -> UserPublic:
    existing_user = await get_user_by_email(db, email=user_create.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    hashed_password = get_password_hash(user_create.password)
    
    user_in_db_data = {
        "firstname": user_create.firstname,
        "lastname": user_create.lastname,
        "email": user_create.email,
        "hashed_password": hashed_password,
        "age": user_create.age,
        "university_name": user_create.university_name,
        "image": None,       
        "verified": False    
    }
    
    result = await db[USERS_COLLECTION].insert_one(user_in_db_data)
    created_user_data = await db[USERS_COLLECTION].find_one({"_id": result.inserted_id})
    if not created_user_data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create user")
        
    user_in_db_obj = UserInDB(**created_user_data)
    return UserPublic.from_user_in_db(user_in_db_obj)

async def authenticate_user(db: AsyncIOMotorDatabase, email: str, password: str) -> Optional[UserInDB]:
    user = await get_user_by_email(db, email=email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

async def update_user_profile(
    db: AsyncIOMotorDatabase, 
    user_id: PyObjectId, 
    user_update_data: UserUpdate
) -> Optional[UserInDB]:
    update_data = user_update_data.model_dump(exclude_unset=True)

    if not update_data: 
        current_user_doc = await db[USERS_COLLECTION].find_one({"_id": user_id})
        if current_user_doc:
            return UserInDB(**current_user_doc)
        return None

    result = await db[USERS_COLLECTION].update_one(
        {"_id": user_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        return None 

    updated_user_doc = await db[USERS_COLLECTION].find_one({"_id": user_id})
    if updated_user_doc:
        return UserInDB(**updated_user_doc)
    return None

# --- Updated Function to Change User Password ---
async def change_user_password(
    db: AsyncIOMotorDatabase,
    user: UserInDB, # Pass the authenticated UserInDB object
    password_data: UserPasswordChange # This model now handles new_password == confirm_new_password
) -> bool:
    """
    Changes the password for a given user.
    The check for new_password matching confirm_new_password is now handled by the UserPasswordChange Pydantic model.
    """
    # 1. Verify the current password
    if not verify_password(password_data.current_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password."
        )

    # 2. Check if new password and confirmation match (This check is GONE - handled by Pydantic model)
    # if password_data.new_password != password_data.confirm_new_password:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="New password and confirmation password do not match."
    #     )
    
    # 3. (Optional but good) Check if the new password is the same as the old one
    if verify_password(password_data.new_password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as the old password."
        )

    # 4. Hash the new password
    new_hashed_password = get_password_hash(password_data.new_password)

    # 5. Update the password in the database
    result = await db[USERS_COLLECTION].update_one(
        {"_id": user.id}, 
        {"$set": {"hashed_password": new_hashed_password}}
    )

    if result.modified_count == 1:
        return True
    
    print(f"WARN: Password change for user {user.id} - update_one reported 0 modifications.")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not update password due to an unexpected issue."
    )