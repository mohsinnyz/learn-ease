# learn-ease-fyp/backend/services/ai_service.py

from transformers import T5ForConditionalGeneration, T5Tokenizer
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch 
import json
import os
import re
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status 
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from . import vector_service
from sentence_transformers import SentenceTransformer
import numpy as np
from scipy.spatial.distance import cosine
import spacy
import nltk
from nltk.corpus import wordnet
import json
import google.generativeai as genai

# --- Google Gemini API ---
import google.generativeai as genai

# --- MODIFICATION: ADDED IMPORTS FOR DB STORAGE ---
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from . import quiz_service

# Import ALL relevant schemas
from models.ai_schemas import (
    QuestionAnswerPair, GlossaryTerm,
    QuizGenerationRequest, GeneratedQuiz, QuizQuestion, 
    QuizEvaluationRequest, QuizEvaluationResponse, EvaluatedQuestionResult,
    ChatRequest, ChatResponse
)
from models.book_schemas import BookTopicInDB # <<< IMPORT FOR TOPICS

# Load configurations from environment variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-pro") 
BOOK_TOPICS_COLLECTION = "book_topics" # <<< COLLECTION NAME

# --- New Configuration for Embeddings (Required for Evaluation) ---
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2") 

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    print("WARNING: GOOGLE_API_KEY not found in environment. AI generation features will be limited.")


# =========================================================================
# --- EMBEDDING MODEL (For Quiz Evaluation - Module 4) ---
# =========================================================================
embedding_model: Optional[SentenceTransformer] = None

def load_embedding_model():
    """Loads the Sentence Transformer model for generating vector embeddings."""
    global embedding_model
    try:
        print(f"INFO: AI Service - Loading embedding model '{EMBEDDING_MODEL_NAME}'...")
        embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        print(f"INFO: AI Service - Embedding model '{EMBEDDING_MODEL_NAME}' loaded successfully.")
    except Exception as e:
        print(f"ERROR: AI Service - Failed to load embedding model '{EMBEDDING_MODEL_NAME}': {e}")
        embedding_model = None

if embedding_model is None:
    load_embedding_model()

def get_sentence_embedding(text: str) -> np.ndarray:
    """Generates the vector embedding for a given text."""
    if not embedding_model:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding model is not available for evaluation."
        )
    clean_text = str(text).strip() or " "
    return embedding_model.encode(clean_text, convert_to_numpy=True)

# =========================================================================
# --- CORE QUIZ GENERATION (Module 4) ---
# =========================================================================

async def _call_gemini_for_quiz_json(prompt: str) -> List[Dict[str, str]]:
    """Helper function to call Gemini API to generate the quiz JSON."""
    if not GOOGLE_API_KEY or not GEMINI_MODEL_NAME:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API is not configured (API Key or Model Name missing)."
        )

    try:
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        generation_config = genai.types.GenerationConfig(
            temperature=0.7,
            max_output_tokens=3072
        )
        response = gemini_model.generate_content(prompt, generation_config=generation_config)

        if not response.parts:
            print(f"ERROR: AI Service (Quiz Generation) - Gemini API response has no parts.")
            return []

        raw_generated_text = response.text.strip()
        
        cleaned_text = raw_generated_text
        # Robust JSON cleaning: remove markdown code blocks
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[len("```json"):]
        elif cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[len("```"):]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-len("```")]
        cleaned_text = cleaned_text.strip()
        
        # Find the array bounds [..] for robust parsing
        json_start_index = cleaned_text.find('[')
        json_end_index = cleaned_text.rfind(']')

        if json_start_index != -1 and json_end_index != -1 and json_end_index > json_start_index:
            json_string_to_parse = cleaned_text[json_start_index : json_end_index+1]
        else:
            json_string_to_parse = cleaned_text
        
        parsed_data = json.loads(json_string_to_parse)

        if not isinstance(parsed_data, list):
            raise ValueError("Parsed data is not a list.")
            
        return parsed_data

    except json.JSONDecodeError as e:
        print(f"ERROR: AI Service (Quiz Generation) - Failed to decode JSON. Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse quiz data from Gemini API (JSONDecodeError)."
        )
    except Exception as e:
        print(f"ERROR: AI Service (Quiz Generation) - Unexpected error: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred during quiz generation: {str(e)}"
        )

