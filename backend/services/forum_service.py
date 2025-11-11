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

# --- Internal Helper Functions ---

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

async def _populate_thread_public(db: AsyncIOMotorDatabase, thread_in_db: ForumThreadInDB) -> ForumThreadPublic:
    # (This function is unchanged, but now includes group_id)
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
        group_id=str(thread_in_db.group_id) if thread_in_db.group_id else None
    )

async def _populate_post_public(db: AsyncIOMotorDatabase, post_in_db: ForumPostInDB) -> ForumPostPublic:
    # (This function is unchanged, but now includes reply_to_post_id)
    author_details = await _get_author_public_from_id(db, post_in_db.author_id)
    
    return ForumPostPublic(
        id=str(post_in_db.id),
        thread_id=str(post_in_db.thread_id),
        author=author_details,
        content=post_in_db.content,
        created_at=post_in_db.created_at,
        upvote_count=len(post_in_db.upvotes),
        downvote_count=len(post_in_db.downvotes),
        reply_to_post_id=str(post_in_db.reply_to_post_id) if post_in_db.reply_to_post_id else None
    )

# --- (NEW) Security Helper ---
async def _check_group_access(db: AsyncIOMotorDatabase, group_id: Optional[PyObjectId], user_id: PyObjectId):
    """
    Checks if a user has permission to view content.
    If group_id is None, it's public (access granted).
    If group_id is set, checks if user is in the group's member list.
    """
    if group_id is None:
        return True # Public thread, access granted
    
    group_doc = await db[STUDY_GROUPS_COLLECTION].find_one({"_id": group_id})
    if not group_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
        
    group = StudyGroupInDB(**group_doc)
    
    if user_id not in group.members:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this group's content")
        
    return True

# --- Thread Service Functions (Use Case 21) ---

async def create_thread(db: AsyncIOMotorDatabase, thread_create: ForumThreadCreate, user_id: PyObjectId) -> ForumThreadPublic:
    """
    Creates a new forum thread (FR 21.1, 21.2)
    (UPDATED with group security check)
    """
    # (NEW) Check if user is allowed to post in this group (if group_id is provided)
    if thread_create.group_id:
        await _check_group_access(db, thread_create.group_id, user_id)
        
    thread_data = thread_create.model_dump(exclude_unset=True)
    thread_data["author_id"] = user_id
    
    thread_in_db = ForumThreadInDB(**thread_data)
    
    result = await db[FORUM_THREADS_COLLECTION].insert_one(
        thread_in_db.model_dump(by_alias=True)
    )
    
    created_thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": result.inserted_id})
    if not created_thread_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create forum thread")
        
    created_thread = ForumThreadInDB(**created_thread_doc)
    return await _populate_thread_public(db, created_thread)

async def get_public_threads(db: AsyncIOMotorDatabase) -> List[ForumThreadPublic]:
    """
    Fetches all *public* forum threads (group_id is None).
    """
    # (MODIFIED) Only finds threads where group_id is null
    threads_cursor = db[FORUM_THREADS_COLLECTION].find({"group_id": None}).sort("created_at", -1)
    
    populated_threads = []
    async for thread_doc in threads_cursor:
        thread_in_db = ForumThreadInDB(**thread_doc)
        populated_thread = await _populate_thread_public(db, thread_in_db)
        populated_threads.append(populated_thread)
        
    return populated_threads

async def get_threads_for_group(db: AsyncIOMotorDatabase, group_id: PyObjectId, user_id: PyObjectId) -> List[ForumThreadPublic]:
    """
    (NEW) Fetches all threads for a *specific group* after checking membership.
    """
    # 1. Check if user is allowed to see this group's threads
    await _check_group_access(db, group_id, user_id)
    
    # 2. User has access, fetch the threads
    threads_cursor = db[FORUM_THREADS_COLLECTION].find({"group_id": group_id}).sort("created_at", -1)
    
    populated_threads = []
    async for thread_doc in threads_cursor:
        thread_in_db = ForumThreadInDB(**thread_doc)
        populated_thread = await _populate_thread_public(db, thread_in_db)
        populated_threads.append(populated_thread)
        
    return populated_threads

