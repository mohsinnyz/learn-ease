# backend/services/book_service.py

import os
import uuid
import shutil
import fitz  # PyMuPDF
from fastapi import UploadFile, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Tuple
from datetime import datetime
from bson import ObjectId
from models.book_schemas import (
    BookCreateInternal, BookInDB, BookPublic, PyObjectId,
    BookTopicCreate, BookTopicInDB, BookTopicPublic  # <<< IMPORT NEW SCHEMAS
)
from models.user_schemas import UserInDB
from models.ai_schemas import GlossaryTerm
from core.config import LOCAL_BOOK_UPLOAD_DIR, LOCAL_EXTRACTED_TEXT_DIR, LOCAL_VECTOR_STORE_DIR
from . import category_service
from . import ai_service
from . import vector_service
import re
import asyncio
from concurrent.futures import ProcessPoolExecutor

# Ensure upload directories exist when the service module is loaded
os.makedirs(LOCAL_BOOK_UPLOAD_DIR, exist_ok=True)
os.makedirs(LOCAL_EXTRACTED_TEXT_DIR, exist_ok=True)
os.makedirs(LOCAL_VECTOR_STORE_DIR, exist_ok=True)

# --- COLLECTION NAMES ---
BOOKS_COLLECTION = "books"
GLOSSARY_TERMS_COLLECTION = "glossary_terms"
BOOK_TOPICS_COLLECTION = "book_topics"
QUIZ_RESULTS_COLLECTION = "quiz_results"     

async def _save_glossary_terms_for_page(
    db: AsyncIOMotorDatabase,
    book_id: PyObjectId,
    page_number: int,
    terms: List[GlossaryTerm]
):
    """Saves the glossary terms for a specific page to the database."""
    if not terms:
        return

    document = {
        "book_id": book_id,
        "page_number": page_number,
        "terms": [term.model_dump() for term in terms],
        "created_at": datetime.utcnow()
    }
    await db[GLOSSARY_TERMS_COLLECTION].insert_one(document)


def run_vector_creation_in_process(book_id: str, book_text: str) -> bool:
    """
    This is a synchronous wrapper function that will be executed in a separate process.
    It's designed to handle the CPU-bound task of vector store creation.
    """
    # We must re-import services here because this is a new process.
    from services import vector_service
    # Since the target function is async, we run it inside a new event loop for this process.
    return asyncio.run(vector_service.create_vector_store_for_book(book_id, book_text))


async def _extract_and_save_topics(
    db: AsyncIOMotorDatabase,
    book_id: PyObjectId,
    pdf_path: str
):
    """
    (NEW FUNCTION)
    Extracts topics using the PDF's Table of Contents (ToC) and saves
    each topic's title, page range, and full text content to the DB.
    """
    print(f"INFO: Starting ToC extraction for book_id: {book_id}")
    doc = None
    try:
        doc = fitz.open(pdf_path)
        toc = doc.get_toc()  # Returns list of [level, title, page_num]
        
        if not toc:
            print(f"WARN: No ToC found for book_id: {book_id}. Skipping topic extraction.")
            return

        topics_to_create: List[BookTopicCreate] = []

        for i, (level, title, page_start) in enumerate(toc):
            # Clean title
            title = title.strip()
            if not title:
                continue

            # Determine the end page for the topic
            page_end = doc.page_count
            if i + 1 < len(toc):
                # End page is the page *before* the next topic starts
                page_end = toc[i+1][2] - 1
            
            # Ensure page numbers are valid
            page_start_idx = max(0, page_start - 1) # fitz is 1-based, doc pages are 0-based
            page_end_idx = min(doc.page_count - 1, page_end - 1)

            if page_start_idx > page_end_idx:
                continue # Skip if page range is invalid

            # Extract all text content for this topic's page range
            topic_content_parts = []
            for page_num in range(page_start_idx, page_end_idx + 1):
                page = doc.load_page(page_num)
                topic_content_parts.append(page.get_text())
            
            topic_content = "\n\n".join(topic_content_parts).strip()

            if not topic_content:
                print(f"WARN: No content found for topic '{title}' (pages {page_start}-{page_end}). Skipping.")
                continue

            # Prepare the topic document for the database
            topic_data = BookTopicCreate(
                book_id=book_id,
                topic_title=title,
                page_start=page_start,
                page_end=page_end,
                content=topic_content
            )
            topics_to_create.append(topic_data)

        # Batch insert all topics into the database
        if topics_to_create:
            documents = [
                BookTopicInDB(**t.model_dump()).model_dump(by_alias=True)
                for t in topics_to_create
            ]
            for doc_data in documents:
                 if "_id" not in doc_data:
                    doc_data["_id"] = ObjectId()

            await db[BOOK_TOPICS_COLLECTION].insert_many(documents)
            print(f"INFO: Successfully saved {len(topics_to_create)} topics for book_id: {book_id}")
        else:
            print(f"INFO: No valid topics with content found for book_id: {book_id}")

    except Exception as e:
        print(f"ERROR: Topic extraction failed for book_id: {book_id}. Error: {str(e)}")
    finally:
        if doc:
            doc.close()