# --- (MODIFIED) Function signature and logic updated ---
async def generate_quiz_from_text(
    request: QuizGenerationRequest,
    db: AsyncIOMotorDatabase,
    user_id: ObjectId
) -> GeneratedQuiz:
    """
    Generates a quiz from a specific topic_id, verifying user access.
    """
    
    # 1. Fetch the topic content securely
    try:
        topic_oid = ObjectId(request.topic_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Topic ID format."
        )

    topic_doc = await db[BOOK_TOPICS_COLLECTION].find_one({"_id": topic_oid})
    if not topic_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found."
        )
    
    topic = BookTopicInDB(**topic_doc)

    # 2. Verify user ownership by checking the parent book
    book_doc = await db["books"].find_one(
        {"_id": topic.book_id, "user_id": user_id}
    )
    if not book_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book for this topic not found or access denied."
        )

    # 3. Get the content and validate length
    topic_content = topic.content
    if not topic_content or len(topic_content.strip()) < 100: # 100 is min_length from old schema
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected topic content is too short to generate a quiz."
        )

    # 4. Proceed with quiz generation using the fetched content
    num_questions = request.num_questions
    
    prompt = f"""You are an expert educational assistant creating a study quiz.
Generate EXACTLY {num_questions} unique question-answer pairs based ONLY on the following content.

### Instructions:
1. **Question Goal:** Your primary goal is to create questions that test **conceptual understanding**, not simple fact memorization. Questions should require the user to explain **'why'** or **'how'** something works, **compare/contrast** concepts, or state the **implications** of a fact.
* **AVOID:** Simple questions like "What is X?" or "List the two types of Y."
* **PREFER:** Analytical questions like "How does X differ from Y?" or "What is the main advantage of using X?"
2.  **Correct Answer:** Must be a **complete but concise sentence** that fully answers the question. For example, instead of just 'Routers,' the answer should be 'The nodes in a graph represent routers.' This creates a fair target for vector comparison.
3.  **Acceptable Answer Variants:** Provide a JSON array of 2-3 alternative, concise phrases or keywords that are also correct. These will be used to evaluate differently phrased user answers. For example, if the main answer is 'A logically centralized controller,' a variant could be 'An SDN controller.'
4.  **Explanation:** Must be a brief, one-sentence explanation providing context or detail for the correct answer.
5.  **Format:** Output STRICTLY as a JSON array of objects. Do NOT include any code block syntax (e.g., ```json) or any introductory/explanatory text outside the array.

### JSON Structure:
[
  {{
    "question_text": "...",
    "correct_answer": "...",
    "answer_variants": ["...", "..."],
    "explanation": "..."
  }},
  ... ({num_questions} items)
]

### Content to use:
---
{topic_content} 
---
"""
    raw_quiz_data = await _call_gemini_for_quiz_json(prompt)
    
    questions: List[QuizQuestion] = []
    for item in raw_quiz_data:
        try:
            questions.append(QuizQuestion(
                question_text=item['question_text'],
                correct_answer=item['correct_answer'],
                answer_variants=item['answer_variants'],
                explanation=item['explanation']
            ))
        except (KeyError, ValueError) as e:
            print(f"WARN: Quiz Generation - Skipping invalid question item: {item}. Error: {e}")
            
    if not questions:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="AI failed to generate any valid quiz questions.")

    import uuid
    quiz_id = str(uuid.uuid4())
    
    return GeneratedQuiz(quiz_id=quiz_id, questions=questions)
# --- End of modification ---


# backend/services/ai_service.py

# =========================================================================
# --- CORE QUIZ EVALUATION (Module 4) ---
# =========================================================================

