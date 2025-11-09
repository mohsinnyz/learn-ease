# backend/services/quiz_service.py

from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from models.quiz_schemas import QuizResultInDB
from models.ai_schemas import QuizEvaluationResponse

QUIZ_RESULTS_COLLECTION = "quiz_results"

async def create_quiz_result(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    book_id: ObjectId,
    topic_name: str,
    eval_response: QuizEvaluationResponse
) -> QuizResultInDB:
    """Saves a completed quiz evaluation to the database."""
    
    quiz_result_doc = QuizResultInDB(
        user_id=user_id,
        book_id=book_id,
        topic_name=topic_name,
        total_score=eval_response.total_score,
        total_grade=eval_response.total_grade,
        results=eval_response.results
    )

    # Convert to a dict for MongoDB insertion
    doc_to_insert = quiz_result_doc.model_dump(by_alias=True)
    
    await db[QUIZ_RESULTS_COLLECTION].insert_one(doc_to_insert)
    
    print(f"INFO: Saved quiz result for user {user_id} on book {book_id}")
    return quiz_result_doc