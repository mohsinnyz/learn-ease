from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Literal
from bson import ObjectId
from fastapi import HTTPException, status
from datetime import datetime

# Import our new forum models
from models.forum_schemas import (
    ForumThreadCreate, ForumThreadInDB, ForumThreadPublic,
    ForumPostCreate, ForumPostInDB, ForumPostPublic,
    AuthorPublic, PyObjectId
)
# Import user models to fetch author data
from models.user_schemas import UserInDB, UserPublic
# Import user_service to get user details
from . import user_service

# --- Collection Constants ---
FORUM_THREADS_COLLECTION = "forum_threads"
FORUM_POSTS_COLLECTION = "forum_posts"
USERS_COLLECTION = "users" # Defined in user_service

VoteType = Literal["upvote", "downvote", "none"]

# --- Helper Function: Get Author Details ---
async def _get_author_public_from_id(db: AsyncIOMotorDatabase, user_id: PyObjectId) -> AuthorPublic:
    """
    Internal helper to fetch a user's public details for embedding.
    """
    # Use the existing user_service function
    user_in_db = await user_service.get_user_by_id(db, user_id)
    if not user_in_db:
        # This user was deleted, but their posts remain
        return AuthorPublic(
            id=str(user_id),
            firstname="[Deleted]",
            lastname="User",
            image=None
        )
    
    # Convert UserInDB to AuthorPublic
    return AuthorPublic(
        id=str(user_in_db.id),
        firstname=user_in_db.firstname,
        lastname=user_in_db.lastname,
        image=user_in_db.image
    )

# --- Helper Function: Populate Thread Public Model ---
async def _populate_thread_public(db: AsyncIOMotorDatabase, thread_in_db: ForumThreadInDB) -> ForumThreadPublic:
    """
    Converts a ForumThreadInDB to a ForumThreadPublic, fetching author details
    and reply counts.
    """
    author_details = await _get_author_public_from_id(db, thread_in_db.author_id)
    reply_count = await db[FORUM_POSTS_COLLECTION].count_documents({"thread_id": thread_in_db.id})
    
    return ForumThreadPublic(
        id=str(thread_in_db.id),
        author=author_details,
        title=thread_in_db.title,
        content=thread_in_db.content,
        book_id=str(thread_in_db.book_id) if thread_in_db.book_id else None,
        tags=thread_in_db.tags,
        created_at=thread_in_db.created_at,
        upvote_count=len(thread_in_db.upvotes),
        downvote_count=len(thread_in_db.downvotes),
        reply_count=reply_count
    )

# --- Helper Function: Populate Post Public Model ---
async def _populate_post_public(db: AsyncIOMotorDatabase, post_in_db: ForumPostInDB) -> ForumPostPublic:
    """
    Converts a ForumPostInDB to a ForumPostPublic, fetching author details.
    """
    author_details = await _get_author_public_from_id(db, post_in_db.author_id)
    
    return ForumPostPublic(
        id=str(post_in_db.id),
        thread_id=str(post_in_db.thread_id),
        author=author_details,
        content=post_in_db.content,
        created_at=post_in_db.created_at,
        upvote_count=len(post_in_db.upvotes),
        downvote_count=len(post_in_db.downvotes)
    )

# --- Thread Service Functions (Use Case 21) ---

# ... (inside forum_service.py)

async def create_thread(db: AsyncIOMotorDatabase, thread_create: ForumThreadCreate, user_id: PyObjectId) -> ForumThreadPublic:
    """
    Creates a new forum thread (FR 21.1, 21.2)
    """
    # --- (THIS IS THE FIX) ---
    # 1. Convert the create model (from user) to a dict
    thread_data = thread_create.model_dump(exclude_unset=True)
    
    # 2. Securely add the author_id from the auth token
    thread_data["author_id"] = user_id
    # --- (END FIX) ---
    
    # 3. Create the full InDB model
    thread_in_db = ForumThreadInDB(**thread_data)
    
    result = await db[FORUM_THREADS_COLLECTION].insert_one(
        thread_in_db.model_dump(by_alias=True)
    )
    
    created_thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": result.inserted_id})
    if not created_thread_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create forum thread")
        
    created_thread = ForumThreadInDB(**created_thread_doc)
    return await _populate_thread_public(db, created_thread)

async def get_all_threads(db: AsyncIOMotorDatabase) -> List[ForumThreadPublic]:
    """
    Fetches all forum threads for the main forum page.
    """
    threads_cursor = db[FORUM_THREADS_COLLECTION].find().sort("created_at", -1) # Newest first
    
    populated_threads = []
    async for thread_doc in threads_cursor:
        thread_in_db = ForumThreadInDB(**thread_doc)
        populated_thread = await _populate_thread_public(db, thread_in_db)
        populated_threads.append(populated_thread)
        
    return populated_threads

async def get_thread_by_id(db: AsyncIOMotorDatabase, thread_id: PyObjectId) -> ForumThreadPublic:
    """
    Fetches a single forum thread by its ID.
    """
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": thread_id})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forum thread not found")
    
    thread_in_db = ForumThreadInDB(**thread_doc)
    return await _populate_thread_public(db, thread_in_db)