async def evaluate_quiz_attempt(
    request: QuizEvaluationRequest,
    generated_quiz: GeneratedQuiz,
    db: AsyncIOMotorDatabase,  # For DB storage
    user_id: ObjectId  # For DB storage
) -> QuizEvaluationResponse:
    """
    Evaluates the user's short-answer quiz attempt using cosine similarity of embeddings
    and saves the result to the DB, providing the explanation.
    """
    if not embedding_model:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Evaluation service is unavailable (Embedding model not loaded)."
        )

    # 1. Map generated quiz questions for easy lookup by question text
    quiz_map = {q.question_text: q for q in generated_quiz.questions}
    
    total_similarity_score = 0.0
    results: List[EvaluatedQuestionResult] = []
    num_evaluated_questions = 0

    # 2. Process each user answer
    for user_attempt in request.attempted_answers:
        question_text = user_attempt.question_text
        user_answer = user_attempt.user_answer.strip()
        
        if question_text not in quiz_map:
            print(f"WARN: Evaluation - Skipping answer for unknown question: {question_text}")
            continue

        ai_question = quiz_map[question_text]
        correct_answer = ai_question.correct_answer.strip()
        correct_explanation = ai_question.explanation.strip() # Get the explanation!
        
        similarity_score = 0.0
        
        # --- INTEGRATED LOGIC TO CHECK ALL ANSWER VARIANTS ---
        try:
            # 3. Get user answer embedding once
            user_embedding = get_sentence_embedding(user_answer)

            # Create a list of all possible correct answers
            all_correct_answers = [correct_answer] + ai_question.answer_variants
            
            highest_score = 0.0
            
            # 4. Loop through all correct answers and find the best match
            for answer_text in all_correct_answers:
                if user_answer and answer_text:
                    correct_embedding = get_sentence_embedding(answer_text.strip())
                    cos_distance = cosine(user_embedding, correct_embedding)
                    current_score = 1.0 - cos_distance
                    
                    if current_score > highest_score:
                        highest_score = current_score
            
            similarity_score = highest_score
            # Clamp score between 0.0 and 1.0
            similarity_score = max(0.0, min(1.0, similarity_score))

        except Exception as e:
            print(f"ERROR: Evaluation - Failed to calculate similarity for question '{question_text}': {e}")
            similarity_score = 0.0
            
        total_similarity_score += similarity_score
        num_evaluated_questions += 1
        
        # 5. Compile result
        results.append(EvaluatedQuestionResult(
            question_text=question_text,
            user_answer=user_answer,
            correct_answer=correct_answer,
            correct_explanation=correct_explanation, # <-- INCLUDED FOR FE-3
            similarity_score=round(similarity_score, 4), 
        ))

    # 6. Final Evaluation (Total Score)
    if num_evaluated_questions == 0:
        avg_score = 0.0
    else:
        # Sum of similarity scores divided by number of questions
        avg_score = total_similarity_score / num_evaluated_questions 
    
    # 7. Determine Grade (Using your updated, more lenient scale)
    def get_grade(score: float) -> str:
        if score >= 0.75: return "Excellent (A+)"
        if score >= 0.70: return "Very Good (A)"
        if score >= 0.60: return "Good (B+)"
        if score >= 0.50: return "Fair (B)"
        if score >= 0.40: return "Average (C+)"
        if score >= 0.35: return "Needs Improvement (C)"
        return "Poor (D)"

    final_response = QuizEvaluationResponse(
        quiz_id=request.quiz_id,
        total_score=round(avg_score, 4),
        total_grade=get_grade(avg_score),
        results=results
    )

    # 8. Save result to DB
    try:
        await quiz_service.create_quiz_result(
            db=db,
            user_id=user_id,
            book_id=ObjectId(request.book_id),
            topic_name=request.topic_name,
            eval_response=final_response
        )
        print(f"INFO: Quiz result saved to DB for user {user_id}.")
    except Exception as e:
        # Log the error but don't fail the request.
        print(f"ERROR: Failed to save quiz result to DB for user {user_id}. Error: {e}")

    return final_response

# =========================================================================
# --- EXISTING / OTHER AI MODULES (Unchanged) ---
# =========================================================================

# --- Summarization Model (existing) ---
MODEL_NAME_SUMMARIZE = "mohsinnyz/Booksum-Edu"
tokenizer_summarize: Any = None 
model_summarize: Any = None 
device_summarize: Any = None 

def load_summarization_model():
    global tokenizer_summarize, model_summarize, device_summarize
    try:
        print(f"INFO: AI Service - Initializing and loading tokenizer for {MODEL_NAME_SUMMARIZE}...")
        tokenizer_summarize = T5Tokenizer.from_pretrained(MODEL_NAME_SUMMARIZE)
        print(f"INFO: AI Service - Tokenizer for {MODEL_NAME_SUMMARIZE} loaded.")

        print(f"INFO: AI Service - Initializing and loading model {MODEL_NAME_SUMMARIZE}...")
        model_summarize = T5ForConditionalGeneration.from_pretrained(MODEL_NAME_SUMMARIZE)
        print(f"INFO: AI Service - Model {MODEL_NAME_SUMMARIZE} loaded.")

        device_summarize = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model_summarize.to(device_summarize)
        print(f"INFO: AI Service - Summarization model moved to {device_summarize}.")

    except Exception as e:
        print(f"ERROR: AI Service - Failed to load summarization model or tokenizer '{MODEL_NAME_SUMMARIZE}': {e}")
        tokenizer_summarize = None
        model_summarize = None