async def process_book_in_background(
    db: AsyncIOMotorDatabase,
    book_id: PyObjectId,
    pdf_path: str,
    text_save_path: str
):
    """
    This function runs in the background. It extracts text, generates glossary data,
    creates a vector store in a separate process, and updates the book status.
    """
    print(f"INFO: Starting background processing for book_id: {book_id}")
    chatbot_text_parts = []
    
    MIN_WORDS_PER_PAGE = 75
    GLOSSARY_PAGE_LIMIT = 20
    glossary_pages_saved = 0

    try:
        # --- (NEW) EXTRACT AND SAVE TOPICS FIRST ---
        # We do this here while the 'fitz' doc is open.
        await _extract_and_save_topics(db, book_id, pdf_path)
        # --- END OF NEW TOPIC EXTRACTION ---

        doc = fitz.open(pdf_path)
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            
            word_count = len(text.split())
            if word_count < MIN_WORDS_PER_PAGE:
                continue

            if glossary_pages_saved < GLOSSARY_PAGE_LIMIT:
                generated_terms = await ai_service.generate_glossary_from_text(text)
                
                if generated_terms:
                    await _save_glossary_terms_for_page(
                        db=db,
                        book_id=book_id,
                        page_number=page_num + 1,
                        terms=generated_terms
                    )
                glossary_pages_saved += 1

            chatbot_text_parts.append(text)
        
        doc.close()

        full_chatbot_text = "\n\n".join(chatbot_text_parts)
        with open(text_save_path, "w", encoding="utf-8") as text_f:
            text_f.write(full_chatbot_text)
        
        if full_chatbot_text.strip():
            print(f"INFO: Offloading CPU-bound vector store creation to a separate process for book_id: {book_id}")
            loop = asyncio.get_running_loop()
            
            with ProcessPoolExecutor() as pool:
                vector_creation_success = await loop.run_in_executor(
                    pool, run_vector_creation_in_process, str(book_id), full_chatbot_text
                )
            
            if not vector_creation_success:
                print(f"WARNING: Vector store creation failed for book_id: {book_id}. AI Mentor will not work for this book.")
        else:
            print(f"WARNING: Skipping vector store creation for book_id: {book_id} due to empty text content.")

        # Update book status to 'ready'
        await db[BOOKS_COLLECTION].update_one(
            {"_id": book_id},
            {"$set": {"status": "ready"}}
        )
        print(f"INFO: Successfully finished background processing for book_id: {book_id}")

    except Exception as e:
        print(f"ERROR: Background processing failed for book_id: {book_id}. Error: {str(e)}")
        await db[BOOKS_COLLECTION].update_one(
            {"_id": book_id},
            {"$set": {"status": "failed"}}
        )


