# learn-ease-fyp/backend/services/ai_service.py
from transformers import T5ForConditionalGeneration, T5Tokenizer # For summarization
import torch # For summarization
import json
import os
from typing import List, Dict, Any # Added Any for placeholder model/tokenizer types
from fastapi import HTTPException, status # For raising HTTP exceptions

# --- Google Gemini API ---
import google.generativeai as genai

# Import new schemas
from models.ai_schemas import QuestionAnswerPair # Already have List, Dict from typing

# Load configurations from environment variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash-latest") # Default if not in .env

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    print("WARNING: GOOGLE_API_KEY not found in environment. AI generation features (Flashcards, Study Notes, Q&A Answers) will not work.")

# --- Summarization Model (existing) ---
MODEL_NAME_SUMMARIZE = "mohsinnyz/Booksum-Edu"
tokenizer_summarize: Any = None # Using Any for now
model_summarize: Any = None # Using Any for now
device_summarize: Any = None # Using Any for now

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
        # Consistent error handling: raise HTTPException if service is unavailable
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

# --- Question Generation Model (Fine-tuned Hugging Face - Placeholder) ---
MODEL_NAME_QNA_QUESTIONS = "your-finetuned-qna-question-model-on-hf" # Replace with your actual model name
tokenizer_qna_questions: Any = None
model_qna_questions: Any = None
device_qna_questions: Any = None

def load_qna_question_model():
    global tokenizer_qna_questions, model_qna_questions, device_qna_questions
    # --- THIS IS A PLACEHOLDER ---
    # Replace this with actual model loading logic for your fine-tuned question generation model
    # similar to load_summarization_model()
    try:
        print(f"INFO: AI Service - Attempting to load Q&A Question model '{MODEL_NAME_QNA_QUESTIONS}' (Placeholder)...")
        # Example:
        # tokenizer_qna_questions = AutoTokenizer.from_pretrained(MODEL_NAME_QNA_QUESTIONS)
        # model_qna_questions = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME_QNA_QUESTIONS)
        # device_qna_questions = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        # model_qna_questions.to(device_qna_questions)
        print(f"INFO: AI Service - Q&A Question model '{MODEL_NAME_QNA_QUESTIONS}' placeholder loaded (SIMULATED).")
        # For now, let's simulate it's loaded by setting them to a non-None placeholder
        tokenizer_qna_questions = "simulated_tokenizer"
        model_qna_questions = "simulated_model"
        device_qna_questions = "simulated_device"

    except Exception as e:
        print(f"ERROR: AI Service - Failed to load Q&A Question model '{MODEL_NAME_QNA_QUESTIONS}': {e}")
        tokenizer_qna_questions = None
        model_qna_questions = None
        device_qna_questions = None # Ensure it's reset

# Load on startup (or lazily if preferred)
if model_qna_questions is None:
    load_qna_question_model()

async def _generate_questions_from_hf_model(text_content: str, num_questions: int = 3) -> List[str]:
    """
    Placeholder function to generate questions using the fine-tuned Hugging Face model.
    """
    if not model_qna_questions or not tokenizer_qna_questions:
        print("ERROR: AI Service (_generate_questions_from_hf_model) - Q&A Question model/tokenizer is not available.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Question generation service is currently unavailable (model not loaded)."
        )
    
    print(f"INFO: AI Service - Generating questions using Hugging Face model '{MODEL_NAME_QNA_QUESTIONS}' (SIMULATED).")
    # --- THIS IS A PLACEHOLDER ---
    # Replace this with actual inference logic using your model_qna_questions and tokenizer_qna_questions
    # Example of what real logic might look like:
    # inputs = tokenizer_qna_questions.encode(f"generate questions: {text_content}", return_tensors="pt", max_length=512, truncation=True).to(device_qna_questions)
    # outputs = model_qna_questions.generate(inputs, num_beams=4, max_length=64, num_return_sequences=num_questions)
    # questions = [tokenizer_qna_questions.decode(output, skip_special_tokens=True) for output in outputs]
    # return questions

    # For now, return mock questions
    mock_questions = [
        f"What is the main idea of paragraph {i+1} in the provided text?",
        f"Can you explain concept X mentioned around line { (i+1) * 5}?",
        f"How does Y relate to Z based on the text (paragraph {i+1})?"
    ]
    return mock_questions[:num_questions]


