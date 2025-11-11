from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

# --- (Copied PyObjectId directly from your user_schemas.py) ---
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

# (FIXED) This is what the user sends. 'author_id' is removed.
class ForumPostCreate(BaseModel):
    thread_id: PyObjectId
    content: str = Field(..., min_length=1)
    reply_to_post_id: Optional[PyObjectId] = None

# (FIXED) This is the full model for the database.
class ForumPostInDB(ForumPostCreate): # Inherits from Create
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    author_id: PyObjectId # This will be added by the service
    created_at: datetime = Field(default_factory=datetime.utcnow)
    upvotes: List[PyObjectId] = []
    downvotes: List[PyObjectId] = []
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, PyObjectId: str}

# --- Schema for the Main Thread (the question) ---

# (FIXED) This is what the user sends. 'author_id' is removed.
class ForumThreadCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=150)
    content: str = Field(..., min_length=10)
    book_id: Optional[PyObjectId] = None 
    tags: Optional[List[str]] = []
    group_id: Optional[PyObjectId] = None

# (FIXED) This is the full model for the database.
class ForumThreadInDB(ForumThreadCreate): # Inherits from Create
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    author_id: PyObjectId # This will be added by the service
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

class ForumPostPublic(BaseModel):
    id: str
    thread_id: str
    author: AuthorPublic
    content: str
    created_at: datetime
    upvote_count: int
    downvote_count: int
    reply_to_post_id: Optional[str] = None
    
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
    reply_count: int = 0 # This will be calculated in the service
    group_id: Optional[str] = None
    
    class Config:
        from_attributes = True