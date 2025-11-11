from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from datetime import datetime

# Import models
from models.user_schemas import UserInDB, PyObjectId
from models.study_groups_schemas import (
    StudyGroupCreate, StudyGroupInDB, StudyGroupPublic, GroupMemberPublic
)
# Import user_service to get user details for populating member lists
from . import user_service

# --- Collection Constant ---
STUDY_GROUPS_COLLECTION = "study_groups"

# --- Internal Helper Functions ---

async def _get_group_by_id_internal(db: AsyncIOMotorDatabase, group_id: PyObjectId) -> Optional[StudyGroupInDB]:
    """
    Internal helper to fetch a group by ID.
    """
    group_doc = await db[STUDY_GROUPS_COLLECTION].find_one({"_id": group_id})
    if group_doc:
        return StudyGroupInDB(**group_doc)
    return None

async def _populate_group_public(db: AsyncIOMotorDatabase, group_in_db: StudyGroupInDB) -> StudyGroupPublic:
    """
    Converts a StudyGroupInDB to a StudyGroupPublic, calculating counts.
    """
    return StudyGroupPublic(
        id=str(group_in_db.id),
        name=group_in_db.name,
        description=group_in_db.description,
        admin_id=str(group_in_db.admin_id),
        member_count=len(group_in_db.members),
        created_at=group_in_db.created_at
    )

# --- Public Service Functions ---

async def create_group(db: AsyncIOMotorDatabase, group_create: StudyGroupCreate, user: UserInDB) -> StudyGroupPublic:
    """
    Creates a new study group and sets the creator as admin.
    (FR 19.1)
    """
    group_data = group_create.model_dump()
    group_data["admin_id"] = user.id
    # The creator is automatically the first member
    group_data["members"] = [user.id] 
    
    group_in_db = StudyGroupInDB(**group_data)
    
    result = await db[STUDY_GROUPS_COLLECTION].insert_one(
        group_in_db.model_dump(by_alias=True)
    )
    
    created_group_doc = await db[STUDY_GROUPS_COLLECTION].find_one({"_id": result.inserted_id})
    if not created_group_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create group")
        
    created_group = StudyGroupInDB(**created_group_doc)
    return await _populate_group_public(db, created_group)

async def get_user_groups(db: AsyncIOMotorDatabase, user_id: PyObjectId) -> List[StudyGroupPublic]:
    """
    Gets all groups a user is a member of.
    (FR 20.3)
    """
    groups_cursor = db[STUDY_GROUPS_COLLECTION].find({"members": user_id}).sort("name", 1) # Sort A-Z
    
    populated_groups = []
    async for group_doc in groups_cursor:
        group_in_db = StudyGroupInDB(**group_doc)
        populated_group = await _populate_group_public(db, group_in_db)
        populated_groups.append(populated_group)
        
    return populated_groups

async def join_group(db: AsyncIOMotorDatabase, group_id: PyObjectId, user_id: PyObjectId) -> StudyGroupPublic:
    """
    Adds the current user to a group's member list.
    (FR 20.1, 20.2)
    """
    group = await _get_group_by_id_internal(db, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    
    # Check if user is already a member (using $addToSet is idempotent)
    if user_id in group.members:
        return await _populate_group_public(db, group) # Just return the group

    result = await db[STUDY_GROUPS_COLLECTION].update_one(
        {"_id": group_id},
        {"$addToSet": {"members": user_id}} # $addToSet prevents duplicates
    )
    
    updated_group_doc = await db[STUDY_GROUPS_COLLECTION].find_one({"_id": group_id})
    return await _populate_group_public(db, StudyGroupInDB(**updated_group_doc))

async def leave_group(db: AsyncIOMotorDatabase, group_id: PyObjectId, user_id: PyObjectId) -> bool:
    """
    Removes the current user from a group's member list.
    """
    group = await _get_group_by_id_internal(db, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    # Check if admin is trying to leave
    if user_id == group.admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Admin cannot leave the group. You must transfer ownership first."
        )
        
    result = await db[STUDY_GROUPS_COLLECTION].update_one(
        {"_id": group_id},
        {"$pull": {"members": user_id}}
    )
    
    return result.modified_count == 1

async def kick_member(db: AsyncIOMotorDatabase, group_id: PyObjectId, user_to_kick_id: PyObjectId, admin_user: UserInDB) -> bool:
    """
    Removes a member from a group (Admin only).
    (FR 19.3)
    """
    group = await _get_group_by_id_internal(db, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    
    # Check for admin permission
    if admin_user.id != group.admin_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group admin can kick members")
        
    # Admin cannot kick themselves
    if user_to_kick_id == admin_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin cannot kick themselves")
        
    result = await db[STUDY_GROUPS_COLLECTION].update_one(
        {"_id": group_id},
        {"$pull": {"members": user_to_kick_id}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found during update")
        
    if result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User was not a member of this group")

    return True

async def transfer_ownership(db: AsyncIOMotorDatabase, group_id: PyObjectId, new_admin_id: PyObjectId, admin_user: UserInDB) -> StudyGroupPublic:
    """
    Transfers the admin role to another member of the group (Admin only).
    """
    group = await _get_group_by_id_internal(db, group_id)
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    
    # Check for admin permission
    if admin_user.id != group.admin_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group admin can transfer ownership")
        
    # Check if new admin is a member
    if new_admin_id not in group.members:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New admin must be a member of the group")
        
    # Update the admin_id
    await db[STUDY_GROUPS_COLLECTION].update_one(
        {"_id": group_id},
        {"$set": {"admin_id": new_admin_id}}
    )
    
    updated_group_doc = await db[STUDY_GROUPS_COLLECTION].find_one({"_id": group_id})
    return await _populate_group_public(db, StudyGroupInDB(**updated_group_doc))