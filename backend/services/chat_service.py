from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from bson import ObjectId
from fastapi import HTTPException, status
from datetime import datetime

# Import models
from models.user_schemas import UserInDB, UserPublic, PyObjectId
from models.chat_schemas import (
    ConversationInDB, ConversationPublic,
    MessageInDB, MessageCreate, MessagePublic
)
from . import user_service

# --- Collection Constants ---
CONVERSATIONS_COLLECTION = "conversations"
MESSAGES_COLLECTION = "messages"

# --- Service Functions ---

async def get_or_create_conversation(db: AsyncIOMotorDatabase, user_a_id: PyObjectId, user_b_id: PyObjectId) -> ConversationInDB:
    """
    Finds an existing 1-to-1 conversation or creates a new one.
    """
    if user_a_id == user_b_id:
        raise HTTPException(status_code=400, detail="Cannot create a conversation with oneself")

    # Find a conversation where both users are in the 'members' array
    conversation_doc = await db[CONVERSATIONS_COLLECTION].find_one({
        "members": {"$all": [user_a_id, user_b_id], "$size": 2}
    })
    
    if conversation_doc:
        return ConversationInDB(**conversation_doc)
        
    # No conversation found, create a new one
    new_convo = ConversationInDB(members=[user_a_id, user_b_id])
    
    result = await db[CONVERSATIONS_COLLECTION].insert_one(
        new_convo.dict(by_alias=True)
    )
    
    created_doc = await db[CONVERSATIONS_COLLECTION].find_one({"_id": result.inserted_id})
    return ConversationInDB(**created_doc)

async def create_message(db: AsyncIOMotorDatabase, message: MessageCreate, sender_id: PyObjectId) -> MessageInDB:
    """
    Saves a new message to the database.
    """
    # 1. Verify the conversation exists
    convo = await db[CONVERSATIONS_COLLECTION].find_one({"_id": message.conversation_id})
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # 2. Verify the sender is a member of that conversation
    if sender_id not in convo["members"]:
        raise HTTPException(status_code=403, detail="You are not a member of this conversation")
        
    message_data = message.dict()
    message_data["sender_id"] = sender_id
    
    message_in_db = MessageInDB(**message_data)
    
    # 3. Insert the message
    result = await db[MESSAGES_COLLECTION].insert_one(
        message_in_db.dict(by_alias=True)
    )
    
    # 4. Update the conversation's last_activity timestamp
    await db[CONVERSATIONS_COLLECTION].update_one(
        {"_id": message.conversation_id},
        {"$set": {"last_activity": message_in_db.created_at}}
    )
    
    created_doc = await db[MESSAGES_COLLECTION].find_one({"_id": result.inserted_id})
    return MessageInDB(**created_doc)

async def get_conversation_messages(db: AsyncIOMotorDatabase, conversation_id: PyObjectId, user_id: PyObjectId) -> List[MessagePublic]:
    """
    Gets all messages for a single conversation.
    """
    # 1. Verify user is part of this conversation
    convo = await db[CONVERSATIONS_COLLECTION].find_one({"_id": conversation_id})
    if not convo or user_id not in convo["members"]:
        raise HTTPException(status_code=403, detail="You do not have access to this conversation")
        
    # 2. Fetch messages
    messages_cursor = db[MESSAGES_COLLECTION].find(
        {"conversation_id": conversation_id}
    ).sort("created_at", 1) # Oldest first
    
    messages = []
    async for msg_doc in messages_cursor:
        msg = MessageInDB(**msg_doc)
        messages.append(MessagePublic(**msg.dict(), id=str(msg.id)))
        
    return messages

async def get_user_conversations(db: AsyncIOMotorDatabase, user_id: PyObjectId) -> List[ConversationPublic]:
    """
    Gets all of a user's conversations for the inbox.
    (FR 23.2)
    """
    convos_cursor = db[CONVERSATIONS_COLLECTION].find(
        {"members": user_id}
    ).sort("last_activity", -1) # Newest first
    
    convo_list = []
    async for convo_doc in convos_cursor:
        convo = ConversationInDB(**convo_doc)
        
        # Find the *other* participant's ID
        participant_id = next((pid for pid in convo.members if pid != user_id), None)
        if not participant_id:
            continue # This shouldn't happen in a 1-to-1 chat

        # Get their public user data
        participant_user = await user_service.get_user_by_id(db, participant_id)
        if not participant_user:
            continue # Other user was deleted

        # Get the last message
        last_message_doc = await db[MESSAGES_COLLECTION].find(
            {"conversation_id": convo.id}
        ).sort("created_at", -1).limit(1).to_list(length=1)
        
        last_message_content = last_message_doc[0]["content"] if last_message_doc else "No messages yet..."
        
        convo_list.append(
            ConversationPublic(
                id=str(convo.id),
                participant=UserPublic.from_user_in_db(participant_user),
                last_message=last_message_content,
                last_activity=convo.last_activity
            )
        )
        
    return convo_list