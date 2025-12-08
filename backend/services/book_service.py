# backend/services/book_service.py

import os
import uuid
import tempfile  # <<< NEW: For handling temporary PDF downloads
import fitz  # PyMuPDF
from fastapi import UploadFile, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from models.book_schemas import (
    BookCreateInternal, BookInDB, BookPublic, PyObjectId,
    BookTopicCreate, BookTopicInDB, BookTopicPublic
)
from models.user_schemas import UserInDB
from models.ai_schemas import GlossaryTerm
from . import category_service
from . import ai_service
from . import vector_service
import re
import asyncio
from concurrent.futures import ProcessPoolExecutor

# <<< NEW: Import our S3 Client >>>
from core.s3_client import s3_client 

# --- COLLECTION NAMES ---
BOOKS_COLLECTION = "books"
GLOSSARY_TERMS_COLLECTION = "glossary_terms"
BOOK_TOPICS_COLLECTION = "book_topics"
QUIZ_RESULTS_COLLECTION = "quiz_results"     

TOPIC_START_REGEX = re.compile(r"^\s*(\d+)(\.\d+)?\.?\s+([A-Za-z0-9].+)")
CLEAN_REGEX = re.compile(r"(.+?)\s*(\.{3,}|\s{2,})\s*\d+\s*$")

JUNK_TOPIC_KEYWORDS = {
    "summary", "bibliography", "reading list", "suggestions for further reading",
    "references", "further reading"
}

async def get_book_pdf_filepath(
    db: AsyncIOMotorDatabase, 
    book_id_str: str, 
    user_id: PyObjectId
) -> Optional[str]:
    """
    Retrieves the S3 Key (filepath) for the PDF of a specific book.
    """
    book = await get_book_by_id_for_user(db, book_id_str, user_id)
    if book and book.file_path_local:
        return book.file_path_local
    return None

# --- HELPER: Save Glossary ---
async def _save_glossary_terms_for_page(
    db: AsyncIOMotorDatabase,
    book_id: PyObjectId,
    page_number: int,
    terms: List[GlossaryTerm]
):
    if not terms: return
    document = {
        "book_id": book_id,
        "page_number": page_number,
        "terms": [term.model_dump() for term in terms],
        "created_at": datetime.utcnow()
    }
    await db[GLOSSARY_TERMS_COLLECTION].insert_one(document)

# --- HELPER: Vector Creation Wrapper ---
def run_vector_creation_in_process(book_id: str, book_text: str) -> bool:
    from services import vector_service
    return asyncio.run(vector_service.create_vector_store_for_book(book_id, book_text))

# --- HELPER: Topic Extraction ---
async def _extract_and_save_topics(
    db: AsyncIOMotorDatabase,
    book_id: PyObjectId,
    doc: fitz.Document # <<< CHANGED: Pass the open doc object directly
):
    print(f"INFO: Starting topic extraction for book_id: {book_id}")
    try:
        # We assume 'doc' is already open and valid from the calling function
        
        topics = _get_toc_from_metadata(doc)
        if not topics:
            print(f"INFO: No metadata ToC found. Falling back to regex parsing.")
            topics = _get_toc_from_regex(doc)

        if not topics:
            print(f"WARN: No topics could be extracted for book_id: {book_id}. Skipping.")
            return

        topics_to_create: List[BookTopicCreate] = []
        
        for i, current_topic in enumerate(topics):
            next_topic = topics[i + 1] if i + 1 < len(topics) else None
            
            content_slice, page_start, page_end = _extract_text_between_anchors(
                doc,
                current_topic["title"],
                next_topic["title"] if next_topic else None,
                current_topic["page_start"]
            )
            
            if not content_slice: continue

            # Filter Junk
            title_lower = current_topic["title"].lower()
            if any(keyword in title_lower for keyword in JUNK_TOPIC_KEYWORDS):
                continue

            topic_data = BookTopicCreate(
                book_id=book_id,
                topic_title=current_topic["title"],
                page_start=page_start,
                page_end=page_end,
                content=content_slice
            )
            topics_to_create.append(topic_data)

        if topics_to_create:
            documents = [
                BookTopicInDB(**t.model_dump()).model_dump(by_alias=True)
                for t in topics_to_create
            ]
            for doc_data in documents:
                if "_id" not in doc_data: doc_data["_id"] = ObjectId()

            await db[BOOK_TOPICS_COLLECTION].insert_many(documents)
            print(f"INFO: Successfully saved {len(topics_to_create)} topics.")
        else:
            print(f"INFO: No valid topics found.")

    except Exception as e:
        print(f"ERROR: Topic extraction failed. Error: {str(e)}")


