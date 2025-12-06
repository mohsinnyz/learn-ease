# backend/services/ai_service.py

import os
import json
import re
from typing import List, Dict, Any, Optional
import numpy as np
from scipy.spatial.distance import cosine
import spacy
import nltk
from nltk.corpus import wordnet
from fastapi import HTTPException, status 

# --- AI Client Imports ---
import google.generativeai as genai
import cohere  # Restored Cohere
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# --- DB & Schema Imports ---
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from models.ai_schemas import (
    QuestionAnswerPair, GlossaryTerm,
    QuizGenerationRequest, GeneratedQuiz, QuizQuestion, 
    QuizEvaluationRequest, QuizEvaluationResponse, EvaluatedQuestionResult,
    ChatRequest, ChatResponse
)
from models.book_schemas import BookTopicInDB
from . import quiz_service
from . import vector_service

# --- Local Embedding Imports (Keep for Evaluation) ---
from sentence_transformers import SentenceTransformer

# =========================================================================
# --- CONFIGURATION ---
# =========================================================================

# 1. Google Gemini (Study Notes, Flashcards, Quiz)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-pro") 
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    print("WARNING: GOOGLE_API_KEY not found. Notes/Flashcards/Quiz will fail.")

# 2. Groq Llama3 (Chat Mentor)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# 3. Cohere (Summary, Q/A Pairs) - RESTORED
COHERE_API_KEY = os.getenv("COHERE_API_KEY")
co = None
if COHERE_API_KEY:
    try:
        co = cohere.Client(api_key=COHERE_API_KEY)
        print("INFO: AI Service - Cohere Client initialized successfully.")
    except Exception as e:
        print(f"ERROR: AI Service - Failed to initialize Cohere Client: {e}")
else:
    print("WARNING: COHERE_API_KEY not found. Summary and Q/A will fail.")

# 4. Local Embeddings (Quiz Evaluation)
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2") 
embedding_model: Optional[SentenceTransformer] = None

# 5. DB Collections
BOOK_TOPICS_COLLECTION = "book_topics"

# =========================================================================
# --- INITIALIZATION HELPER ---
# =========================================================================

def load_embedding_model():
    """Loads the Sentence Transformer model for generating vector embeddings."""
    global embedding_model
    try:
        print(f"INFO: AI Service - Loading embedding model '{EMBEDDING_MODEL_NAME}'...")
        embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)
        print(f"INFO: AI Service - Embedding model loaded.")
    except Exception as e:
        print(f"ERROR: AI Service - Failed to load embedding model: {e}")
        embedding_model = None

if embedding_model is None:
    load_embedding_model()

def get_sentence_embedding(text: str) -> np.ndarray:
    if not embedding_model:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding model is not available for evaluation."
        )
    clean_text = str(text).strip() or " "
    return embedding_model.encode(clean_text, convert_to_numpy=True)

# =========================================================================
# --- HELPER: COHERE JSON PARSING (Restored) ---
# =========================================================================

def parse_cohere_json(text: str) -> List[Any]:
    """Clean and parse JSON output from Cohere."""
    cleaned_text = text.strip()
    
    # Remove markdown code blocks
    if cleaned_text.startswith("```json"):
        cleaned_text = cleaned_text[len("```json"):]
    elif cleaned_text.startswith("```"):
        cleaned_text = cleaned_text[len("```"):]
    if cleaned_text.endswith("```"):
        cleaned_text = cleaned_text[:-len("```")]
    
    cleaned_text = cleaned_text.strip()
    
    # Extract list structure [ ... ]
    start = cleaned_text.find('[')
    end = cleaned_text.rfind(']')
    
    if start != -1 and end != -1 and end > start:
        cleaned_text = cleaned_text[start : end+1]
        
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        print(f"ERROR: Failed to parse Cohere JSON. Raw text: {text}")
        return []

# =========================================================================
# --- HELPER: GEMINI JSON PARSING (New) ---
# =========================================================================

