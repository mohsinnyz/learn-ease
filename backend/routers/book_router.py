from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Annotated

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