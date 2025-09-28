#learn-ease-fyp\backend\routers\book_router.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Path, Form, BackgroundTasks # <<< 1. IMPORT
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Annotated, Optional
from pydantic import BaseModel
import os

from models.book_schemas import BookPublic, BookCategoryUpdate
from models.user_schemas import UserInDB
from services import book_service
from core.db import get_database
from core.security import get_current_user
from models.ai_schemas import GlossaryTerm 
from typing import List 

router = APIRouter(
    prefix="/books",
    tags=["Books"],
    dependencies=[Depends(get_current_user)]
)

@router.post("/upload", response_model=BookPublic, status_code=status.HTTP_202_ACCEPTED) # <<< 4. STATUS CODE
async def api_upload_book(
    background_tasks: BackgroundTasks, # <<< 2. INJECT DEPENDENCY
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
    file: UploadFile = File(..., description="The PDF book file to upload"),
    title: Optional[str] = Form(None, description="Optional title for the book"),
    category_id: Optional[str] = Form(None, description="Optional category ID for the book")
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No filename provided.")
    if not file.content_type == "application/pdf" and not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid file type. Only PDF files are allowed.")
    
    try:
        # This service function now only does the fast part: saves the file and
        # creates the initial DB record with status="processing".
        book_db_obj = await book_service.process_and_save_book(
            db=db, 
            file=file, 
            current_user=current_user,
            title_from_user=title,
            category_id_str=category_id
        )

        # <<< 3. ADD THE BACKGROUND TASK >>>
        # Schedule the heavy processing to run after the response is sent.
        background_tasks.add_task(
            book_service.process_book_in_background,
            db=db,
            book_id=book_db_obj.id,
            pdf_path=book_db_obj.file_path_local,
            text_save_path=book_db_obj.extracted_text_path_local
        )

        # Immediately return the initial book object with status="processing"
        return BookPublic.from_db_model(book_db_obj)
    
    except HTTPException as e:
        raise e 
    except Exception as e:
        print(f"Unhandled error in /upload endpoint: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred during book upload.")

# ... (the rest of your router file remains exactly the same) ...
@router.put("/{book_id}/category", response_model=BookPublic)
async def api_update_book_category(
    book_id: Annotated[str, Path(description="The ID of the book to update")],
    book_category_update: BookCategoryUpdate,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
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
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        print(f"Error updating category for book {book_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update book category.")


@router.get("", response_model=List[BookPublic])
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
    
    filename = os.path.basename(pdf_filepath)
    
    return FileResponse(
        path=pdf_filepath, 
        media_type='application/pdf', 
        filename=filename
    )

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
    if extracted_text is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extracted text not found for this book.")
        
    return BookTextContentResponse(
        id=str(book_db.id),
        title=book_db.title,
        content=extracted_text
    )
    
@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def api_delete_book(
    book_id: Annotated[str, Path(description="The ID of the book to delete")],
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    try:
        success = await book_service.delete_book_for_user(
            db=db, book_id_str=book_id, user_id=current_user.id
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Book not found or you do not have permission to delete it."
            )
        return None 
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"ERROR: /books/{book_id} DELETE endpoint - Unexpected error: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while trying to delete the book."
        )
    
@router.get("/{book_id}/glossary/{page_number}", response_model=List[GlossaryTerm])
async def api_get_glossary_for_page(
    book_id: Annotated[str, Path(description="The ID of the book")],
    page_number: Annotated[int, Path(description="The page number to get the glossary for")],
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    """
    Retrieves the glossary terms for a specific page of a book.
    """
    # 1. First, verify the user has access to this book
    book_db = await book_service.get_book_by_id_for_user(
        db=db, book_id_str=book_id, user_id=current_user.id
    )
    if not book_db:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found or access denied.")

    # 2. If access is verified, fetch the glossary terms
    terms = await book_service.get_glossary_for_page(
        db=db, book_id=book_db.id, page_number=page_number
    )
    return terms