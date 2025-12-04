# backend/models/forum_schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

# --- (PyObjectId Helper - Unchanged) ---
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, field): 
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler): 
        json_schema = handler(core_schema)
        json_schema.update(type="string", example="507f1f77bcf86cd799439011")
        return json_schema
# --- (End PyObjectId) ---


# --- Schema for a Reply (a single post) ---

# (MODIFIED) Added parent_id for nested replies
class ForumPostCreate(BaseModel):
    thread_id: PyObjectId
    content: str = Field(..., min_length=1)
    parent_id: Optional[PyObjectId] = None 

# (Unchanged logic, inherits parent_id from Create)
class ForumPostInDB(ForumPostCreate): 
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    author_id: PyObjectId 
    created_at: datetime = Field(default_factory=datetime.utcnow)
    upvotes: List[PyObjectId] = []
    downvotes: List[PyObjectId] = []
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, PyObjectId: str}

# --- Schema for the Main Thread (the question) ---

# (Unchanged)
class ForumThreadCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=150)
    content: str = Field(..., min_length=10)
    book_id: Optional[PyObjectId] = None 
    tags: Optional[List[str]] = []
    is_group: bool = Field(default=False)

# (Unchanged)
class ForumThreadInDB(ForumThreadCreate): 
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    author_id: PyObjectId 
    created_at: datetime = Field(default_factory=datetime.utcnow)
    upvotes: List[PyObjectId] = []
    downvotes: List[PyObjectId] = []
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, PyObjectId: str}

# --- Public-facing models (what the API returns) ---

class AuthorPublic(BaseModel):
    id: str
    firstname: str
    lastname: str
    image: Optional[str] = None

# (MODIFIED) Added parent_id so frontend can nest threads
class ForumPostPublic(BaseModel):
    id: str
    thread_id: str
    parent_id: Optional[str] = None
    author: AuthorPublic
    content: str
    created_at: datetime
    upvote_count: int
    downvote_count: int
    
    class Config:
        from_attributes = True

class ForumThreadPublic(BaseModel):
    id: str
    author: AuthorPublic
    title: str
    content: str
    book_id: Optional[str] = None
    tags: Optional[List[str]] = []
    created_at: datetime
    upvote_count: int
    downvote_count: int
    reply_count: int = 0 
    is_group: bool
    
    class Config:
        from_attributes = True