def extract_json_from_text(text: str) -> Any:
    """Robustly extract JSON from text for Gemini outputs."""
    cleaned_text = text.strip()
    pattern = r"```(?:json)?\s*(.*?)```"
    match = re.search(pattern, cleaned_text, re.DOTALL)
    if match:
        cleaned_text = match.group(1).strip()
    
    start_list = cleaned_text.find('[')
    if start_list != -1:
        end = cleaned_text.rfind(']')
        if end != -1:
            cleaned_text = cleaned_text[start_list : end+1]
            
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError as e:
        print(f"ERROR: Failed to parse Gemini JSON: {e}")
        return []

# =========================================================================
# --- FEATURE 1: SUMMARIZATION (Cohere - Restored) ---
# =========================================================================

async def generate_summary(text_to_summarize: str) -> str:
    if not co:
        raise HTTPException(status_code=503, detail="Cohere API unavailable.")
    
    if not text_to_summarize or len(text_to_summarize.strip()) < 50:
        return "Input text is too short to summarize."

    prompt = f"""Summarize the following educational text concisely. 
Focus on the main concepts and key takeaways. Keep it under 200 words.

Text:
{text_to_summarize}
"""

    try:
        response = co.chat(
            message=prompt,
            model="command-r-08-2024", 
            temperature=0.3
        )
        return response.text
    except Exception as e:
        print(f"ERROR: Cohere Summarization failed: {e}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")

# =========================================================================
# --- FEATURE 2: Q/A PAIRS GENERATION (Cohere - Restored) ---
# =========================================================================

async def generate_qna_from_text(text_to_generate_from: str) -> List[QuestionAnswerPair]:
    if not co:
        raise HTTPException(status_code=503, detail="Cohere API unavailable.")

    if not text_to_generate_from or len(text_to_generate_from.strip()) < 50:
        raise HTTPException(status_code=400, detail="Text too short for Q/A generation.")

    prompt = f"""
    Generate 5 unique Question-Answer pairs based strictly on the text provided below.
    
    Output strictly a JSON array of objects with keys "question" and "answer".
    Example: [{{"question": "...", "answer": "..."}}]

    Text:
    {text_to_generate_from}
    """

    try:
        response = co.chat(
            message=prompt,
            model="command-r-08-2024",
            temperature=0.4
        )
        
        data = parse_cohere_json(response.text)
        
        qna_pairs = []
        for item in data:
            if "question" in item and "answer" in item:
                qna_pairs.append(QuestionAnswerPair(
                    question=item["question"], 
                    answer=item["answer"]
                ))
        
        return qna_pairs
        
    except Exception as e:
        print(f"ERROR: Cohere Q/A Generation failed: {e}")
        raise HTTPException(status_code=500, detail="Q/A generation failed.")

# =========================================================================
# --- FEATURE 3: QUIZ GENERATION (Switched to Gemini) ---
# =========================================================================

async def generate_quiz_from_text(
    request: QuizGenerationRequest,
    db: AsyncIOMotorDatabase,
    user_id: ObjectId
) -> GeneratedQuiz:
    
    # 1. Fetch Topic & Verify Ownership
    try:
        topic_oid = ObjectId(request.topic_id)
    except:
        raise HTTPException(status_code=400, detail="Invalid Topic ID.")

    topic_doc = await db[BOOK_TOPICS_COLLECTION].find_one({"_id": topic_oid})
    if not topic_doc:
        raise HTTPException(status_code=404, detail="Topic not found.")
    
    topic = BookTopicInDB(**topic_doc)
    
    # Verify Book Access
    book_doc = await db["books"].find_one({"_id": topic.book_id, "user_id": user_id})
    if not book_doc:
        raise HTTPException(status_code=404, detail="Access denied or book not found.")

    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API unavailable.")

    # 2. Call Gemini
    prompt = f"""
    You are an expert examiner. Create a quiz with exactly {request.num_questions} questions based ONLY on the text below.
    
    Requirements:
    1. Questions should test conceptual understanding (Why/How), not just simple facts.
    2. Provide a correct answer (concise sentence).
    3. Provide 2-3 "answer_variants" (keywords/phrases that are also correct).
    4. Provide a short "explanation" for why the answer is correct.
    
    Output STRICTLY a JSON array. 
    Do not add any markdown text outside the JSON.
    
    Structure:
    [
      {{
        "question_text": "...",
        "correct_answer": "...",
        "answer_variants": ["...", "..."],
        "explanation": "..."
      }}
    ]

    Text:
    {topic.content}
    """

    try:
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        response = model.generate_content(prompt)
        
        # Use new helper for Gemini JSON
        raw_data = extract_json_from_text(response.text)
        questions: List[QuizQuestion] = []
        
        if isinstance(raw_data, list):
            for item in raw_data:
                questions.append(QuizQuestion(
                    question_text=item.get("question_text", ""),
                    correct_answer=item.get("correct_answer", ""),
                    answer_variants=item.get("answer_variants", []),
                    explanation=item.get("explanation", "")
                ))
            
        if not questions:
            raise ValueError("No questions parsed from response.")

        import uuid
        quiz_id = str(uuid.uuid4())
        return GeneratedQuiz(quiz_id=quiz_id, questions=questions)

    except Exception as e:
        print(f"ERROR: Gemini Quiz Generation failed: {e}")
        raise HTTPException(status_code=500, detail="Quiz generation failed.")

