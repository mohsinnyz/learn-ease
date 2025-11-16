from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Literal
from bson import ObjectId
from fastapi import HTTPException, status
from datetime import datetime

# Import models
from models.forum_schemas import (
    ForumThreadCreate, ForumThreadInDB, ForumThreadPublic,
    ForumPostCreate, ForumPostInDB, ForumPostPublic,
    AuthorPublic, PyObjectId
)
from models.user_schemas import UserInDB, UserPublic
from models.study_groups_schemas import StudyGroupInDB # We need this for the check

# Import user_service to get user details
from . import user_service

# --- Collection Constants ---
FORUM_THREADS_COLLECTION = "forum_threads"
FORUM_POSTS_COLLECTION = "forum_posts"
USERS_COLLECTION = "users"
STUDY_GROUPS_COLLECTION = "study_groups" # Added for security checks

VoteType = Literal["upvote", "downvote", "none"]

# --- Helper Function: Get Author Details ---
async def _get_author_public_from_id(db: AsyncIOMotorDatabase, user_id: PyObjectId) -> AuthorPublic:
    # (This function is unchanged)
    user_in_db = await user_service.get_user_by_id(db, user_id)
    if not user_in_db:
        return AuthorPublic(id=str(user_id), firstname="[Deleted]", lastname="User", image=None)
    
    return AuthorPublic(
        id=str(user_in_db.id),
        firstname=user_in_db.firstname,
        lastname=user_in_db.lastname,
        image=user_in_db.image
    )

# --- Helper Function: Populate Thread Public Model ---
async def _populate_thread_public(db: AsyncIOMotorDatabase, thread_in_db: ForumThreadInDB) -> ForumThreadPublic:
    # (This function is unchanged, but now includes is_group)
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
        reply_count=reply_count,
        is_group=thread_in_db.is_group
    )

# --- Helper Function: Populate Post Public Model ---
async def _populate_post_public(db: AsyncIOMotorDatabase, post_in_db: ForumPostInDB) -> ForumPostPublic:
    # (This function is unchanged)
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

# --- (NEW) Security Helper ---
async def _check_group_access(db: AsyncIOMotorDatabase, thread: ForumThreadInDB, user_id: PyObjectId):
    """
    Checks if a user has permission to view a thread.
    If it's not a group, it's public (access granted).
    If it IS a group, checks if user is in the group's member list.
    """
    if not thread.is_group:
        return True # Public thread, access granted
    
    # It's a group thread. We must find its parent group.
    # We use the forum_thread_id, as per your design.
    group_doc = await db[STUDY_GROUPS_COLLECTION].find_one({"forum_thread_id": thread.id})
    if not group_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent group for this thread not found")
        
    group = StudyGroupInDB(**group_doc)
    
    if user_id not in group.members:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this group")
        
    return True

# --- Thread Service Functions (Use Case 21) ---

async def create_thread(db: AsyncIOMotorDatabase, thread_create: ForumThreadCreate, user_id: PyObjectId) -> ForumThreadPublic:
    # (This function is unchanged from our original, working version)
    thread_data = thread_create.dict(exclude_unset=True) 
    thread_data["author_id"] = user_id
    
    thread_in_db = ForumThreadInDB(**thread_data)
    
    result = await db[FORUM_THREADS_COLLECTION].insert_one(
        thread_in_db.dict(by_alias=True) 
    )
    
    created_thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": result.inserted_id})
    if not created_thread_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create forum thread")
        
    created_thread = ForumThreadInDB(**created_thread_doc)
    return await _populate_thread_public(db, created_thread)

async def get_all_threads(db: AsyncIOMotorDatabase) -> List[ForumThreadPublic]:
    """
    (MODIFIED) Fetches all *public* forum threads (is_group is False).
    """
    threads_cursor = db[FORUM_THREADS_COLLECTION].find({"is_group": False}).sort("created_at", -1)
    
    populated_threads = []
    async for thread_doc in threads_cursor:
        thread_in_db = ForumThreadInDB(**thread_doc)
        populated_thread = await _populate_thread_public(db, thread_in_db)
        populated_threads.append(populated_thread)
        
    return populated_threads

async def get_thread_by_id(db: AsyncIOMotorDatabase, thread_id: PyObjectId, user_id: PyObjectId) -> ForumThreadPublic:
    """
    (MODIFIED) Fetches a single forum thread and checks permissions.
    """
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": thread_id})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forum thread not found")
    
    thread_in_db = ForumThreadInDB(**thread_doc)
    
    # (NEW) Check if user is allowed to see this thread
    await _check_group_access(db, thread_in_db, user_id)
    
    return await _populate_thread_public(db, thread_in_db)

# --- (NEW) Function for Group Chats ---
async def get_threads_for_group(db: AsyncIOMotorDatabase, group_id: PyObjectId, user_id: PyObjectId) -> List[ForumThreadPublic]:
    """
    Fetches all threads for a *specific group* after checking membership.
    """
    # 1. Check if user is in the group
    group_doc = await db[STUDY_GROUPS_COLLECTION].find_one({"_id": group_id})
    if not group_doc:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group = StudyGroupInDB(**group_doc)
    if user_id not in group.members:
        raise HTTPException(status_code=403, detail="You are not a member of this group")
        
    # 2. User has access, fetch all threads linked to this group
    threads_cursor = db[FORUM_THREADS_COLLECTION].find({"group_id": group_id}).sort("created_at", -1)
    
    populated_threads = []
    async for thread_doc in threads_cursor:
        thread_in_db = ForumThreadInDB(**thread_doc)
        populated_thread = await _populate_thread_public(db, thread_in_db)
        populated_threads.append(populated_thread)
        
    return populated_threads