# --- BACKGROUND PROCESSING (NOW S3 AWARE) ---

async def process_book_in_background(
    db: AsyncIOMotorDatabase,
    book_id: PyObjectId,
    s3_pdf_key: str, 
    s3_text_key: str
):
    print(f"INFO: Starting background processing for book_id: {book_id}")
    chatbot_text_parts = []
    
    MIN_WORDS_PER_PAGE = 75
    GLOSSARY_PAGE_LIMIT = 20
    glossary_pages_saved = 0

    # --- WINDOWS-SAFE TEMP FILE CREATION ---
    fd, temp_pdf_path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd) # Close the file handle immediately so other libs can use the path

    try:
        # 1. Download PDF from S3 to Temp
        print(f"INFO: Downloading PDF from S3 for processing...")
        if not s3_client.download_file(s3_pdf_key, temp_pdf_path):
            raise Exception("Failed to download PDF from S3")

        # 2. Open PDF with Fitz
        doc = fitz.open(temp_pdf_path)
        
        # 3. Extract Topics
        await _extract_and_save_topics(db, book_id, doc)

        # 4. Process Pages
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text()
            
            word_count = len(text.split())
            if word_count < MIN_WORDS_PER_PAGE: continue

            if glossary_pages_saved < GLOSSARY_PAGE_LIMIT:
                generated_terms = await ai_service.generate_glossary_from_text(text)
                if generated_terms:
                    await _save_glossary_terms_for_page(
                        db, book_id, page_num + 1, generated_terms
                    )
                glossary_pages_saved += 1

            chatbot_text_parts.append(text)
        
        doc.close()

        # 5. Save Extracted Text to S3
        full_chatbot_text = "\n\n".join(chatbot_text_parts)
        
        # Windows-Safe Temp Text File
        fd_txt, temp_txt_path = tempfile.mkstemp(suffix=".txt")
        os.close(fd_txt)

        try:
            with open(temp_txt_path, "w", encoding="utf-8") as f:
                f.write(full_chatbot_text)
            
            print(f"INFO: Uploading extracted text to S3...")
            s3_client.upload_file(temp_txt_path, s3_text_key)
        finally:
            if os.path.exists(temp_txt_path):
                os.remove(temp_txt_path)

        # 6. Vector Store Creation
        if full_chatbot_text.strip():
            print(f"INFO: Creating vector store...")
            loop = asyncio.get_running_loop()
            with ProcessPoolExecutor() as pool:
                vector_success = await loop.run_in_executor(
                    pool, run_vector_creation_in_process, str(book_id), full_chatbot_text
                )
            if not vector_success:
                print(f"WARNING: Vector store creation failed.")
        else:
            print(f"WARNING: No text content extracted.")

        # 7. Update Status
        await db[BOOKS_COLLECTION].update_one(
            {"_id": book_id}, {"$set": {"status": "ready"}}
        )
        print(f"INFO: Finished processing book_id: {book_id}")

    except Exception as e:
        print(f"ERROR: Background processing failed: {str(e)}")
        await db[BOOKS_COLLECTION].update_one(
            {"_id": book_id}, {"$set": {"status": "failed"}}
        )
    finally:
        # Cleanup PDF temp file
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)


# --- MAIN UPLOAD FUNCTION (S3 AWARE) ---

