# learn-ease-fyp/backend/routers/ai_router.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict

# --- MODIFICATION: ADDED IMPORTS FOR DB AND USER DEPENDENCIES ---
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.db import get_database

from models.ai_schemas import (
    TextForSummarization,
    SummarizationResponse,
    TextForFlashcards,
    FlashcardsResponse,
    TextForStudyNotes,
    StudyNotesResponse,
    TextForQuestionAnswer,
    QuestionAnswerResponse,
    QuizGenerationRequest, 
    GeneratedQuiz, 
    QuizEvaluationRequest, 
    QuizEvaluationResponse,
    GlossaryTerm
)
from services import ai_service
from core.security import get_current_user
from models.user_schemas import UserInDB 

# --- Temp storage for Quizzes ---
temp_quiz_storage: Dict[str, GeneratedQuiz] = {}

router = APIRouter(
    prefix="/ai", 
    tags=["AI Features"],
    dependencies=[Depends(get_current_user)] 
)

# =========================================================================
# --- EXISTING ROUTES (Summarization, Flashcards, Study Notes, Q&A) ---
# =========================================================================

@router.post("/summarize-text", response_model=SummarizationResponse)
async def http_summarize_text(
    request_data: TextForSummarization,
):
    if not ai_service.model_summarize or not ai_service.tokenizer_summarize: 
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Summarization service is currently unavailable. Model not loaded."
        )
    try:
        summary = await ai_service.generate_summary(request_data.text_to_summarize)
        return SummarizationResponse(summary=summary)
    except Exception as e:
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
        print(f"ERROR: /generate-study-notes endpoint - Unexpected error: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating study notes."
            )

@router.post("/generate-qna", response_model=QuestionAnswerResponse)
async def http_generate_question_answers(
    request_data: TextForQuestionAnswer,
):
    """
    Receives text input and generates question and answer pairs.
    """
    try:
        qna_pairs_list = await ai_service.generate_qna_from_text(request_data.text_to_generate_from)
        return QuestionAnswerResponse(qna_pairs=qna_pairs_list)
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"ERROR: /generate-qna endpoint - Unexpected error: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating questions and answers."
        )

# =========================================================================
# --- NEW ROUTES FOR QUIZ GENERATION AND EVALUATION (Module 4) ---
# =========================================================================

@router.post("/quiz/generate", response_model=GeneratedQuiz)
async def http_generate_quiz(request: QuizGenerationRequest):
    """
    Generates the quiz and stores it temporarily for later evaluation.
    """
    print(f"INFO: API - Received quiz generation request.")
    try:
        generated_quiz = await ai_service.generate_quiz_from_text(request)
        
        global temp_quiz_storage
        temp_quiz_storage[generated_quiz.quiz_id] = generated_quiz
        
        print(f"INFO: API - Quiz generated and stored with ID: {generated_quiz.quiz_id}")
        return generated_quiz
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR: API (/ai/quiz/generate) - Unexpected error: {type(e).__name__} - {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate quiz: {str(e)}")


@router.post("/quiz/evaluate", response_model=QuizEvaluationResponse)
async def http_evaluate_quiz(
    request: QuizEvaluationRequest,
    # --- MODIFICATION: ADDED DEPENDENCIES FOR DB AND USER INFO ---
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Evaluates the user's attempt and saves the result to the database.
    """
    global temp_quiz_storage
    
    quiz_id = request.quiz_id
    if quiz_id not in temp_quiz_storage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Quiz session with ID '{quiz_id}' not found or has expired. Please generate a new quiz."
        )

    generated_quiz = temp_quiz_storage[quiz_id]

    try:
        # --- MODIFICATION: PASS DB AND USER_ID TO THE SERVICE LAYER ---
        evaluation_result = await ai_service.evaluate_quiz_attempt(
            request=request, 
            generated_quiz=generated_quiz,
            db=db,
            user_id=current_user.id
        )

        del temp_quiz_storage[quiz_id]
        print(f"INFO: API - Quiz ID {quiz_id} evaluated and removed from temporary storage.")
        
        return evaluation_result
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"ERROR: API (/ai/quiz/evaluate) - Unexpected error: {type(e).__name__} - {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to evaluate quiz: {str(e)}")