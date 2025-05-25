from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated 
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.user_schemas import UserPublic, UserUpdate, UserInDB # UserInDB for current_user type
from services import user_service
from core.db import get_database
from core.security import get_current_user

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(get_current_user)] # Protect all user routes
)

@router.get("/me", response_model=UserPublic)
async def read_users_me(
    current_user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Get current logged-in user's public profile.
    """
    # get_current_user already returns UserInDB. We just convert it to UserPublic.
    return UserPublic.from_user_in_db(current_user)

@router.put("/me", response_model=UserPublic)
async def update_current_user_profile(
    user_update_data: UserUpdate,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    """
    Update current logged-in user's profile details.
    """
    updated_user_db = await user_service.update_user_profile(
        db=db, user_id=current_user.id, user_update_data=user_update_data
    )
    if not updated_user_db:
        # This might happen if the user_id from token is somehow invalid, though get_current_user should catch it
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found or update failed.")
    
    return UserPublic.from_user_in_db(updated_user_db)