async def process_and_save_book(
    db: AsyncIOMotorDatabase,
    file: UploadFile,
    current_user: UserInDB,
    title_from_user: Optional[str] = None,
    category_id_str: Optional[str] = None
) -> BookInDB:
    if not current_user.id or not isinstance(current_user.id, ObjectId):
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="User ID is invalid or not available for book association.")
    
    category_oid: Optional[PyObjectId] = None
    if category_id_str:
        try:
            category_obj = await category_service.get_category_by_id_for_user(db, category_id_str, current_user.id)
            if not category_obj:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Category ID '{category_id_str}' not found or does not belong to user.")
            category_oid = category_obj.id
        except ValueError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid Category ID format: {category_id_str}")

    user_id_for_path = str(current_user.id)
    original_filename_sanitized = "".join(c if c.isalnum() or c in ['.', '_', '-'] else '_' for c in (file.filename or "unknown_file"))
    file_extension = os.path.splitext(original_filename_sanitized)[1]
    if not file_extension.lower() == ".pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Only PDF is allowed.")

    unique_filename_stem = f"{user_id_for_path}_{uuid.uuid4()}"
    stored_pdf_filename = f"{unique_filename_stem}{file_extension}"
    pdf_save_path = os.path.join(LOCAL_BOOK_UPLOAD_DIR, stored_pdf_filename)
    stored_text_filename = f"{unique_filename_stem}.txt"
    text_save_path = os.path.join(LOCAL_EXTRACTED_TEXT_DIR, stored_text_filename)
    
    try:
        with open(pdf_save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_size_bytes = os.path.getsize(pdf_save_path)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Could not save PDF: {str(e)}")
    finally:
        await file.close()

    book_meta = BookCreateInternal(
        title=title_from_user or file.filename or "Untitled Book",
        original_filename=file.filename,
        content_type=file.content_type,
        file_size_bytes=file_size_bytes,
        user_id=current_user.id,
        stored_filename=stored_pdf_filename,
        file_path_local=pdf_save_path,
        extracted_text_path_local=text_save_path,
        category_id=category_oid
    )
    
    book_doc_for_db = BookInDB(**book_meta.model_dump()).model_dump(by_alias=True)
    if "_id" not in book_doc_for_db:
            book_doc_for_db["_id"] = ObjectId()

    result = await db[BOOKS_COLLECTION].insert_one(book_doc_for_db)
    
    created_book_doc = await db[BOOKS_COLLECTION].find_one({"_id": result.inserted_id})
    if not created_book_doc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create initial book record.")
        
    return BookInDB(**created_book_doc)

async def update_book_category(
    db: AsyncIOMotorDatabase,
    book_id_str: str,
    new_category_id_str: Optional[str],
    user_id: PyObjectId
) -> Optional[BookInDB]:
    book_to_update = await get_book_by_id_for_user(db, book_id_str, user_id)
    if not book_to_update:
        return None
    new_category_oid: Optional[PyObjectId] = None
    if new_category_id_str:
        category_obj = await category_service.get_category_by_id_for_user(db, new_category_id_str, user_id)
        if not category_obj:
            raise ValueError(f"Target category ID '{new_category_id_str}' not found or does not belong to user.")
        new_category_oid = category_obj.id
    update_result = await db[BOOKS_COLLECTION].update_one(
        {"_id": book_to_update.id, "user_id": user_id},
        {"$set": {"category_id": new_category_oid}}
    )
    if update_result.modified_count == 1:
        updated_book_doc = await db[BOOKS_COLLECTION].find_one({"_id": book_to_update.id})
        if updated_book_doc:
            return BookInDB(**updated_book_doc)
    current_book_doc_after_attempt = await db[BOOKS_COLLECTION].find_one({"_id": book_to_update.id})
    if current_book_doc_after_attempt:
        return BookInDB(**current_book_doc_after_attempt)
    return None

async def get_user_books(db: AsyncIOMotorDatabase, user_id: PyObjectId) -> List[BookPublic]:
    books_cursor = db[BOOKS_COLLECTION].find({"user_id": user_id}).sort("upload_date", -1)
    db_books = await books_cursor.to_list(length=None)
    return [BookPublic.from_db_model(BookInDB(**book_doc)) for book_doc in db_books]

async def get_book_by_id_for_user(
    db: AsyncIOMotorDatabase, 
    book_id_str: str, 
    user_id: PyObjectId
) -> Optional[BookInDB]:
    try:
        book_oid = PyObjectId(book_id_str)
    except Exception:
        return None
    book_doc = await db[BOOKS_COLLECTION].find_one({"_id": book_oid, "user_id": user_id})
    if book_doc:
        return BookInDB(**book_doc)
    return None

async def get_book_pdf_filepath(
    db: AsyncIOMotorDatabase, 
    book_id_str: str, 
    user_id: PyObjectId
) -> Optional[str]:
    book = await get_book_by_id_for_user(db, book_id_str, user_id)
    if book and book.file_path_local and os.path.exists(book.file_path_local):
        return book.file_path_local
    return None

async def get_book_extracted_text(
    db: AsyncIOMotorDatabase, 
    book_id_str: str, 
    user_id: PyObjectId
) -> Optional[str]:
    book = await get_book_by_id_for_user(db, book_id_str, user_id)
    if book and book.extracted_text_path_local and os.path.exists(book.extracted_text_path_local):
        try:
            with open(book.extracted_text_path_local, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            print(f"Error reading extracted text file {book.extracted_text_path_local}: {e}")
            return None
    return None

async def delete_book_for_user(
    db: AsyncIOMotorDatabase, 
    book_id_str: str, 
    user_id: PyObjectId
) -> bool:
    book_to_delete = await get_book_by_id_for_user(db, book_id_str, user_id)
    if not book_to_delete:
        return False
    
    # Get the book's ObjectId for querying other collections
    book_obj_id = book_to_delete.id

    # --- 1. Delete associated MongoDB data ---

    # Delete associated topics
    try:
        await db[BOOK_TOPICS_COLLECTION].delete_many({"book_id": book_obj_id})
        print(f"INFO: Deleted topics for book_id: {book_id_str}")
    except Exception as e:
        print(f"WARN: Failed to delete topics for book {book_id_str}: {e}")

    # --- (NEW) Delete associated quiz results ---
    try:
        await db[QUIZ_RESULTS_COLLECTION].delete_many({"book_id": book_obj_id})
        print(f"INFO: Deleted quiz results for book_id: {book_id_str}")
    except Exception as e:
        print(f"WARN: Failed to delete quiz results for book {book_id_str}: {e}")
    # --- End of new code ---

    # --- (NEW) Delete associated glossary entries ---
    try:
        await db[GLOSSARY_TERMS_COLLECTION].delete_many({"book_id": book_obj_id})
        print(f"INFO: Deleted glossary for book_id: {book_id_str}")
    except Exception as e:
        print(f"WARN: Failed to delete glossary for book {book_id_str}: {e}")
    # --- End of new code ---

    # --- 2. Delete associated local files ---

    # Delete the PDF file
    if book_to_delete.file_path_local and os.path.exists(book_to_delete.file_path_local):
        try:
            os.remove(book_to_delete.file_path_local)
        except OSError as e:
            print(f"Error removing PDF file {book_to_delete.file_path_local}: {e}")
            
    # Delete the extracted text file
    if book_to_delete.extracted_text_path_local and os.path.exists(book_to_delete.extracted_text_path_local):
        try:
            os.remove(book_to_delete.extracted_text_path_local)
        except OSError as e:
            print(f"Error removing text file {book_to_delete.extracted_text_path_local}: {e}")
            
    # Delete the vector store directory
    # --- (FIXED) Delete the vector store directory ---
    # We now use your absolute path from core.config
    vector_store_path = os.path.join(LOCAL_VECTOR_STORE_DIR, f"{book_id_str}.faiss")
    
    if os.path.exists(vector_store_path):
        try:
            shutil.rmtree(vector_store_path) # Use rmtree for directories
            print(f"INFO: Deleted vector store at {vector_store_path}")
        except OSError as e:
            print(f"Error removing vector store directory {vector_store_path}: {e}")
    else:
        # This will help debug if the path is still wrong
        print(f"WARN: Vector store path not found (skipping delete): {vector_store_path}")
    # --- (End Fix) ---

    # --- 3. Finally, delete the book itself ---
    
    delete_result = await db[BOOKS_COLLECTION].delete_one(
        {"_id": book_obj_id, "user_id": user_id}
    )
    
    return delete_result.deleted_count == 1

async def get_glossary_for_page(
    db: AsyncIOMotorDatabase,
    book_id: PyObjectId,
    page_number: int
) -> List[dict]:
    """
    Retrieves the glossary terms for a specific page of a book.
    """
    glossary_doc = await db[GLOSSARY_TERMS_COLLECTION].find_one(
        {"book_id": book_id, "page_number": page_number}
    )
    
    if glossary_doc and "terms" in glossary_doc:
        return glossary_doc["terms"]
    
    return []

# (This is the NEW, FAST function)
async def get_topics_for_book(
    db: AsyncIOMotorDatabase,
    book_id_str: str,
    user_id: PyObjectId
) -> List[BookTopicPublic]:
    """
    Retrieves the list of topics (title and ID, no content) for a specific book
    that the user owns.
    """
    # 1. Verify user has access to the book
    book = await get_book_by_id_for_user(db, book_id_str, user_id)
    if not book:
        # This check is crucial for security
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found or access denied.")
    
    # --- (THIS IS THE FIX) ---
    # Define a projection to fetch only the fields we need
    projection = {
        "_id": 1,
        "book_id": 1,
        "topic_title": 1,
        "page_start": 1
        # We are *omitting* the massive "content" field
    }
    # --- (END OF FIX) ---
    
    # 2. Fetch topics using the projection
    topics_cursor = db[BOOK_TOPICS_COLLECTION].find(
        {"book_id": book.id},
        projection=projection  # <-- Pass the projection here
    ).sort("page_start", 1) # Sort by page number
    
    db_topics = await topics_cursor.to_list(length=None)
    
    # 3. Convert to public, lightweight models
    # We can now map directly, as the fields match BookTopicPublic
    return [
        BookTopicPublic(
            id=str(topic_doc["_id"]),
            book_id=str(topic_doc["book_id"]),
            topic_title=topic_doc["topic_title"],
            page_start=topic_doc["page_start"]
        )
        for topic_doc in db_topics
    ]