if model_summarize is None:
    load_summarization_model()

async def generate_summary(text_to_summarize: str) -> str:
    if not model_summarize or not tokenizer_summarize:
        print("ERROR: AI Service (generate_summary) - Summarization model/tokenizer is not available.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Summarization service is currently unavailable (model not loaded)."
        )

    if not text_to_summarize or len(text_to_summarize.strip()) < 20:
        return "Input text is too short to summarize effectively."

    try:
        input_text_with_prefix = "summarize: " + text_to_summarize
        inputs = tokenizer_summarize.encode(
            input_text_with_prefix,
            return_tensors='pt',
            max_length=512,
            truncation=True,
            padding='max_length'
        ).to(device_summarize)

        summary_ids = model_summarize.generate(
            inputs,
            num_beams=4,
            max_length=150,
            min_length=30,
            length_penalty=2.0,
            early_stopping=True
        )
        summary = tokenizer_summarize.decode(summary_ids[0], skip_special_tokens=True)
        return summary
    except Exception as e:
        print(f"ERROR: AI Service - Error during summarization with model {MODEL_NAME_SUMMARIZE}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating summary: {str(e)}"
        )

# --- Question Generation Model (Fine-tuned Hugging Face - mohsinnyz/Flan-SQuAD) ---
MODEL_NAME_QNA_QUESTIONS = "mohsinnyz/Flan-SQuAD"
tokenizer_qna_questions: Any = None
model_qna_questions: Any = None
device_qna_questions: Any = None

def load_qna_question_model():
    global tokenizer_qna_questions, model_qna_questions, device_qna_questions
    try:
        print(f"INFO: AI Service - Loading Q&A Question model '{MODEL_NAME_QNA_QUESTIONS}'...")
        tokenizer_qna_questions = AutoTokenizer.from_pretrained(MODEL_NAME_QNA_QUESTIONS)
        model_qna_questions = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME_QNA_QUESTIONS)
        device_qna_questions = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model_qna_questions.to(device_qna_questions)
        print(f"INFO: AI Service - Q&A Question model '{MODEL_NAME_QNA_QUESTIONS}' loaded successfully on {device_qna_questions}.")
    except Exception as e:
        print(f"ERROR: AI Service - Failed to load Q&A Question model '{MODEL_NAME_QNA_QUESTIONS}': {e}")
        tokenizer_qna_questions = None
        model_qna_questions = None
        device_qna_questions = None

if model_qna_questions is None: 
    load_qna_question_model()

async def _generate_questions_from_hf_model(text_content: str, num_questions: int = 5) -> List[str]:
    if not model_qna_questions or not tokenizer_qna_questions:
        print("ERROR: AI Service (_generate_questions_from_hf_model) - Q&A Question model/tokenizer is not available.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Question generation service is currently unavailable (HF model not loaded)."
        )

    print(f"INFO: AI Service - Generating questions using Hugging Face model '{MODEL_NAME_QNA_QUESTIONS}'.")
    
    passage_for_prompt = text_content

    question_format_lines = "\n".join([f"{i+1}. <question>?" for i in range(min(num_questions, 5))])

    prompt = f"""
Generate exactly only {min(num_questions, 5)} distinct and clear questions based ONLY on the passage below.
Format strictly as a numbered list like this:

{question_format_lines}

Do NOT generate answers or any extra text.

Passage:
\"\"\"{passage_for_prompt}\"\"\"
"""
    try:
        inputs = tokenizer_qna_questions(prompt, return_tensors="pt", truncation=True, max_length=1024).to(device_qna_questions)

        outputs = model_qna_questions.generate(
            inputs.input_ids,
            attention_mask=inputs.attention_mask,
            max_new_tokens=256,
            do_sample=True,
            temperature=0.7,
            top_k=50,
            top_p=0.95,
            repetition_penalty=1.1,
            num_return_sequences=1,
        )

        generated_text = tokenizer_qna_questions.decode(outputs[0], skip_special_tokens=True)
        
        print(f"DEBUG: AI Service (_generate_questions_from_hf_model) - Raw Output from HF Q&A Model: {generated_text}")

        questions = re.findall(r"\d+\.\s*(.+?\?)", generated_text)

        seen = set()
        unique_questions = []
        for q_text in questions:
            q_clean = q_text.strip()
            if q_clean not in seen:
                seen.add(q_clean)
                unique_questions.append(q_clean)
        
        print(f"DEBUG: AI Service (_generate_questions_from_hf_model) - Extracted {len(unique_questions)} unique questions.")
        return unique_questions[:num_questions]

    except Exception as e:
        print(f"ERROR: AI Service - Error during question generation with model {MODEL_NAME_QNA_QUESTIONS}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating questions from HF model: {str(e)}"
        )