async def _generate_answer_with_gemini(question: str, context_text: str) -> str:
    """
    Generates an answer for a given question and context using Gemini API.
    """
    if not GOOGLE_API_KEY:
        print("ERROR: AI Service (_generate_answer_with_gemini) - GOOGLE_API_KEY is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Answer generation service is not configured (API Key missing)."
        )
    if not GEMINI_MODEL_NAME:
        print(f"ERROR: AI Service (_generate_answer_with_gemini) - GEMINI_MODEL_NAME is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Answer generation service is not configured (Model Name missing)."
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
            temperature=0.3, # Slightly more creative for answers but still factual
            max_output_tokens=256
        )

        if hasattr(gemini_model, 'generate_content_async'):
            response = await gemini_model.generate_content_async(prompt, generation_config=generation_config)
        else:
            # Fallback for older SDK versions (synchronous call)
            print(f"WARN: AI Service (_generate_answer_with_gemini) - generate_content_async not found. Using synchronous call.")
            response = gemini_model.generate_content(prompt, generation_config=generation_config)

        if not response.parts:
            print(f"ERROR: AI Service (_generate_answer_with_gemini) - Gemini API response has no parts. Full response: {response}")
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Gemini API call for answer blocked: {response.prompt_feedback.block_reason_message}"
                )
            return "The AI could not generate an answer (empty response parts)."

        answer_text = response.text.strip()
        if not answer_text:
            return "The AI could not formulate an answer based on the provided context."
        return answer_text

    except HTTPException as he: # Re-raise HTTPExceptions
        raise he
    except Exception as e:
        print(f"ERROR: AI Service (_generate_answer_with_gemini) - Error during Gemini API call: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while generating an answer with Gemini: {str(e)}"
        )

# --- Main Q&A Generation Service Function ---
async def generate_qna_from_text(text_to_generate_from: str) -> List[QuestionAnswerPair]:
    if not text_to_generate_from or len(text_to_generate_from.strip()) < 20:
        print("WARN: AI Service (Q&A) - Input text for Q&A is too short.")
        return [] # Or raise HTTPException(status.HTTP_400_BAD_REQUEST, "Input text too short for Q&A.")

    try:
        # Step 1: Generate questions (using placeholder for your fine-tuned model)
        # You might want to make num_questions configurable or dynamic
        generated_questions = await _generate_questions_from_hf_model(text_to_generate_from, num_questions=3)

        if not generated_questions:
            print("INFO: AI Service (Q&A) - No questions were generated by the HF model.")
            return []

        qna_pairs: List[QuestionAnswerPair] = []
        for question_text in generated_questions:
            # Step 2: Generate an answer for each question using Gemini
            answer_text = await _generate_answer_with_gemini(question_text, text_to_generate_from)
            qna_pairs.append(QuestionAnswerPair(question=question_text, answer=answer_text))
        
        return qna_pairs

    except HTTPException as he: # Re-raise HTTPExceptions from underlying calls
        raise he
    except Exception as e:
        print(f"ERROR: AI Service (generate_qna_from_text) - Unexpected error: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during Q&A generation."
        )


