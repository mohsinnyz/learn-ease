#C:\Users\mohsi\Projects\learn-ease-fyp\backend\routers\book_router.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Path, Form
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Annotated, Optional
from pydantic import BaseModel
import os

from models.book_schemas import BookPublic, BookCategoryUpdate
from models.user_schemas import UserInDB # Or the precise type get_current_user returns
from services import book_service
from core.db import get_database
from core.security import get_current_user

router = APIRouter(
    prefix="/books", # Matches your frontend service's API_BASE_URL + /books
    tags=["Books"],
    dependencies=[Depends(get_current_user)] # Protect all routes
)

@router.post("/upload", response_model=BookPublic, status_code=status.HTTP_201_CREATED)
async def api_upload_book(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    file: UploadFile = File(..., description="The PDF book file to upload"),
    title: Optional[str] = Form(None, description="Optional title for the book"), # <<< NEW
    category_id: Optional[str] = Form(None, description="Optional category ID for the book") # <<< NEW
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")
    if not file.content_type == "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Only PDF files are allowed.")
    
    try:
        # Pass title and category_id to the service function
        book_db_obj = await book_service.process_and_save_book(
            db=db, 
            file=file, 
            current_user=current_user,
            title_from_user=title, # Pass the title
            category_id_str=category_id # Pass the category_id
        )
        return BookPublic.from_db_model(book_db_obj) # process_and_save_book should return BookInDB
    except HTTPException as e:
        raise e 
    except Exception as e:
        print(f"Unhandled error in /upload endpoint: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during book upload.")

# ... (api_list_user_books, api_get_book_details, api_serve_book_pdf, api_get_book_extracted_text endpoints) ...

# --- New Endpoint to Update a Book's Category ---
@router.put("/{book_id}/category", response_model=BookPublic)
async def api_update_book_category(
    book_id: Annotated[str, Path(description="The ID of the book to update")],
    book_category_update: BookCategoryUpdate, # Request body
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    """
    Update the category for a specific book.
    To make a book uncategorized, send `{"category_id": null}` in the request body.
    """
    try:
        updated_book_db = await book_service.update_book_category(
            db=db, 
            book_id_str=book_id, 
            new_category_id_str=book_category_update.category_id, 
            user_id=current_user.id
        )
        if not updated_book_db:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found or you do not have permission to update it.")
        return BookPublic.from_db_model(updated_book_db)
    except ValueError as ve: # Catch errors from service layer (e.g., invalid category_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        print(f"Error updating category for book {book_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update book category.")


@router.get("", response_model=List[BookPublic]) # GET /api/books
async def api_list_user_books(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    try:
        return await book_service.get_user_books(db=db, user_id=current_user.id)
    except Exception as e:
        print(f"Unhandled error in GET /api/books endpoint: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve books.")

@router.get("/{book_id}", response_model=BookPublic)
async def api_get_book_details(
    book_id: Annotated[str, Path(description="The ID of the book to retrieve")],
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    book_db = await book_service.get_book_by_id_for_user(db=db, book_id_str=book_id, user_id=current_user.id)
    if not book_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found or access denied.")
    return BookPublic.from_db_model(book_db)


@router.get("/{book_id}/pdf", response_class=FileResponse)
async def api_serve_book_pdf(
    book_id: Annotated[str, Path(description="The ID of the book PDF to retrieve")],
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    pdf_filepath = await book_service.get_book_pdf_filepath(db=db, book_id_str=book_id, user_id=current_user.id)
    if not pdf_filepath:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="PDF file not found or access denied.")
    
    # Extract filename for content disposition header
    filename = os.path.basename(pdf_filepath)
    
    return FileResponse(
        path=pdf_filepath, 
        media_type='application/pdf', 
        filename=filename # Suggests filename to browser, good for "Save As"
    )

# Model for returning text content
class BookTextContentResponse(BaseModel):
    id: str
    title: str
    content: str

@router.get("/{book_id}/extracted-text", response_model=BookTextContentResponse)
async def api_get_book_extracted_text(
    book_id: Annotated[str, Path(description="The ID of the book whose extracted text to retrieve")],
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    book_db = await book_service.get_book_by_id_for_user(db=db, book_id_str=book_id, user_id=current_user.id)
    if not book_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found or access denied.")

    extracted_text = await book_service.get_book_extracted_text(db=db, book_id_str=book_id, user_id=current_user.id)
    if extracted_text is None: # Could be None if file not found or error reading
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extracted text not found for this book.")
        
    return BookTextContentResponse(
        id=str(book_db.id),
        title=book_db.title,
        content=extracted_text
    )