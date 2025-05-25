# learn-ease-fyp/backend/routers/ai_router.py
#C:\Users\mohsi\Projects\learn-ease-fyp\backend\routers\ai_router.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated

from models.ai_schemas import (
    TextForSummarization,
    SummarizationResponse,
    TextForFlashcards,
    FlashcardsResponse,
    TextForStudyNotes,
    StudyNotesResponse
)
from services import ai_service
from core.security import get_current_user
from models.user_schemas import UserInDB # Or your specific user model returned by get_current_user

router = APIRouter(
    prefix="/ai", # Consistent with frontend service call
    tags=["AI Features"],
    dependencies=[Depends(get_current_user)] # Protect these routes
)

@router.post("/summarize-text", response_model=SummarizationResponse)
async def http_summarize_text(
    request_data: TextForSummarization,
    # current_user: Annotated[UserInDB, Depends(get_current_user)] # To ensure endpoint is protected
):
    if not ai_service.model or not ai_service.tokenizer: # Check if model loaded
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Summarization service is currently unavailable. Model not loaded."
        )
    try:
        summary = await ai_service.generate_summary(request_data.text_to_summarize)
        return SummarizationResponse(summary=summary)
    except Exception as e:
        print(f"Error in /summarize-text endpoint: {e}") # Log the error on backend
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}" # Send a generic or specific error
        )

@router.post("/generate-flashcards", response_model=FlashcardsResponse)
async def http_generate_flashcards(
    request_data: TextForFlashcards,
):
    try:
        flashcards_list = await ai_service.generate_flashcards_from_text(request_data.text_to_generate_from)
        return FlashcardsResponse(flashcards=flashcards_list)
    except HTTPException as he: 
        raise he
    except Exception as e:
        print(f"ERROR: /generate-flashcards endpoint - Unexpected error: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating flashcards. Please try again later."
        )

@router.post("/generate-study-notes", response_model=StudyNotesResponse)
async def http_generate_study_notes(
    request_data: TextForStudyNotes,
):
    try:
        notes_content = await ai_service.generate_study_notes_from_text(request_data.text_to_generate_notes_from)
        return StudyNotesResponse(study_notes=notes_content)
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"ERROR: /generate-study-notes endpoint - Unexpected error: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating study notes."
        )