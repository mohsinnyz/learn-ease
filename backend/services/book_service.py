#backend/services/book_service.py
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
from models.ai_schemas import GlossaryTerm
from core.config import LOCAL_BOOK_UPLOAD_DIR, LOCAL_EXTRACTED_TEXT_DIR
from . import category_service
from . import ai_service
from . import vector_service 
import re
import asyncio
from concurrent.futures import ProcessPoolExecutor # <<< 1. IMPORT THIS

# Ensure upload directories exist when the service module is loaded
os.makedirs(LOCAL_BOOK_UPLOAD_DIR, exist_ok=True)
os.makedirs(LOCAL_EXTRACTED_TEXT_DIR, exist_ok=True)

BOOKS_COLLECTION = "books"
GLOSSARY_TERMS_COLLECTION = "glossary_terms"

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
        
        # <<< 3. MODIFIED VECTOR STORE CREATION STEP >>>
        if full_chatbot_text.strip():
            print(f"INFO: Offloading CPU-bound vector store creation to a separate process for book_id: {book_id}")
            loop = asyncio.get_running_loop()
            
            # This is the key change: we run the blocking function in a separate process pool
            # so it doesn't freeze the main server's event loop.
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
    books_cursor = db["books"].find({"user_id": user_id}).sort("upload_date", -1)
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
    book_doc = await db["books"].find_one({"_id": book_oid, "user_id": user_id})
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
    # ... (code to delete local files)
    if book_to_delete.file_path_local and os.path.exists(book_to_delete.file_path_local):
        try:
            os.remove(book_to_delete.file_path_local)
        except OSError as e:
            print(f"Error removing PDF file {book_to_delete.file_path_local}: {e}")
    if book_to_delete.extracted_text_path_local and os.path.exists(book_to_delete.extracted_text_path_local):
        try:
            os.remove(book_to_delete.extracted_text_path_local)
        except OSError as e:
            print(f"Error removing text file {book_to_delete.extracted_text_path_local}: {e}")
            
    # Also delete the vector store
    vector_store_path = os.path.join("user-book-files/vector-stores", f"{book_id_str}.faiss")
    if os.path.exists(vector_store_path):
        try:
            shutil.rmtree(vector_store_path) # Use rmtree for directories
        except OSError as e:
            print(f"Error removing vector store directory {vector_store_path}: {e}")

    delete_result = await db[BOOKS_COLLECTION].delete_one(
        {"_id": book_to_delete.id, "user_id": user_id}
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

def get_content_for_topic(full_text: str, topic_titles: List[str], target_title: str) -> Optional[str]:
    """
    Finds the text content for a specific topic title within the full text.
    This function does NOT use any LLM calls.
    """
    # Handle the case where the whole document is the only topic
    if len(topic_titles) == 1 and topic_titles[0] == "Full Document":
        return full_text

    try:
        target_index = topic_titles.index(target_title)
    except ValueError:
        return None # Target title not found in the list of topics

    start_index = full_text.find(target_title)
    if start_index == -1:
        return None # Title exists in list but not found in text (should be rare)

    # Find the start of the next topic to define the end of the current one
    end_index = len(full_text)
    if target_index + 1 < len(topic_titles):
        next_title = topic_titles[target_index + 1]
        # Search for the next title starting from after the current one's position
        next_title_index = full_text.find(next_title, start_index + len(target_title))
        if next_title_index != -1:
            end_index = next_title_index
            
    return full_text[start_index:end_index].strip()

# In backend/services/book_service.py, replace the whole function with this:

async def extract_topics_from_pdf(
    db: AsyncIOMotorDatabase,
    book_id_str: str,
    user_id: PyObjectId
) -> List[str]:
    """
    Extracts main topic headings (e.g., "1.1", "1.2") from the first 50 pages
    of a book's PDF by looking for a Table of Contents.
    """
    pdf_path = await get_book_pdf_filepath(db, book_id_str, user_id)
    if not pdf_path:
        raise FileNotFoundError("PDF file not found for the specified book.")

    topics = []
    # Regex to find lines starting with "digit.digit" but not "digit.digit.digit"
    topic_pattern = re.compile(r"^\s*\d+\.\d+\s+[A-Za-z].*$", re.MULTILINE)

    doc = None
    try:
        doc = fitz.open(pdf_path)
        
        # Increased limit to ensure we scan the full ToC
        pages_to_scan = min(len(doc), 50)
        
        for page_num in range(pages_to_scan):
            page = doc.load_page(page_num)
            text = page.get_text()
            
            matches = topic_pattern.findall(text)
            for match in matches:
                # Clean up the matched string
                cleaned_match = " ".join(match.strip().split())
                if cleaned_match not in topics:
                    topics.append(cleaned_match)
        
        return sorted(topics)
        
    except Exception as e:
        print(f"ERROR: Could not extract topics from PDF for book {book_id_str}. Error: {e}")
        return []
    finally:
        if doc:
            doc.close()