# --- Post Service Functions (Use Case 22) ---

async def create_post(db: AsyncIOMotorDatabase, post_create: ForumPostCreate, user_id: PyObjectId) -> ForumPostPublic:
    """
    Creates a new post (reply) on a forum thread (FR 22.1)
    """
    # Check if thread exists
    thread = await db[FORUM_THREADS_COLLECTION].find_one({"_id": post_create.thread_id})
    if not thread:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found. Cannot post reply.")

    # --- (THIS IS THE FIX) ---
    # 1. Convert the create model (from user) to a dict
    post_data = post_create.model_dump(exclude_unset=True)
    
    # 2. Securely add the author_id from the auth token
    post_data["author_id"] = user_id
    # --- (END FIX) ---

    # 3. Create the full InDB model
    post_in_db = ForumPostInDB(**post_data)
    
    result = await db[FORUM_POSTS_COLLECTION].insert_one(
        post_in_db.model_dump(by_alias=True)
    )
    
    created_post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": result.inserted_id})
    if not created_post_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create post")
        
    created_post = ForumPostInDB(**created_post_doc)
    # TODO: Implement notification logic here for FR 22.4
    
    return await _populate_post_public(db, created_post)

async def get_posts_for_thread(db: AsyncIOMotorDatabase, thread_id: PyObjectId) -> List[ForumPostPublic]:
    """
    Fetches all posts (replies) for a single forum thread.
    """
    posts_cursor = db[FORUM_POSTS_COLLECTION].find({"thread_id": thread_id}).sort("created_at", 1) # Oldest first
    
    populated_posts = []
    async for post_doc in posts_cursor:
        post_in_db = ForumPostInDB(**post_doc)
        populated_post = await _populate_post_public(db, post_in_db)
        populated_posts.append(populated_post)
        
    return populated_posts

async def edit_post(db: AsyncIOMotorDatabase, post_id: PyObjectId, new_content: str, user_id: PyObjectId) -> ForumPostPublic:
    """
    Edits an existing post (FR 22.2)
    """
    post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": post_id})
    if not post_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        
    post = ForumPostInDB(**post_doc)
    
    # Check for permission
    if post.author_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit this post")
        
    await db[FORUM_POSTS_COLLECTION].update_one(
        {"_id": post_id},
        {"$set": {"content": new_content, "created_at": datetime.utcnow()}} # Update timestamp on edit
    )
    
    updated_post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": post_id})
    return await _populate_post_public(db, ForumPostInDB(**updated_post_doc))

async def delete_post(db: AsyncIOMotorDatabase, post_id: PyObjectId, user_id: PyObjectId) -> bool:
    """
    Deletes a post (FR 22.2)
    """
    post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": post_id})
    if not post_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
        
    post = ForumPostInDB(**post_doc)
    
    # Check for permission
    if post.author_id != user_id:
        # We could also allow thread authors or admins to delete
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this post")
        
    result = await db[FORUM_POSTS_COLLECTION].delete_one({"_id": post_id})
    return result.deleted_count == 1

# --- Vote Functions (FR 21.3 & 22.3) ---

async def _vote_on_document(
    db: AsyncIOMotorDatabase, 
    collection_name: str, 
    doc_id: PyObjectId, 
    user_id: PyObjectId, 
    vote_type: VoteType
):
    """Internal helper to handle voting logic on a document."""
    
    # Define operations to remove user from both arrays first
    operations = {
        "$pull": {
            "upvotes": user_id,
            "downvotes": user_id
        }
    }
    await db[collection_name].update_one({"_id": doc_id}, operations)

    # If the vote is not "none", add them back to the correct array
    if vote_type == "upvote":
        await db[collection_name].update_one({"_id": doc_id}, {"$addToSet": {"upvotes": user_id}})
    elif vote_type == "downvote":
        await db[collection_name].update_one({"_id": doc_id}, {"$addToSet": {"downvotes": user_id}})

    # Fetch the updated document to return fresh counts
    updated_doc = await db[collection_name].find_one({"_id": doc_id})
    if not updated_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found after voting")
    
    return len(updated_doc.get("upvotes", [])), len(updated_doc.get("downvotes", []))

async def vote_on_thread(
    db: AsyncIOMotorDatabase, 
    thread_id: PyObjectId, 
    user_id: PyObjectId, 
    vote_type: VoteType
) -> dict:
    upvotes, downvotes = await _vote_on_document(db, FORUM_THREADS_COLLECTION, thread_id, user_id, vote_type)
    return {"upvote_count": upvotes, "downvote_count": downvotes}

async def vote_on_post(
    db: AsyncIOMotorDatabase, 
    post_id: PyObjectId, 
    user_id: PyObjectId, 
    vote_type: VoteType
) -> dict:
    upvotes, downvotes = await _vote_on_document(db, FORUM_POSTS_COLLECTION, post_id, user_id, vote_type)
    return {"upvote_count": upvotes, "downvote_count": downvotes}