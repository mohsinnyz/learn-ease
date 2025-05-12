import os
import uuid
import shutil
import fitz 
from fastapi import UploadFile, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from models.book_schemas import BookCreateInternal, BookInDB, BookPublic, PyObjectId
from models.user_schemas import UserInDB 
from core.config import LOCAL_BOOK_UPLOAD_DIR, LOCAL_EXTRACTED_TEXT_DIR

# Ensure upload directories exist when the service module is loaded
os.makedirs(LOCAL_BOOK_UPLOAD_DIR, exist_ok=True)
os.makedirs(LOCAL_EXTRACTED_TEXT_DIR, exist_ok=True)

async def process_and_save_book(
    db: AsyncIOMotorDatabase,
    file: UploadFile,
    current_user: UserInDB
) -> BookPublic:
    if not current_user.id or not isinstance(current_user.id, ObjectId): # <--- Changed PyObjectId to ObjectId
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="User ID is invalid or not available for book association."
        )

    user_id_for_path = str(current_user.id) # Use string version for path compatibility if needed

    # Sanitize original filename for safer paths
    original_filename_sanitized = "".join(c if c.isalnum() or c in ['.', '_', '-'] else '_' for c in file.filename)
    
    file_extension = os.path.splitext(original_filename_sanitized)[1]
    if not file_extension.lower() == ".pdf": # Double check, though router should also
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Only PDF is allowed.")

    unique_filename_stem = f"{user_id_for_path}_{uuid.uuid4()}"
    
    stored_pdf_filename = f"{unique_filename_stem}{file_extension}"
    pdf_save_path = os.path.join(LOCAL_BOOK_UPLOAD_DIR, stored_pdf_filename)
    
    stored_text_filename = f"{unique_filename_stem}.txt"
    text_save_path = os.path.join(LOCAL_EXTRACTED_TEXT_DIR, stored_text_filename)

    file_size_bytes: int = 0

    # 1. Save PDF
    try:
        with open(pdf_save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size_bytes = os.path.getsize(pdf_save_path)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not save PDF: {str(e)}")
    finally:
        await file.close() # Ensure UploadFile is closed

    # 2. Extract Text
    try:
        doc = fitz.open(pdf_save_path)
        extracted_text = "".join(page.get_text() for page in doc)
        doc.close()
        with open(text_save_path, "w", encoding="utf-8") as text_f:
            text_f.write(extracted_text)
    except Exception as e:
        if os.path.exists(pdf_save_path): os.remove(pdf_save_path) # Clean up PDF if text extraction fails
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to extract text from PDF: {str(e)}")

    # 3. Create DB Record
    book_meta = BookCreateInternal(
        title=file.filename or "Untitled Book", # Or allow user to set title via another form field
        original_filename=file.filename,
        content_type=file.content_type,
        file_size_bytes=file_size_bytes,
        user_id=current_user.id, # This MUST be PyObjectId
        stored_filename=stored_pdf_filename, # Just the filename, relative to its dir
        file_path_local=pdf_save_path,
        extracted_text_path_local=text_save_path
    )
    
    # Use model_dump for preparing data for MongoDB, ensuring alias _id is handled by BookInDB
    book_doc_for_db = BookInDB(
        **book_meta.model_dump(), 
        status="ready" # Set status to ready after successful processing
    ).model_dump(by_alias=True, exclude={"id"} if BookInDB.__fields__["id"].default_factory else {})


    result = await db["books"].insert_one(book_doc_for_db)
    
    created_book_doc = await db["books"].find_one({"_id": result.inserted_id})
    if not created_book_doc:
        # Critical error: data saved to disk but not DB. Requires cleanup.
        if os.path.exists(pdf_save_path): os.remove(pdf_save_path)
        if os.path.exists(text_save_path): os.remove(text_save_path)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save book metadata after file processing.")
    
    return BookPublic.from_db_model(BookInDB(**created_book_doc))


async def get_user_books(db: AsyncIOMotorDatabase, user_id: PyObjectId) -> List[BookPublic]:
    books_cursor = db["books"].find({"user_id": user_id}).sort("upload_date", -1) # Sort by newest first
    db_books = await books_cursor.to_list(length=None) # Fetch all for user
    return [BookPublic.from_db_model(BookInDB(**book_doc)) for book_doc in db_books]