async def _generate_answer_with_gemini(question: str, context_text: str) -> str:
    if not GOOGLE_API_KEY or not GEMINI_MODEL_NAME:
        print("ERROR: AI Service (_generate_answer_with_gemini) - API Key or Model Name is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Answer generation service is not configured (API Key or Model Name missing)."
        )

    prompt = f"""Given the following context text and a question, provide a concise and accurate answer based *only* on the information available in the context.

Context:
---
{context_text}
---

Question: {question}

Answer:"""

    try:
        print(f"INFO: AI Service (_generate_answer_with_gemini) - Calling Gemini API ({GEMINI_MODEL_NAME}) for answer.")
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        generation_config = genai.types.GenerationConfig(
            temperature=0.3, 
            max_output_tokens=256 
        )

        response = gemini_model.generate_content(prompt, generation_config=generation_config)

        if not response.parts:
            print(f"ERROR: AI Service (_generate_answer_with_gemini) - Gemini API response has no parts. Full response: {response}")
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Gemini API call for answer blocked: {response.prompt_feedback.block_reason_message}"
                )
            return "The AI could not generate an answer (empty response parts from Gemini)."

        answer_text = response.text.strip()
        if not answer_text:
            return "The AI could not formulate an answer based on the provided context (empty text from Gemini)."
        return answer_text

    except HTTPException as he: 
        raise he
    except Exception as e:
        print(f"ERROR: AI Service (_generate_answer_with_gemini) - Error during Gemini API call: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while generating an answer with Gemini: {str(e)}"
        )

async def generate_qna_from_text(text_to_generate_from: str) -> List[QuestionAnswerPair]:
    if not text_to_generate_from or len(text_to_generate_from.strip()) < 20:
        print("WARN: AI Service (Q&A) - Input text for Q&A is too short.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Input text too short for Q&A generation.")

    try:
        generated_questions = await _generate_questions_from_hf_model(text_to_generate_from, num_questions=5) 

        if not generated_questions:
            print("INFO: AI Service (Q&A) - No questions were generated by the HF model.")
            return []

        qna_pairs: List[QuestionAnswerPair] = []
        for question_text in generated_questions:
            answer_text = await _generate_answer_with_gemini(question_text, text_to_generate_from)
            qna_pairs.append(QuestionAnswerPair(question=question_text, answer=answer_text))
        
        if not qna_pairs and generated_questions: 
            print("WARN: AI Service (Q&A) - Questions were generated, but no Q&A pairs were formed (all answers might have been empty).")
        
        return qna_pairs

    except HTTPException as he: 
        raise he
    except Exception as e:
        print(f"ERROR: AI Service (generate_qna_from_text) - Unexpected error: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during Q&A generation."
        )
    
