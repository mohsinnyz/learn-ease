# learn-ease-fyp/backend/routers/ai_router.py
#C:\Users\mohsi\Projects\learn-ease-fyp\backend\routers\ai_router.py

from fastapi import APIRouter, Depends, HTTPException, status
# from typing import Annotated # Not used if current_user is only in router dependencies

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
from models.user_schemas import UserInDB 

router = APIRouter(
    prefix="/ai", 
    tags=["AI Features"],
    dependencies=[Depends(get_current_user)] 
)

@router.post("/summarize-text", response_model=SummarizationResponse)
async def http_summarize_text(
    request_data: TextForSummarization,
):
    # This line should use the corrected variable names
    if not ai_service.model_summarize or not ai_service.tokenizer_summarize: 
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Summarization service is currently unavailable. Model not loaded."
        )
    try:
        summary = await ai_service.generate_summary(request_data.text_to_summarize)
        return SummarizationResponse(summary=summary)
    except Exception as e:
        # If ai_service was not imported correctly, it would be an issue here too,
        # but the primary error (AttributeError) happens before this block is entered.
        # The NameError you're seeing now within this block means the AttributeError
        # is still the first problem, and then this logging line also fails.
        print(f"Error in /summarize-text endpoint: {e}") 
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate summary: {str(e)}" 
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

# --- New Endpoint for Study Notes Generation ---
@router.post("/generate-study-notes", response_model=StudyNotesResponse)
async def http_generate_study_notes(
    request_data: TextForStudyNotes,
):
    """
    Receives text input and generates structured study notes using the AI service.
    """
    try:
        notes_content = await ai_service.generate_study_notes_from_text(request_data.text_to_generate_notes_from)
        return StudyNotesResponse(study_notes=notes_content)
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"ERROR: /generate-study-notes endpoint - Unexpected error: {type(e)._name_} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating study notes."
            )