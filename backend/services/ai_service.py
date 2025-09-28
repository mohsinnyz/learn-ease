# learn-ease-fyp/backend/services/ai_service.py
from transformers import T5ForConditionalGeneration, T5Tokenizer # For summarization
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM # For Q&A Question Generation
import torch 
import json
import os
import re # For Q&A Question Generation
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status 

import spacy
import nltk # <<< NEW
from nltk.corpus import wordnet # <<< NEW

# --- Google Gemini API ---
import google.generativeai as genai

# Import new schemas
from models.ai_schemas import QuestionAnswerPair, GlossaryTerm

# Load configurations from environment variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash-latest") 

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    print("WARNING: GOOGLE_API_KEY not found in environment. AI generation features (Flashcards, Study Notes, Q&A Answers) will not work.")

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
            temperature=0.3, 
            max_output_tokens=256 
        )

        if hasattr(gemini_model, 'generate_content_async'):
            response = await gemini_model.generate_content_async(prompt, generation_config=generation_config)
        else:
            print(f"WARN: AI Service (_generate_answer_with_gemini) - generate_content_async not found. Using synchronous call.")
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
    except HTTPException as he: 
        raise he
    except Exception as e:
        print(f"ERROR: AI Service (Study Notes) - Error during Gemini API call: {type(e).__name__} - {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while generating study notes with Gemini: {str(e)}"
        )

# --- Helper function to call Gemini API and parse JSON list output (for Flashcards) ---
# This function (_call_gemini_for_json_list) remains as previously defined, 
# as it's used by generate_flashcards_from_text and is not part of the Q&A specific section you wanted to overwrite.
# If you intended to include it, please clarify. For now, I'm assuming it's outside the overwrite scope.
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
    parsed_data: List[Dict[str,str]] = [] 

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
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
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

        json_string_to_parse = cleaned_text 
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
        for item in parsed_data: # This validation part is specific to flashcards, adjust if needed for other JSON list types
            if isinstance(item, dict) and "front" in item and "back" in item: 
                validated_items.append({"front": str(item["front"]), "back": str(item["back"])})
            else:
                print(f"WARN: AI Service ({error_context}) - Skipping invalid item: {item}")

        if not validated_items and parsed_data: 
            raise ValueError("No valid items found after validation, though initial parse was a list.")
        return validated_items

    except json.JSONDecodeError as e:
        text_that_failed_parsing = json_string_to_parse if 'json_string_to_parse' in locals() and json_string_to_parse != cleaned_text else cleaned_text
        print(f"ERROR: AI Service ({error_context}) - Failed to decode JSON. Text attempted for parsing was: '{text_that_failed_parsing}'. Error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse {error_context} data from Gemini API (JSONDecodeError)."
        )
    except ValueError as e: # This catches issues from json.loads if the string is not a valid JSON structure at all, or from our own isinstance checks
        print(f"ERROR: AI Service ({error_context}) - Data structure validation failed or invalid JSON. Parsed data: {parsed_data if 'parsed_data' in locals() else 'N/A'}. Error: {e}")
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
    
nlp: Any = None

def load_glossary_tools():
    """Loads the SpaCy model and ensures WordNet is available."""
    global nlp
    try:
        # Check if wordnet is downloaded, if not, attempt to download it
        try:
            nltk.data.find('corpora/wordnet.zip')
        except nltk.downloader.DownloadError:
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
    # This helper function remains the same
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

    potential_terms = [ent.text for ent in doc.ents if ent.label_ not in ["DATE", "TIME", "CARDINAL", "MONEY"]]
    potential_terms.extend([chunk.text for chunk in doc.noun_chunks])

    for term_text in potential_terms:
        term_clean = term_text.strip().lower()

        if len(term_clean) < 3 or term_clean.isnumeric() or term_clean in processed_terms:
            continue
        
        processed_terms.add(term_clean)
        definition = None
        source = None

        for sent in doc.sents:
            if term_clean in sent.text.lower():
                definition = _find_definition_in_context(term_clean, sent.text)
                if definition:
                    source = "context"
                    break
        
        # --- MODIFIED FALLBACK LOGIC ---
        if not definition:
            if len(term_clean.split()) == 1:
                synsets = wordnet.synsets(term_clean)
                if synsets:
                    # Get the definition from the first synset (most common meaning)
                    definition = synsets[0].definition()
                    # Capitalize the first letter for better readability
                    definition = definition[0].upper() + definition[1:]
                    source = "general"
        
        if definition and source:
            glossary_terms.append(
                GlossaryTerm(term=term_text.strip(), definition=definition, source=source)
            )
            if len(glossary_terms) >= 7:
                break
            
    return glossary_terms