# --- Helper function to call Gemini API and parse JSON list output (for Flashcards) ---
async def _call_gemini_for_json_list(prompt: str, error_context: str) -> List[Dict[str, str]]:
    if not GOOGLE_API_KEY or not GEMINI_MODEL_NAME:
        print(f"ERROR: AI Service ({error_context}) - API Key or Model Name is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{error_context} service is not configured (API Key or Model Name missing)."
        )

    raw_generated_text = ""
    parsed_data: List[Dict[str,str]] = [] 
    json_string_to_parse = "" # Initialize for logging in case of error

    try:
        print(f"INFO: AI Service ({error_context}) - Calling Gemini API ({GEMINI_MODEL_NAME}).")
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        generation_config = genai.types.GenerationConfig(
            temperature=0.2,
            max_output_tokens=1024
        )

        response = gemini_model.generate_content(prompt, generation_config=generation_config)

        if not response.parts:
            print(f"ERROR: AI Service ({error_context}) - Gemini API response has no parts. Full response: {response}")
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                    detail=f"Gemini API call blocked for {error_context}: {response.prompt_feedback.block_reason_message}"
                )
            return []

        raw_generated_text = response.text.strip()
        cleaned_text = raw_generated_text
        
        # Robust JSON cleaning
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[len("```json"):]
        elif cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[len("```"):]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-len("```")]

        cleaned_text = cleaned_text.strip()

        if not cleaned_text:
            print(f"ERROR: AI Service ({error_context}) - Content became empty after cleaning attempts.")
            return []

        # Find the array bounds [..] for robust parsing
        json_string_to_parse = cleaned_text 
        json_start_index = cleaned_text.find('[')
        json_end_index = cleaned_text.rfind(']')

        if json_start_index != -1 and json_end_index != -1 and json_end_index > json_start_index:
            json_string_to_parse = cleaned_text[json_start_index : json_end_index+1]
        
        parsed_data = json.loads(json_string_to_parse)

        if not isinstance(parsed_data, list):
            raise ValueError("Parsed data is not a list.")

        validated_items: List[Dict[str,str]] = []
        for item in parsed_data: # Validation specific to flashcards
            if isinstance(item, dict) and "front" in item and "back" in item: 
                validated_items.append({"front": str(item["front"]), "back": str(item["back"])})
            else:
                print(f"WARN: AI Service ({error_context}) - Skipping invalid item: {item}")

        if not validated_items and parsed_data: 
            raise ValueError("No valid items found after validation, though initial parse was a list.")
        return validated_items

    except json.JSONDecodeError as e:
        text_that_failed_parsing = json_string_to_parse or cleaned_text
        print(f"ERROR: AI Service ({error_context}) - Failed to decode JSON. Text attempted for parsing was: '{text_that_failed_parsing}'. Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse {error_context} data from Gemini API (JSONDecodeError)."
        )
    except ValueError as e: 
        print(f"ERROR: AI Service ({error_context}) - Data structure validation failed or invalid JSON. Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{error_context} data from Gemini API has incorrect structure or is invalid JSON: {e}"
        )
    except HTTPException as he: 
        raise he
    except Exception as e:
        print(f"ERROR: AI Service ({error_context}) - Error during Gemini API call: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while generating {error_context} with Gemini: {str(e)}"
        )
# --- Flashcard Generation using Gemini ---
async def generate_flashcards_from_text(text_to_generate_from: str) -> List[Dict[str, str]]:
    if not text_to_generate_from or len(text_to_generate_from.strip()) < 10:
        print("WARN: AI Service - Input text for flashcards is too short.")
        return []

    prompt = f"""From the following text, generate a concise list of flashcards focusing on the most essential concepts.

Guidelines:
- Output only a *JSON array* (no code block, no markdown, no extra text).
- Each flashcard must be a JSON object with:
  - "front": a question or term
  - "back": the correct answer or explanation
- For short text (under 300 words), return only 3 flashcards.
- For long text (300+ words), return a *maximum of 5 flashcards*.
- Prioritize uniqueness, depth, and relevance of the concepts.

Only output valid JSON, no markdown formatting or introductory/explanatory text.

Text to process:
---
{text_to_generate_from}
---
"""
    return await _call_gemini_for_json_list(prompt, "flashcards")


# --- Study Notes Generation (from Topic ID) ---

async def generate_study_notes_from_topic(
    db: AsyncIOMotorDatabase,
    topic_id_str: str,
    user_id: ObjectId
) -> str:
    """
    Fetches topic content from the DB and generates study notes.
    This function is called by the router.
    """
    try:
        topic_oid = ObjectId(topic_id_str)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Topic ID format."
        )

    # 1. Fetch the topic
    topic_doc = await db[BOOK_TOPICS_COLLECTION].find_one({"_id": topic_oid})
    if not topic_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic not found."
        )
    
    topic = BookTopicInDB(**topic_doc)

    # 2. Verify user ownership by checking the parent book
    book_doc = await db["books"].find_one(
        {"_id": topic.book_id, "user_id": user_id}
    )
    if not book_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book for this topic not found or access denied."
        )

    # 3. If ownership is verified, generate notes from the topic's content
    if not topic.content or len(topic.content.strip()) < 20:
        return "The selected topic content is too short to generate study notes."
        
    return await generate_study_notes_from_text(topic.content)