async def process_and_save_book(
    db: AsyncIOMotorDatabase,
    file: UploadFile,
    current_user: UserInDB,
    title_from_user: Optional[str] = None,
    category_id_str: Optional[str] = None
) -> BookInDB:
    if not current_user.id or not isinstance(current_user.id, ObjectId):
        raise HTTPException(status_code=500, detail="Invalid User ID.")
    
    # Category Validation
    category_oid: Optional[PyObjectId] = None
    if category_id_str:
        try:
            category_obj = await category_service.get_category_by_id_for_user(db, category_id_str, current_user.id)
            if not category_obj: raise HTTPException(status_code=400, detail="Category not found.")
            category_oid = category_obj.id
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid Category ID.")

    # Filename Prep
    original_filename_sanitized = "".join(c if c.isalnum() or c in ['.', '_', '-'] else '_' for c in (file.filename or "unknown"))
    file_extension = os.path.splitext(original_filename_sanitized)[1]
    if file_extension.lower() != ".pdf":
        raise HTTPException(status_code=400, detail="Only PDF allowed.")

    unique_filename_stem = f"{current_user.id}_{uuid.uuid4()}"
    
    # --- S3 KEYS DEFINITION ---
    # Structure: user-book-files/books/{filename}.pdf
    s3_pdf_key = f"user-book-files/books/{unique_filename_stem}{file_extension}"
    s3_text_key = f"user-book-files/extracted-texts/{unique_filename_stem}.txt"

    # --- UPLOAD TO S3 ---
    try:
        # Reset file pointer just in case
        file.file.seek(0)
        # We need the file size. S3 upload_fileobj doesn't return it easily.
        # So we can read it to count bytes OR rely on Content-Length header.
        # Let's trust Content-Length or seek end for efficiency if needed. 
        # For safety, let's just upload.
        
        success = s3_client.upload_file_obj(file.file, s3_pdf_key)
        if not success:
             raise Exception("S3 Upload Failed")
             
        # Get size (optional, purely for metadata record)
        file_size_bytes = 0 
        # If you really need size, you can do: file.file.seek(0, 2); size = file.file.tell(); file.file.seek(0)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not save PDF: {str(e)}")
    finally:
        await file.close()

    # Create DB Entry
    book_meta = BookCreateInternal(
        title=title_from_user or file.filename or "Untitled",
        original_filename=file.filename,
        content_type=file.content_type,
        file_size_bytes=file_size_bytes, 
        user_id=current_user.id,
        stored_filename=s3_pdf_key, # Storing S3 Key here
        file_path_local=s3_pdf_key, # Repurposing this field for S3 Key
        extracted_text_path_local=s3_text_key, # Repurposing this field for S3 Key
        category_id=category_oid
    )
    
    book_doc_for_db = BookInDB(**book_meta.model_dump()).model_dump(by_alias=True)
    if "_id" not in book_doc_for_db: book_doc_for_db["_id"] = ObjectId()

    result = await db[BOOKS_COLLECTION].insert_one(book_doc_for_db)
    created_book_doc = await db[BOOKS_COLLECTION].find_one({"_id": result.inserted_id})
    
    if not created_book_doc:
         raise HTTPException(status_code=500, detail="Failed to create book record.")

    return BookInDB(**created_book_doc)


# --- RETRIEVAL FUNCTIONS ---

async def get_book_extracted_text(
    db: AsyncIOMotorDatabase, 
    book_id_str: str, 
    user_id: PyObjectId
) -> Optional[str]:
    book = await get_book_by_id_for_user(db, book_id_str, user_id)
    # Check if the path (S3 Key) exists in the object
    if book and book.extracted_text_path_local:
        # Download text directly to memory string
        content = s3_client.get_file_content(book.extracted_text_path_local)
        return content
    return None

async def delete_book_for_user(
    db: AsyncIOMotorDatabase, 
    book_id_str: str, 
    user_id: PyObjectId
) -> bool:
    book_to_delete = await get_book_by_id_for_user(db, book_id_str, user_id)
    if not book_to_delete: return False
    
    book_obj_id = book_to_delete.id

    # 1. Delete MongoDB Data
    await db[BOOK_TOPICS_COLLECTION].delete_many({"book_id": book_obj_id})
    await db[QUIZ_RESULTS_COLLECTION].delete_many({"book_id": book_obj_id})
    await db[GLOSSARY_TERMS_COLLECTION].delete_many({"book_id": book_obj_id})

    # 2. Delete S3 Files
    if book_to_delete.file_path_local:
        s3_client.delete_file(book_to_delete.file_path_local) # PDF
        
    if book_to_delete.extracted_text_path_local:
        s3_client.delete_file(book_to_delete.extracted_text_path_local) # TXT
        
    # Delete Vector Store (Folder structure simulation in S3)
    # user-book-files/vector-stores/{book_id}/index.faiss
    base_vector_key = f"user-book-files/vector-stores/{book_id_str}"
    s3_client.delete_file(f"{base_vector_key}/index.faiss")
    s3_client.delete_file(f"{base_vector_key}/index.pkl")

    # 3. Delete Book Record
    delete_result = await db[BOOKS_COLLECTION].delete_one(
        {"_id": book_obj_id, "user_id": user_id}
    )
    return delete_result.deleted_count == 1

