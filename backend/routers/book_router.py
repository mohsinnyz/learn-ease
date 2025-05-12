from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Path
from fastapi.responses import FileResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Annotated
from pydantic import BaseModel
import os

from models.book_schemas import BookPublic, PyObjectId
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
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")
    # Basic check, can be more robust (e.g. checking magic numbers)
    if not file.content_type == "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Only PDF files are allowed.")
    
    try:
        return await book_service.process_and_save_book(db=db, file=file, current_user=current_user)
    except HTTPException as e:
        raise e # Re-raise HTTPExceptions from the service layer
    except Exception as e:
        # Log the error for server-side debugging
        print(f"Unhandled error in /upload endpoint: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during book upload.")


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