# --- Study Notes Generation using Gemini ---
async def generate_study_notes_from_text(text_to_generate_from: str) -> str:
    if not text_to_generate_from or len(text_to_generate_from.strip()) < 20:
        print("WARN: AI Service - Input text for study notes is too short.")
        return "Input text is too short to generate effective study notes."

    # <<< (NEW, ADVANCED PROMPT) >>>
    prompt = f"""
You are an expert academic instructor.  
Generate **comprehensive, well-structured, deeply detailed study notes** from the input text.

## OUTPUT FORMAT (MANDATORY)

### 1. Title  
- Create a clear academic title.

### 2. Overview  
Write 4–6 sentences covering:
- What the text explains  
- Why it matters  
- Main themes  

### 3. Key Concepts  
- Bullet list of all major terms, ideas, and concepts.

### 4. Detailed Notes (Main Body)  
Use this exact hierarchy:

## H2 — Main Topic  
- Full in-depth explanation in your own words.  
- Key points:  
  - Bullet 1  
  - Bullet 2  
  - Bullet 3  
- Include examples if present.

### H3 — Subtopic  
- Clear explanation.  
- Supporting bullet points.

#### H4 — (Optional)  
- Short clarifications or definitions when needed.

Repeat for **all major ideas** in the text.  
Notes must be **thorough, logically ordered, rewritten academically, and cover 100% of the content**.

### 5. Conclusion  
Write 5–7 bullet points summarizing:
- Core ideas to remember  
- Exam-relevant takeaways  
- Key conceptual relationships  

## WRITING STYLE
- Use academic but simple language.  
- No fluff.  
- No repeated sentences.  
- Do not copy text; rewrite everything clearly.  
- Output all content in **one markdown block**.

---

### TEXT TO PROCESS:
{text_to_generate_from}

---
"""
    # <<< (END OF NEW PROMPT) >>>

    if not GOOGLE_API_KEY or not GEMINI_MODEL_NAME:
        print("ERROR: AI Service (Study Notes) - API Key or Model Name is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Study notes generation service is not configured (API Key or Model Name missing)."
        )

    raw_generated_text_notes = ""

    try:
        print(f"INFO: AI Service (Study Notes) - Calling Gemini API ({GEMINI_MODEL_NAME}).")
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        generation_config = genai.types.GenerationConfig(
            temperature=0.5,
            max_output_tokens=4096 # <<< Increased token limit for this complex prompt
        )

        response = gemini_model.generate_content(prompt, generation_config=generation_config)

        if not response.parts:
            print(f"ERROR: AI Service (Study Notes) - Gemini API response has no parts. Full response: {response}")
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Gemini API call blocked for Study Notes: {response.prompt_feedback.block_reason_message}"
                )
            return "The AI could not generate study notes (empty response parts)."

        raw_generated_text_notes = response.text.strip()
        print(f"DEBUG: AI Service (Study Notes) - Gemini API Raw Response Text: {raw_generated_text_notes}")

        if not raw_generated_text_notes:
            print("ERROR: AI Service (Study Notes) - Gemini API returned empty content.")
            return "The AI could not generate study notes from the selected text."

        return raw_generated_text_notes
    except HTTPException as he: 
        raise he
    except Exception as e:
        print(f"ERROR: AI Service (Study Notes) - Error during Gemini API call: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while generating study notes with Gemini: {str(e)}"
        )

# --- Glossary Generation (Offline/Tool-based) ---
nlp: Any = None

def load_glossary_tools():
    """Loads the SpaCy model and ensures WordNet is available."""
    global nlp
    try:
        # Check if wordnet is downloaded, if not, attempt to download it
        try:
            nltk.data.find('corpora/wordnet.zip')
        except LookupError:
            print("INFO: AI Service - WordNet corpus not found. Attempting to download...")
            nltk.download('wordnet')
            print("INFO: AI Service - WordNet downloaded successfully.")

        print("INFO: AI Service - Loading SpaCy model 'en_core_web_sm'...")
        nlp = spacy.load("en_core_web_sm")
        print("INFO: AI Service - SpaCy model loaded.")
        
    except Exception as e:
        print(f"ERROR: AI Service - Failed to load glossary tools: {e}")
        nlp = None

if nlp is None:
    load_glossary_tools()

def _find_definition_in_context(term: str, sentence: str) -> Optional[str]:
    # Regex checks for in-context definitions (e.g., "term, which is...", "term is defined as...")
    match = re.search(rf"{re.escape(term)}\s*,\s*which\s+(is|are)\s+(.+)", sentence, re.IGNORECASE)
    if match: return match.group(2).strip(" .")
    match = re.search(rf"{re.escape(term)}\s+(is|are)\s+defined\s+as\s+(.+)", sentence, re.IGNORECASE)
    if match: return match.group(2).strip(" .")
    match = re.search(rf"{re.escape(term)}\s+refers\s+to\s+(.+)", sentence, re.IGNORECASE)
    if match: return match.group(2).strip(" .")
    return None