# --- Helper function to call Gemini API and parse JSON list output (for Flashcards) ---
async def _call_gemini_for_json_list(prompt: str, error_context: str) -> List[Dict[str, str]]:
    if not GOOGLE_API_KEY:
        print(f"ERROR: AI Service ({error_context}) - GOOGLE_API_KEY is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{error_context} service is not configured (API Key missing)."
        )
    if not GEMINI_MODEL_NAME:
        print(f"ERROR: AI Service ({error_context}) - GEMINI_MODEL_NAME is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{error_context} service is not configured (Model Name missing)."
        )

    raw_generated_text = ""
    parsed_data: List[Dict[str,str]] = [] # Ensure it's initialized as list

    try:
        print(f"INFO: AI Service ({error_context}) - Calling Gemini API ({GEMINI_MODEL_NAME}).")
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        generation_config = genai.types.GenerationConfig(
            temperature=0.2,
            max_output_tokens=1024
        )

        if hasattr(gemini_model, 'generate_content_async'):
            response = await gemini_model.generate_content_async(prompt, generation_config=generation_config)
        else:
            print(f"WARN: AI Service ({error_context}) - generate_content_async not found. Using synchronous call.")
            response = gemini_model.generate_content(prompt, generation_config=generation_config)

        if not response.parts:
            print(f"ERROR: AI Service ({error_context}) - Gemini API response has no parts. Full response: {response}")
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                 raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, # Or 400 if it's a prompt issue
                    detail=f"Gemini API call blocked for {error_context}: {response.prompt_feedback.block_reason_message}"
                )
            return []

        raw_generated_text = response.text.strip()
        print(f"DEBUG: AI Service ({error_context}) - Gemini API Raw Response Text: {raw_generated_text}")

        cleaned_text = raw_generated_text
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

        print(f"DEBUG: AI Service ({error_context}) - Text after initial cleaning for JSON: '{cleaned_text}'")

        json_string_to_parse = cleaned_text # Default to cleaned_text
        json_start_index = cleaned_text.find('[')
        json_end_index = cleaned_text.rfind(']')

        if json_start_index != -1 and json_end_index != -1 and json_end_index > json_start_index:
            json_string_to_parse = cleaned_text[json_start_index : json_end_index+1]
            print(f"DEBUG: AI Service ({error_context}) - Extracted JSON string for parsing: '{json_string_to_parse}'")
        else:
            print(f"WARN: AI Service ({error_context}) - Could not find clear JSON array [..] in Gemini output. Attempting to parse cleaned string as is: '{cleaned_text}'")
        
        parsed_data = json.loads(json_string_to_parse)

        if not isinstance(parsed_data, list):
            raise ValueError("Parsed data is not a list.")

        validated_items: List[Dict[str,str]] = []
        for item in parsed_data:
            if isinstance(item, dict) and "front" in item and "back" in item: # Specific to flashcards
                validated_items.append({"front": str(item["front"]), "back": str(item["back"])})
            else:
                print(f"WARN: AI Service ({error_context}) - Skipping invalid item: {item}")

        if not validated_items and parsed_data: # If original list was not empty but validation yielded nothing
            raise ValueError("No valid items found after validation, though initial parse was a list.")
        return validated_items

    except json.JSONDecodeError as e:
        text_that_failed_parsing = json_string_to_parse if 'json_string_to_parse' in locals() and json_string_to_parse != cleaned_text else cleaned_text
        print(f"ERROR: AI Service ({error_context}) - Failed to decode JSON. Text attempted for parsing was: '{text_that_failed_parsing}'. Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse {error_context} data from Gemini API (JSONDecodeError)."
        )
    except ValueError as e:
        print(f"ERROR: AI Service ({error_context}) - Data structure validation failed. Parsed data: {parsed_data}. Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{error_context} data from Gemini API has incorrect structure: {e}"
        )
    except HTTPException as he: # Re-raise HTTPExceptions
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


# --- Study Notes Generation using Gemini ---
async def generate_study_notes_from_text(text_to_generate_from: str) -> str:
    if not text_to_generate_from or len(text_to_generate_from.strip()) < 20:
        print("WARN: AI Service - Input text for study notes is too short.")
        return "Input text is too short to generate effective study notes."

    prompt = f"""You are an expert educational assistant. Your task is to generate *comprehensive, clearly structured, and visually well-formatted study notes* from the following academic text.

### Instructions:
- Carefully read and analyze the input content.
- Identify and extract all major concepts, terms, and themes.
- Present the information using a hierarchical structure with *headings* and *subheadings*.
- Under each heading, give a *concise but informative explanation* of the concept in your own words.
- Use bullet points or numbered lists to break down key details, facts, definitions, or processes under each sub-topic.
- Use clear and consistent *markdown formatting*:
  - ## for major headings (main concepts)
  - ### for subheadings (supporting ideas, components, or examples)
  - - for bullet points under each section
- Avoid copying long phrases directly from the source — rephrase and simplify for easier learning.
- Ensure that *all relevant ideas are covered*; do not skip minor but useful points.
- At the end, write a *Conclusion* section summarizing the key takeaways from the entire content.

### Output Style:
- The final output should be a *single markdown-formatted text block* ready for display in a study application.
- The tone should be academic but accessible to students.

Text to process:
---
{text_to_generate_from}
---
"""

    if not GOOGLE_API_KEY:
        print("ERROR: AI Service (Study Notes) - GOOGLE_API_KEY is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Study notes generation service is not configured (API Key missing)."
        )
    if not GEMINI_MODEL_NAME:
        print(f"ERROR: AI Service (Study Notes) - GEMINI_MODEL_NAME is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Study notes generation service is not configured (Model Name missing)."
        )

    raw_generated_text_notes = ""

    try:
        print(f"INFO: AI Service (Study Notes) - Calling Gemini API ({GEMINI_MODEL_NAME}).")
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        generation_config = genai.types.GenerationConfig(
            temperature=0.5,
            max_output_tokens=1500
        )

        if hasattr(gemini_model, 'generate_content_async'):
            response = await gemini_model.generate_content_async(prompt, generation_config=generation_config)
        else:
            print(f"WARN: AI Service (Study Notes) - generate_content_async not found. Using synchronous call.")
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
    except HTTPException as he: # Re-raise HTTPExceptions
        raise he
    except Exception as e:
        print(f"ERROR: AI Service (Study Notes) - Error during Gemini API call: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while generating study notes with Gemini: {str(e)}"
        )