# =========================================================================
# --- FEATURE 4: QUIZ EVALUATION (Local Embeddings - Unchanged) ---
# =========================================================================

async def evaluate_quiz_attempt(
    request: QuizEvaluationRequest,
    generated_quiz: GeneratedQuiz,
    db: AsyncIOMotorDatabase,
    user_id: ObjectId
) -> QuizEvaluationResponse:
    
    if not embedding_model:
        raise HTTPException(status_code=503, detail="Embedding model unavailable.")

    quiz_map = {q.question_text: q for q in generated_quiz.questions}
    total_similarity = 0.0
    results = []
    evaluated_count = 0

    for user_attempt in request.attempted_answers:
        q_text = user_attempt.question_text
        user_ans = user_attempt.user_answer.strip()
        
        if q_text not in quiz_map: 
            continue

        ai_q = quiz_map[q_text]
        correct_ans = ai_q.correct_answer
        
        similarity = 0.0
        try:
            user_vec = get_sentence_embedding(user_ans)
            
            # Check against main answer + variants
            candidates = [correct_ans] + ai_q.answer_variants
            best_score = 0.0
            
            for cand in candidates:
                cand_vec = get_sentence_embedding(cand)
                score = 1.0 - cosine(user_vec, cand_vec)
                if score > best_score:
                    best_score = score
            
            similarity = max(0.0, min(1.0, best_score))
        except Exception as e:
            print(f"Eval Error: {e}")
            similarity = 0.0

        total_similarity += similarity
        evaluated_count += 1
        
        results.append(EvaluatedQuestionResult(
            question_text=q_text,
            user_answer=user_ans,
            correct_answer=correct_ans,
            correct_explanation=ai_q.explanation,
            similarity_score=round(similarity, 4)
        ))

    avg_score = (total_similarity / evaluated_count) if evaluated_count > 0 else 0.0
    
    def get_grade(s):
        if s >= 0.75: return "Excellent (A+)"
        if s >= 0.70: return "Very Good (A)"
        if s >= 0.60: return "Good (B+)"
        if s >= 0.50: return "Fair (B)"
        if s >= 0.40: return "Average (C+)"
        if s >= 0.35: return "Needs Improvement (C)"
        return "Poor (D)"

    final_res = QuizEvaluationResponse(
        quiz_id=request.quiz_id,
        total_score=round(avg_score, 4),
        total_grade=get_grade(avg_score),
        results=results
    )

    # Save to DB
    await quiz_service.create_quiz_result(
        db=db, user_id=user_id, book_id=ObjectId(request.book_id),
        topic_name=request.topic_name, eval_response=final_res
    )

    return final_res

# =========================================================================
# --- FEATURE 5: STUDY NOTES & FLASHCARDS (Gemini - Unchanged Logic) ---
# =========================================================================