async def generate_glossary_from_text(page_text: str) -> List[GlossaryTerm]:
    """
    Generates a list of glossary terms from a single page of text using an offline method.
    """
    if not nlp:
        print("ERROR: AI Service (Glossary) - Glossary tools not loaded.")
        return []

    if not page_text or len(page_text.strip()) < 50:
        return []

    doc = nlp(page_text)
    glossary_terms: List[GlossaryTerm] = []
    processed_terms = set()

    # Extract potential terms from named entities and noun chunks
    potential_terms = [ent.text for ent in doc.ents if ent.label_ not in ["DATE", "TIME", "CARDINAL", "MONEY"]]
    potential_terms.extend([chunk.text for chunk in doc.noun_chunks])

    for term_text in potential_terms:
        term_clean = term_text.strip().lower()

        if len(term_clean) < 3 or term_clean.isnumeric() or term_clean in processed_terms:
            continue
        
        processed_terms.add(term_clean)
        definition = None
        source = None

        # 1. Try to find an in-context definition
        for sent in doc.sents:
            if term_clean in sent.text.lower():
                definition = _find_definition_in_context(term_clean, sent.text)
                if definition:
                    source = "context"
                    break
        
        # 2. Fallback to WordNet for single-word terms
        if not definition:
            if len(term_clean.split()) == 1:
                synsets = wordnet.synsets(term_clean)
                if synsets:
                    definition = synsets[0].definition()
                    definition = definition[0].upper() + definition[1:] # Capitalize
                    source = "general"
        
        if definition and source:
            glossary_terms.append(
                GlossaryTerm(term=term_text.strip(), definition=definition, source=source)
            )
            if len(glossary_terms) >= 7: # Limit the output size
                break
            
    return glossary_terms

# --- Groq Llama3 Configuration for RAG Chat ---
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY not found in environment. AI Mentor feature will not work.")
    chat_model = None
else:
    try:
        chat_model = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)
        print("INFO: Groq Llama3 chat model loaded successfully.")
    except Exception as e:
        print(f"ERROR: Failed to load Groq chat model: {e}")
        chat_model = None

# =========================================================================
# --- RAG CHAT FOR AI MENTOR (Module 8) ---
# =========================================================================

async def get_rag_answer(book_id: str, query: str) -> ChatResponse:
    """
    Handles a user's query using the RAG pipeline for a specific book.
    """
    if not chat_model:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Mentor service is currently unavailable (Chat model not loaded)."
        )

    # 1. Retrieve relevant context from the vector store
    # This is a synchronous call, but FastAPI will run it in a thread pool
    relevant_docs = vector_service.search_in_vector_store(book_id, query)

    if not relevant_docs:
        # If no context is found, provide a graceful fallback response
        return ChatResponse(
            answer="I couldn't find any information about that in this book. Please try rephrasing your question or asking something else.",
            sources=[]
        )

    # 2. Format the retrieved documents into a context string
    context_string = "\n\n---\n\n".join([doc.page_content for doc in relevant_docs])
    source_chunks = [doc.page_content for doc in relevant_docs]

    # 3. Define the prompt template
    template = """

    You are an expert AI assistant, the 'Book Mentor'. Your primary goal is to answer the user's QUESTION based *only* on the provided CONTEXT.

    **Instructions:**
    1. Synthesize a direct and helpful answer from the CONTEXT.
    2. Do not use any external knowledge. Your world is limited to the CONTEXT provided.
    3. If the CONTEXT does not contain enough information to fully answer the QUESTION, do the following:
       - First, provide whatever partial answer you *can* form from the text.
       - Then, in a single, concluding sentence, state that the context does not provide further details or a complete comparison.
    4. **Do not repeat** that the information is missing from the context for every point you make. State it only once at the very end, and only if necessary.
    5. Be concise and clear.

    CONTEXT:
    {context}

    QUESTION:
    {question}

    ANSWER:
    """
    prompt = ChatPromptTemplate.from_template(template)
    
    # 4. Create and invoke the RAG chain
    try:
        rag_chain = (
            {"context": lambda x: context_string, "question": RunnablePassthrough()}
            | prompt
            | chat_model
            | StrOutputParser()
        )
        
        # We pass the original query to the chain
        answer = rag_chain.invoke(query)
        
        return ChatResponse(answer=answer, sources=source_chunks)

    except Exception as e:
        print(f"ERROR: AI Service (RAG Chain) - An error occurred: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while generating the chat response."
        )
# =========================================================================
# --- END OF AI SERVICE MODULE ---