async def get_single_thread(db: AsyncIOMotorDatabase, thread_id: PyObjectId, user_id: PyObjectId) -> ForumThreadPublic:
    """
    Fetches a single forum thread by its ID.
    (UPDATED with group security check)
    """
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": thread_id})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forum thread not found")
    
    thread_in_db = ForumThreadInDB(**thread_doc)
    
    # (NEW) Check if user is allowed to see this thread
    await _check_group_access(db, thread_in_db.group_id, user_id)
    
    return await _populate_thread_public(db, thread_in_db)

# --- Post Service Functions (Use Case 22) ---

async def create_post(db: AsyncIOMotorDatabase, post_create: ForumPostCreate, user_id: PyObjectId) -> ForumPostPublic:
    """
    Creates a new post (reply) on a forum thread.
    (UPDATED with group security check)
    """
    # Check if thread exists
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": post_create.thread_id})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found. Cannot post reply.")
    
    thread = ForumThreadInDB(**thread_doc)

    # (NEW) Check if user is allowed to post in this thread (i.e., is a member)
    await _check_group_access(db, thread.group_id, user_id)

    post_data = post_create.model_dump(exclude_unset=True)
    post_data["author_id"] = user_id
    
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

async def get_posts_for_thread(db: AsyncIOMotorDatabase, thread_id: PyObjectId, user_id: PyObjectId) -> List[ForumPostPublic]:
    """
    Fetches all posts (replies) for a single forum thread.
    (UPDATED with group security check)
    """
    # (NEW) First, check if thread exists and if user has access to it
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": thread_id})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
        
    thread = ForumThreadInDB(**thread_doc)
    await _check_group_access(db, thread.group_id, user_id)
    
    # User has access, now fetch the posts
    posts_cursor = db[FORUM_POSTS_COLLECTION].find({"thread_id": thread_id}).sort("created_at", 1) # Oldest first
    
    populated_posts = []
    async for post_doc in posts_cursor:
        post_in_db = ForumPostInDB(**post_doc)
        populated_post = await _populate_post_public(db, post_in_db)
        populated_posts.append(populated_post)
        
    return populated_posts

async def edit_post(db: AsyncIOMotorDatabase, post_id: PyObjectId, new_content: str, user_id: PyObjectId) -> ForumPostPublic:
    # (No changes needed, user_id check is sufficient)
    post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": post_id})
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
    # (No changes needed, user_id check is sufficient)
    post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": post_id})
    if not post_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    post = ForumPostInDB(**post_doc)
    if post.author_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this post")
    result = await db[FORUM_POSTS_COLLECTION].delete_one({"_id": post_id})
    return result.deleted_count == 1

# --- Vote Functions (FR 21.3 & 22.3) ---

async def _vote_on_document(db: AsyncIOMotorDatabase, collection_name: str, doc_id: PyObjectId, user_id: PyObjectId, vote_type: VoteType):
    # (This function is unchanged, but we must check access *before* calling it)
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
    # (NEW) Check access before allowing vote
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": thread_id})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    await _check_group_access(db, thread_doc.get("group_id"), user_id)
    
    upvotes, downvotes = await _vote_on_document(db, FORUM_THREADS_COLLECTION, thread_id, user_id, vote_type)
    return {"upvote_count": upvotes, "downvote_count": downvotes}

async def vote_on_post(db: AsyncIOMotorDatabase, post_id: PyObjectId, user_id: PyObjectId, vote_type: VoteType) -> dict:
    # (NEW) Check access before allowing vote
    post_doc = await db[FORUM_POSTS_COLLECTION].find_one({"_id": post_id})
    if not post_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    
    # Find the parent thread to check its group_id
    thread_doc = await db[FORUM_THREADS_COLLECTION].find_one({"_id": post_doc["thread_id"]})
    if not thread_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent thread not found")
    
    await _check_group_access(db, thread_doc.get("group_id"), user_id)
    
    upvotes, downvotes = await _vote_on_document(db, FORUM_POSTS_COLLECTION, post_id, user_id, vote_type)
    return {"upvote_count": upvotes, "downvote_count": downvotes}