async def generate_study_notes_from_topic(db: AsyncIOMotorDatabase, topic_id_str: str, user_id: ObjectId) -> str:
    try:
        topic_oid = ObjectId(topic_id_str)
        topic_doc = await db[BOOK_TOPICS_COLLECTION].find_one({"_id": topic_oid})
        if not topic_doc: raise HTTPException(status_code=404, detail="Topic not found")
        
        topic = BookTopicInDB(**topic_doc)
        book_doc = await db["books"].find_one({"_id": topic.book_id, "user_id": user_id})
        if not book_doc: raise HTTPException(status_code=404, detail="Access denied")
        
        return await generate_study_notes_from_text(topic.content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

async def generate_study_notes_from_text(text: str) -> str:
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API key missing.")
    
    prompt = f"""
    You are an expert academic instructor. Generate **detailed study notes** in Markdown.
    Use headers (#, ##), bullet points, and clear sections.
    
    Text:
    {text}
    """
    
    try:
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        res = model.generate_content(prompt)
        return res.text if res.text else "No notes generated."
    except Exception as e:
        print(f"Gemini Error: {e}")
        raise HTTPException(status_code=500, detail="Study notes generation failed.")

async def generate_flashcards_from_text(text: str) -> List[Dict[str, str]]:
    if not GOOGLE_API_KEY:
        return []
    
    prompt = f"""
    Generate 3-5 flashcards (front/back) from the text below.
    Output JSON Array ONLY: [{{"front": "...", "back": "..."}}]
    
    Text:
    {text}
    """
    try:
        model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        res = model.generate_content(prompt)
        
        # Clean JSON using our new helper
        data = extract_json_from_text(res.text)
        if isinstance(data, list):
            return data
        return []
    except Exception as e:
        print(f"Flashcard Error: {e}")
        return []

# =========================================================================
# --- FEATURE 6: GLOSSARY (Local SpaCy/NLTK - Unchanged) ---
# =========================================================================

nlp: Any = None
def load_glossary_tools():
    global nlp
    try:
        try:
            nltk.data.find('corpora/wordnet.zip')
        except LookupError:
            nltk.download('wordnet')
        nlp = spacy.load("en_core_web_sm")
    except Exception as e:
        print(f"Glossary Tool Load Error: {e}")
        nlp = None

if nlp is None: load_glossary_tools()

async def generate_glossary_from_text(page_text: str) -> List[GlossaryTerm]:
    if not nlp or len(page_text) < 50: return []
    
    doc = nlp(page_text)
    terms = []
    seen = set()
    
    candidates = [ent.text for ent in doc.ents if ent.label_ not in ["DATE", "cardinal"]]
    candidates.extend([chunk.text for chunk in doc.noun_chunks])
    
    for c in candidates:
        clean = c.strip().lower()
        if len(clean) < 3 or clean in seen: continue
        seen.add(clean)
        
        definition = None
        source = None
        
        # 1. Context check
        for sent in doc.sents:
            if clean in sent.text.lower():
                if "refers to" in sent.text or "is defined as" in sent.text:
                    definition = sent.text # Simplified extraction
                    source = "context"
                    break
        
        # 2. Wordnet fallback
        if not definition and len(clean.split()) == 1:
            syns = wordnet.synsets(clean)
            if syns:
                definition = syns[0].definition()
                source = "general"
                
        if definition:
            terms.append(GlossaryTerm(term=c, definition=definition, source=source))
            if len(terms) >= 5: break
            
    return terms

# =========================================================================
# --- FEATURE 7: CHAT MENTOR (Groq - Unchanged) ---
# =========================================================================

chat_model = None
if GROQ_API_KEY:
    try:
        chat_model = ChatGroq(temperature=0, model_name="llama-3.3-70b-versatile", api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"Groq Init Error: {e}")

async def get_rag_answer(book_id: str, query: str) -> ChatResponse:
    if not chat_model:
        raise HTTPException(status_code=503, detail="Chat service unavailable.")

    docs = vector_service.search_in_vector_store(book_id, query)
    if not docs:
        return ChatResponse(answer="I couldn't find information in the book.", sources=[])
        
    context_str = "\n\n".join([d.page_content for d in docs])
    
    prompt = ChatPromptTemplate.from_template("""
    Answer the question based ONLY on the context.
    Context: {context}
    Question: {question}
    Answer:
    """)
    
    chain = (
        {"context": lambda x: context_str, "question": RunnablePassthrough()}
        | prompt | chat_model | StrOutputParser()
    )
    
    ans = chain.invoke(query)
    return ChatResponse(answer=ans, sources=[d.page_content for d in docs])