from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

# Import the PyObjectId you defined in user_schemas.py
from .user_schemas import PyObjectId

# --- Schema for the Study Group ---

class StudyGroupBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    # The admin_id is the user who created it and has owner privileges
    admin_id: PyObjectId
    # The list of all members, including the admin
    members: List[PyObjectId] = []

class StudyGroupCreate(BaseModel):
    # This is what the user sends to create a group
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = Field(None, max_length=500)

class StudyGroupInDB(StudyGroupBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, PyObjectId: str}

# --- Public-facing models (what the API returns) ---

# We need a slimmed-down version of the user for the member list
class GroupMemberPublic(BaseModel):
    id: str
    firstname: str
    lastname: str
    image: Optional[str] = None

class StudyGroupPublic(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    admin_id: str
    member_count: int # We'll calculate this
    created_at: datetime
    # We can add a full member list later if needed
    # members: List[GroupMemberPublic] = []