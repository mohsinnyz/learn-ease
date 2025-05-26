from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated 
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.user_schemas import UserPublic, UserUpdate, UserInDB, UserPasswordChange # UserInDB for current_user type
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

@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
async def update_current_user_password(
    password_data: UserPasswordChange,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    """
    Change current logged-in user's password.
    """
    try:
        success = await user_service.change_user_password(
            db=db, user=current_user, password_data=password_data
        )
        # If change_user_password raises an HTTPException, it will propagate.
        # If it returns True, it means success.
        if success:
            return None # For 204 No Content
        else:
            # This 'else' case should ideally not be hit if the service function
            # raises HTTPExceptions for specific failures or returns True on success.
            # However, as a fallback:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Password update reported failure without a specific error."
            )

    except HTTPException as he:
        raise he # Re-raise specific HTTPExceptions from the service
    except Exception as e:
        # Log the detailed error on the server for diagnostics
        print(f"ERROR: /users/me/change-password endpoint - Unexpected error: {type(e).__name__} - {e}")
        # Return a generic error response to the client
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while changing the password."
        )