# --- SEARCH FUNCTION (S3 AWARE) ---

async def search_book_pdf(
    db: AsyncIOMotorDatabase,
    book_id_str: str,
    query: str,
    user_id: PyObjectId
) -> List[dict]:
    # 1. Get S3 Key
    book = await get_book_by_id_for_user(db, book_id_str, user_id)
    if not book or not book.file_path_local: return []

    results = []
    query_lower = query.lower()

    # 2. Download PDF to Temp for Searching
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as temp_pdf:
        if not s3_client.download_file(book.file_path_local, temp_pdf.name):
            print("Error downloading PDF for search")
            return []

        try:
            doc = fitz.open(temp_pdf.name)
            for page_num, page in enumerate(doc):
                text = page.get_text()
                if not text: continue
                text_lower = text.lower()
                start_idx = 0
                
                # Simple linear search for query in text
                while True:
                    idx = text_lower.find(query_lower, start_idx)
                    if idx == -1: break
                    
                    snippet_start = max(0, idx - 40)
                    snippet_end = min(len(text), idx + len(query) + 40)
                    raw_snippet = text[snippet_start:snippet_end].replace('\n', ' ').strip()
                    
                    results.append({
                        "page_number": page_num + 1,
                        "snippet": "..." + raw_snippet + "..."
                    })
                    
                    if len(results) >= 50:
                        doc.close()
                        return results
                    
                    start_idx = idx + len(query)
            doc.close()
        except Exception as e:
            print(f"Error searching PDF: {e}")
            
    return results

# --- STANDARD CRUD (UNCHANGED) ---

async def update_book_category(db: AsyncIOMotorDatabase, book_id_str: str, new_category_id_str: Optional[str], user_id: PyObjectId) -> Optional[BookInDB]:
    # Logic remains exactly the same as before, just updating metadata
    book_to_update = await get_book_by_id_for_user(db, book_id_str, user_id)
    if not book_to_update: return None
    new_category_oid: Optional[PyObjectId] = None
    if new_category_id_str:
        cat = await category_service.get_category_by_id_for_user(db, new_category_id_str, user_id)
        if not cat: raise ValueError("Category not found")
        new_category_oid = cat.id
    
    await db[BOOKS_COLLECTION].update_one({"_id": book_to_update.id}, {"$set": {"category_id": new_category_oid}})
    doc = await db[BOOKS_COLLECTION].find_one({"_id": book_to_update.id})
    return BookInDB(**doc) if doc else None

async def get_user_books(db: AsyncIOMotorDatabase, user_id: PyObjectId) -> List[BookPublic]:
    cursor = db[BOOKS_COLLECTION].find({"user_id": user_id}).sort("upload_date", -1)
    return [BookPublic.from_db_model(BookInDB(**doc)) for doc in await cursor.to_list(None)]

async def get_book_by_id_for_user(db: AsyncIOMotorDatabase, book_id_str: str, user_id: PyObjectId) -> Optional[BookInDB]:
    try: book_oid = PyObjectId(book_id_str)
    except: return None
    doc = await db[BOOKS_COLLECTION].find_one({"_id": book_oid, "user_id": user_id})
    return BookInDB(**doc) if doc else None

async def get_glossary_for_page(db: AsyncIOMotorDatabase, book_id: PyObjectId, page_number: int) -> List[dict]:
    doc = await db[GLOSSARY_TERMS_COLLECTION].find_one({"book_id": book_id, "page_number": page_number})
    return doc["terms"] if doc else []

async def get_topics_for_book(db: AsyncIOMotorDatabase, book_id_str: str, user_id: PyObjectId) -> List[BookTopicPublic]:
    book = await get_book_by_id_for_user(db, book_id_str, user_id)
    if not book: raise HTTPException(status_code=404, detail="Book not found")
    cursor = db[BOOK_TOPICS_COLLECTION].find({"book_id": book.id}, projection={"content": 0}).sort("page_start", 1)
    return [BookTopicPublic(id=str(d["_id"]), book_id=str(d["book_id"]), topic_title=d["topic_title"], page_start=d["page_start"]) for d in await cursor.to_list(None)]

# --- RE-ADD HELPERS THAT DON'T NEED CHANGES ---
# The helpers _get_toc_from_metadata, _get_toc_from_regex, and _extract_text_between_anchors
# rely purely on the 'doc' object (fitz.Document) passed to them.
# Since we handle the 'doc' creation in the main functions now using temp files,
# you can copy-paste those 3 helper functions exactly as they were from your previous code
# to the bottom of this file. They do not need S3 modifications.

