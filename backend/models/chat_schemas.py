from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from .user_schemas import UserPublic, PyObjectId

# --- Schema for a single Message ---

class MessageBase(BaseModel):
    conversation_id: PyObjectId
    sender_id: PyObjectId
    content: str

class MessageCreate(BaseModel):
    # This is what the WebSocket will receive
    conversation_id: PyObjectId
    content: str

class MessageInDB(MessageBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, PyObjectId: str}

# --- Schema for a Conversation ---

class ConversationBase(BaseModel):
    # We just store a list of members. For 1-to-1, this will be 2 users.
    members: List[PyObjectId]

class ConversationInDB(ConversationBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str, PyObjectId: str}

# --- Public-facing models (what the API returns) ---

# This is what the frontend needs to render the chat bubble
class MessagePublic(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# This is what the frontend needs for the Inbox List
class ConversationPublic(BaseModel):
    id: str
    participant: UserPublic  # This should now work
    last_message: Optional[str] = None
    last_activity: datetime
    
    class Config:
        from_attributes = True
        arbitrary_types_allowed = True # In case UserPublic isn't fully resolved

# --- WebSocket Message Types ---
# This defines the "envelope" for our WebSocket messages
class WebSocketMessage(BaseModel):
    type: str # e.g., "new_message", "error"
    payload: dict