# --- Post Service Functions (Use Case 22) ---

async def create_post(db: AsyncIOMotorDatabase, post_create: ForumPostCreate, user_id: PyObjectId) -> ForumPostPublic:
    """
    (MODIFIED) Creates a new post (reply) and checks permissions.
    """
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": post_create.thread_id})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found. Cannot post reply.")
    
    thread = ForumThreadInDB(**thread_doc)

    # (NEW) Check if user is allowed to post in this thread
    await _check_group_access(db, thread, user_id)

    post_data = post_create.dict(exclude_unset=True)
    post_data["author_id"] = user_id
    
    post_in_db = ForumPostInDB(**post_data)
    
    result = await db[FORUM_POSTS_COLLECTION].insert_one(
        post_in_db.dict(by_alias=True)
    )
    
    created_post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": result.inserted_id})
    if not created_post_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create post")
        
    created_post = ForumPostInDB(**created_post_doc)    
    return await _populate_post_public(db, created_post)

async def get_posts_for_thread(db: AsyncIOMotorDatabase, thread_id: PyObjectId, user_id: PyObjectId) -> List[ForumPostPublic]:
    """
    (MODIFIED) Fetches all posts for a thread and checks permissions.
    """
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": thread_id})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
        
    thread = ForumThreadInDB(**thread_doc)
    
    # (NEW) Check if user is allowed to see this thread's posts
    await _check_group_access(db, thread, user_id)
    
    posts_cursor = db[FORUM_POSTS_COLLECTION].find({"thread_id": thread_id}).sort("created_at", 1)
    
    populated_posts = []
    async for post_doc in posts_cursor:
        post_in_db = ForumPostInDB(**post_doc)
        populated_post = await _populate_post_public(db, post_in_db)
        populated_posts.append(populated_post)
        
    return populated_posts

async def edit_post(db: AsyncIOMotorDatabase, post_id: PyObjectId, new_content: str, user_id: PyObjectId) -> ForumPostPublic:
    # (No security change needed, author check is sufficient)
    post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": post_id})
    # ... (rest of function is unchanged)
    if not post_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post = ForumPostInDB(**post_doc)
    if post.author_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to edit this post")
    await db[FORUM_POSTS_COLLECTION].update_one(
        {"_id": post_id},
        {"$set": {"content": new_content, "created_at": datetime.utcnow()}}
    )
    updated_post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": post_id})
    return await _populate_post_public(db, ForumPostInDB(**updated_post_doc))


async def delete_post(db: AsyncIOMotorDatabase, post_id: PyObjectId, user_id: PyObjectId) -> bool:
    # (No security change needed, author check is sufficient)
    post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": post_id})
    # ... (rest of function is unchanged)
    if not post_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post = ForumPostInDB(**post_doc)
    if post.author_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this post")
    result = await db[FORUM_POSTS_COLLECTION].delete_one({"_id": post_id})
    return result.deleted_count == 1

# --- Vote Functions (FR 21.3 & 22.3) ---

async def _vote_on_document(db: AsyncIOMotorDatabase, collection_name: str, doc_id: PyObjectId, user_id: PyObjectId, vote_type: VoteType):
    # (This function is unchanged)
    operations = {"$pull": {"upvotes": user_id, "downvotes": user_id}}
    await db[collection_name].update_one({"_id": doc_id}, operations)
    if vote_type == "upvote":
        await db[collection_name].update_one({"_id": doc_id}, {"$addToSet": {"upvotes": user_id}})
    elif vote_type == "downvote":
        await db[collection_name].update_one({"_id": doc_id}, {"$addToSet": {"downvotes": user_id}})
    updated_doc = await db[collection_name].find_one({"_id": doc_id})
    if not updated_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found after voting")
    return len(updated_doc.get("upvotes", [])), len(updated_doc.get("downvotes", []))

async def vote_on_thread(db: AsyncIOMotorDatabase, thread_id: PyObjectId, user_id: PyObjectId, vote_type: VoteType) -> dict:
    """
    (MODIFIED) Votes on a thread and checks permissions.
    """
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": thread_id})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    
    # (NEW) Check access before allowing vote
    await _check_group_access(db, ForumThreadInDB(**thread_doc), user_id)
    
    upvotes, downvotes = await _vote_on_document(db, FORUM_THREADS_COLLECTION, thread_id, user_id, vote_type)
    return {"upvote_count": upvotes, "downvote_count": downvotes}

async def vote_on_post(db: AsyncIOMotorDatabase, post_id: PyObjectId, user_id: PyObjectId, vote_type: VoteType) -> dict:
    """
    (MODIFIED) Votes on a post and checks permissions.
    """
    post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": post_id})
    if not post_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": post_doc["thread_id"]})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent thread not found")
    
    # (NEW) Check access before allowing vote
    await _check_group_access(db, ForumThreadInDB(**thread_doc), user_id)
    
    upvotes, downvotes = await _vote_on_document(db, FORUM_POSTS_COLLECTION, post_id, user_id, vote_type)
    return {"upvote_count": upvotes, "downvote_count": downvotes}