def _get_toc_from_metadata(doc: fitz.Document) -> List[dict]:
    # ... (Paste your original function here) ...
    raw_toc = doc.get_toc()
    if not raw_toc: return []
    topics = []
    for level, title, page_start in raw_toc:
        if level not in [1, 2]: continue
        cleaned = title.strip()
        if not cleaned: continue
        if TOPIC_START_REGEX.match(cleaned):
            topics.append({"title": cleaned, "page_start": page_start})
    return topics

def _get_toc_from_regex(doc: fitz.Document) -> List[dict]:
    """
    Manually scans the first 20 pages of the PDF, looking for
    lines that match our topic regex (e.g., "1. Topic" or "1.1. Subtopic").
    """
    topics = []
    found_toc_page = False
    
    # Only scan the first 20 pages (common for ToC)
    for page_num in range(min(doc.page_count, 20)):
        page = doc.load_page(page_num)
        text = page.get_text()
        
        # Look for the start of the ToC
        if not found_toc_page and ("contents" in text.lower() or "table of contents" in text.lower()):
            found_toc_page = True

        if not found_toc_page:
            continue # Keep searching

        for line in text.split('\n'):
            line = line.strip()
            # This regex check handles both "1. Title" and "1 Title"
            match = TOPIC_START_REGEX.match(line)
            
            if match:
                main_num = match.group(1)
                sub_num = match.group(2) or "" # Will be ".1" or empty string
                title_text = match.group(3)

                # Clean off dots and page numbers from the title
                clean_match = CLEAN_REGEX.match(title_text)
                if clean_match:
                    title_text = clean_match.group(1).strip()
                
                # We rebuild the title to ensure clean formatting
                # e.g., "1 Introduction", "1.1 Basics"
                full_title = f"{main_num}{sub_num} {title_text}"
                topics.append({"title": full_title, "page_start": page_num + 1})

        # If we found the ToC and now we see "Chapter 1", we're probably done
        if found_toc_page and ("chapter 1" in text.lower() or "introduction" in text.lower()):
            break
            
    return topics

def _extract_text_between_anchors(
    doc: fitz.Document, 
    start_anchor: str, 
    end_anchor: Optional[str], 
    start_page: int
) -> tuple[str, int, int]:
    """
    Precisely extracts text content between two topic titles (anchors).
    """
    
    # 1. Determine Page Range
    page_start_idx = max(0, start_page - 1) # Page numbers are 1-based
    page_end_idx = doc.page_count - 1 # Default to end of book
    
    if end_anchor:
        # Search for the end anchor *starting from the start page*
        for p_num in range(page_start_idx, doc.page_count):
            page_text = doc.load_page(p_num).get_text("text", sort=True) # Sort text for better anchor finding
            if end_anchor in page_text:
                page_end_idx = p_num
                break
    
    # 2. Extract All Text in that Page Range
    full_text_slice = []
    for p_num in range(page_start_idx, page_end_idx + 1):
        full_text_slice.append(doc.load_page(p_num).get_text("text", sort=True))
    full_text = "\n".join(full_text_slice)

    # 3. Find Anchors and Slice
    start_index = full_text.find(start_anchor)
    end_index = -1
    
    if end_anchor:
        # Find the end anchor *after* the start anchor
        end_index = full_text.find(end_anchor, start_index if start_index != -1 else 0) 

    if start_index == -1:
        # Fallback: Could not find exact anchor.
        # Try to find a "fuzzier" version (just the text, not the number)
        fuzzy_anchor = re.sub(r"^\s*(\d+(\.\d+)?)\.?\s*", "", start_anchor).strip()
        if fuzzy_anchor:
            start_index = full_text.find(fuzzy_anchor)
    
    if start_index == -1:
        # Still can't find it. Give up on this topic.
        return "", page_start_idx + 1, page_end_idx + 1

    # 4. Get final content
    topic_content = ""
    if end_index != -1 and end_index > start_index:
        # Slice from start anchor to end anchor
        topic_content = full_text[start_index : end_index].strip()
    else:
        # If no end anchor, take everything from the start anchor to the end
        topic_content = full_text[start_index :].strip()
        
    return topic_content, page_start_idx + 1, page_end_idx + 1