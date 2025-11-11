from fastapi import APIRouter, Depends, HTTPException, status, Body
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Annotated, List
from pydantic import BaseModel, Field

# --- Import your core dependencies ---
from core.db import get_database
from core.security import get_current_user
from models.user_schemas import UserInDB, PyObjectId
from models.forum_schemas import ForumThreadPublic

# --- Import our new group models and service ---
from models.study_groups_schemas import (
    StudyGroupCreate, StudyGroupPublic
)
from services import study_groups_service, forum_service

router = APIRouter(
    prefix="/groups",
    tags=["Study Groups"],
    dependencies=[Depends(get_current_user)] # Secure all routes in this router
)

# --- Pydantic model for the transfer ownership payload ---
class TransferAdminRequest(BaseModel):
    new_admin_id: PyObjectId

# --- Use Case 19: Create & Manage Groups ---

@router.post(
    "/", 
    response_model=StudyGroupPublic, 
    status_code=status.HTTP_201_CREATED
)
async def create_new_group(
    group_data: StudyGroupCreate,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Create a new study group. The creator is set as the admin. (FR 19.1)
    """
    return await study_groups_service.create_group(db, group_data, user)

@router.post("/{group_id}/transfer", response_model=StudyGroupPublic)
async def transfer_group_ownership(
    group_id: PyObjectId,
    request_body: TransferAdminRequest,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Transfer admin ownership to another member (Admin only).
    """
    return await study_groups_service.transfer_ownership(
        db, group_id, request_body.new_admin_id, user
    )

@router.delete("/{group_id}/kick/{user_to_kick_id}", status_code=status.HTTP_204_NO_CONTENT)
async def kick_group_member(
    group_id: PyObjectId,
    user_to_kick_id: PyObjectId,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Kick a member from a group (Admin only). (FR 19.3)
    """
    success = await study_groups_service.kick_member(db, group_id, user_to_kick_id, user)
    if not success:
        # Service layer raises HTTPExceptions, but as a fallback:
        raise HTTPException(status_code=500, detail="Failed to kick member")
    return None

# --- Use Case 20: Join & View Groups ---

@router.get("/me", response_model=List[StudyGroupPublic])
async def get_my_groups(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Get a list of all study groups the current user is a member of. (FR 20.3)
    """
    return await study_groups_service.get_user_groups(db, user.id)

@router.post("/{group_id}/join", response_model=StudyGroupPublic)
async def join_a_group(
    group_id: PyObjectId,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Join a study group. (FR 20.1, 20.2)
    """
    return await study_groups_service.join_group(db, group_id, user.id)

@router.delete("/{group_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_a_group(
    group_id: PyObjectId,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Leave a study group (non-admins only).
    """
    success = await study_groups_service.leave_group(db, group_id, user.id)
    if not success:
        # Service layer raises HTTPExceptions, but as a fallback:
        raise HTTPException(status_code=500, detail="Failed to leave group")
    return None

# --- (NEW) Endpoint for Group-Specific Threads ---
# This mirrors the public /threads endpoint but is on the groups router.
# We need to add it to the study_groups_router.py

@router.get("/{group_id}/threads", response_model=List[ForumThreadPublic])
async def get_group_threads(
    group_id: PyObjectId,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Get all threads for a specific group.
    Checks group membership. (FR 19.4)
    """
    return await forum_service.get_threads_for_group(db, group_id, user.id)