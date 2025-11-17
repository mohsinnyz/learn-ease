from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Annotated, List
import json
from pydantic import BaseModel

# --- Import core dependencies ---
from core.db import get_database
from core.security import get_current_user
from core.websocket_manager import manager # Our new connection manager
from models.user_schemas import UserInDB, PyObjectId, UserPublic
from models.chat_schemas import (
    MessageCreate, MessagePublic, ConversationPublic, WebSocketMessage
)
from services import chat_service, user_service


router = APIRouter(
    prefix="/chat",
    tags=["Private Chat"],
    dependencies=[Depends(get_current_user)] 
)

class CreateConversationRequest(BaseModel):
    participant_id: PyObjectId

# --- HTTP Endpoints ---

@router.get("/conversations", response_model=List[ConversationPublic])
async def get_my_conversations(
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Get all of the current user's 1-to-1 conversations. (FR 23.2)
    """
    return await chat_service.get_user_conversations(db, user.id)

@router.post("/conversations", response_model=ConversationPublic)
async def create_or_get_conversation(
    request: CreateConversationRequest,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Start a new 1-to-1 chat by providing a participant_id.
    """
    convo_in_db = await chat_service.get_or_create_conversation(db, user.id, request.participant_id)
    
    # We need to populate this just like get_user_conversations
    participant_user = await user_service.get_user_by_id(db, request.participant_id)
    if not participant_user:
        raise HTTPException(status_code=404, detail="Participant not found")
        
    return ConversationPublic(
        id=str(convo_in_db.id),
        participant=UserPublic.from_user_in_db(participant_user),
        last_message="Conversation started.",
        last_activity=convo_in_db.last_activity
    )

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessagePublic])
async def get_message_history(
    conversation_id: PyObjectId,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    user: Annotated[UserInDB, Depends(get_current_user)]
):
    """
    Get the full message history for a conversation.
    """
    return await chat_service.get_conversation_messages(db, conversation_id, user.id)

# --- WebSocket Endpoint ---

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str, # We'll pass the token as a query param
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)]
):
    """
    The main WebSocket endpoint for real-time chat.
    """
    # 1. Authenticate the user from the token
    user = await get_current_user(db, token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    user_id_str = str(user.id)
    await manager.connect(user_id_str, websocket)
    
    try:
        while True:
            # 2. Wait for a new message
            data = await websocket.receive_json()
            message_data = MessageCreate(**data)
            
            # 3. Save the message to the database
            message_in_db = await chat_service.create_message(db, message_data, user.id)
            
            # 4. Find the recipient
            convo_doc = await db[chat_service.CONVERSATIONS_COLLECTION].find_one({"_id": message_data.conversation_id})
            recipient_id = next((str(pid) for pid in convo_doc["members"] if str(pid) != user_id_str), None)

            if recipient_id:
                # 5. Convert to public model for broadcasting
                message_public = MessagePublic(**message_in_db.dict(), id=str(message_in_db.id))
                
                # 6. Create the "envelope"
                ws_message = WebSocketMessage(
                    type="new_message",
                    payload=message_public.dict()
                )
                
                # 7. Send to recipient and also back to sender (for confirmation)
                await manager.broadcast_json(ws_message.dict(), user_id=recipient_id)
                await manager.broadcast_json(ws_message.dict(), user_id=user_id_str)
                
    except WebSocketDisconnect:
        manager.disconnect(user_id_str)
    except Exception as e:
        print(f"ERROR: WebSocket error for user {user_id_str}: {e}")
        await websocket.send_json(WebSocketMessage(type="error", payload={"detail": str(e)}).dict())
        manager.disconnect(user_id_str)