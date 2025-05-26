# learn-ease-fyp/backend/services/ai_service.py
from transformers import T5ForConditionalGeneration, T5Tokenizer # For summarization
import torch # For summarization
import json
import os
from typing import List, Dict

# --- Google Gemini API ---
import google.generativeai as genai

# Load configurations from environment variables
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL_NAME", "gemini-1.5-flash-latest") # Default if not in .env

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
else:
    print("WARNING: GOOGLE_API_KEY not found in environment. AI generation features (Flashcards, Study Notes) will not work.")

# --- Summarization Model (existing) ---
MODEL_NAME_SUMMARIZE = "mohsinnyz/Booksum-Edu" # Renamed to avoid conflict if you had a global MODEL_NAME
tokenizer_summarize = None
model_summarize = None
device_summarize = None

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

if model_summarize is None: # Check specific summarization model
    load_summarization_model()

async def generate_summary(text_to_summarize: str) -> str:
    if not model_summarize or not tokenizer_summarize:
        print("ERROR: AI Service - Summarization model/tokenizer is not available.")
        raise Exception("Summarization model/tokenizer is not available or failed to load.")
    
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
        raise Exception(f"Error generating summary: {str(e)}")


# --- Helper function to call Gemini API and parse JSON list output (for Flashcards) ---
async def _call_gemini_for_json_list(prompt: str, error_context: str) -> List[Dict[str, str]]:
    if not GOOGLE_API_KEY:
        print(f"ERROR: AI Service ({error_context}) - GOOGLE_API_KEY is not configured.")
        raise Exception(f"{error_context} service is not configured (API Key missing).")
    if not GEMINI_MODEL_NAME:
        print(f"ERROR: AI Service ({error_context}) - GEMINI_MODEL_NAME is not configured.")
        raise Exception(f"{error_context} service is not configured (Model Name missing).")

    generated_text_content = "" # Initialize for broader scope in error handling
    flashcards_data = [] # Initialize

    try:
        print(f"INFO: AI Service ({error_context}) - Calling Gemini API ({GEMINI_MODEL_NAME}).")
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        generation_config = genai.types.GenerationConfig(
            temperature=0.2, 
            max_output_tokens=1024 
        )
        full_prompt = f"{prompt}\nOutput:\n" 

        if hasattr(gemini_model, 'generate_content_async'):
            response = await gemini_model.generate_content_async(full_prompt, generation_config=generation_config)
        else:
            print(f"WARN: AI Service ({error_context}) - generate_content_async not found. Update 'google-generativeai'. This will block.")
            response = gemini_model.generate_content(full_prompt, generation_config=generation_config)
        
        # It's safer to check if response.parts exists and has content
        if not response.parts:
            print(f"ERROR: AI Service ({error_context}) - Gemini API response has no parts. Full response: {response}")
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                raise Exception(f"Gemini API call blocked for {error_context}: {response.prompt_feedback.block_reason_message}")
            return []

        generated_text_content = response.text.strip()
        print(f"DEBUG: AI Service ({error_context}) - Gemini API Raw Response Text: {generated_text_content}")
        
        if generated_text_content.startswith("json"):
            generated_text_content = generated_text_content[7:]
        if generated_text_content.endswith(""):
            generated_text_content = generated_text_content[:-3]
        generated_text_content = generated_text_content.strip()

        if not generated_text_content:
            print(f"ERROR: AI Service ({error_context}) - Gemini API returned empty content after stripping markers.")
            return []

        flashcards_data = json.loads(generated_text_content)
        if not isinstance(flashcards_data, list):
            raise ValueError("Parsed data is not a list.")
        
        validated_items = []
        for item in flashcards_data:
            if isinstance(item, dict) and "front" in item and "back" in item:
                validated_items.append({"front": str(item["front"]), "back": str(item["back"])})
            else:
                print(f"WARN: AI Service ({error_context}) - Skipping invalid item: {item}")
        
        if not validated_items and flashcards_data:
            raise ValueError("No valid items found after validation.")
        return validated_items

    except json.JSONDecodeError as e:
        print(f"ERROR: AI Service ({error_context}) - Failed to decode JSON. Output was: '{generated_text_content}'. Error: {e}")
        raise Exception(f"Failed to parse {error_context} data from Gemini API (JSONDecodeError).")
    except ValueError as e:
        print(f"ERROR: AI Service ({error_context}) - Data structure validation failed. Parsed data: {flashcards_data}. Error: {e}")
        raise Exception(f"{error_context} data from Gemini API has incorrect structure: {e}")
    except Exception as e:
        print(f"ERROR: AI Service ({error_context}) - Error during Gemini API call: {type(e)._name_} - {e}")
        # Check for specific Gemini API error details if available in 'e'
        # For instance, hasattr(e, ' কিছু ') if the library provides structured errors.
        raise Exception(f"An unexpected error occurred while generating {error_context} with Gemini: {str(e)}")


# --- Flashcard Generation using Gemini ---
async def generate_flashcards_from_text(text_to_generate_from: str) -> List[Dict[str, str]]:
    if not text_to_generate_from or len(text_to_generate_from.strip()) < 10:
        print("WARN: AI Service - Input text for flashcards is too short.")
        return []

    prompt = f"""From the following text, create a list of flashcards.
Each flashcard must be a JSON object with two keys: "front" (containing a question or term) and "back" (containing the answer or definition).
Return ONLY a valid JSON list of these objects, and nothing else. Do not add any introductory or concluding text outside the JSON structure.

Example of desired output format:
[
  {{"front": "What is the capital of France?", "back": "Paris."}},
  {{"front": "Define 'photosynthesis'.", "back": "The process by which green plants use sunlight, water, and carbon dioxide to create their own food and release oxygen."}}
]

Text to process:
---
{text_to_generate_from}
---
""" # Removed the "JSON Output:" line from prompt to let the model directly start with JSON.
    return await _call_gemini_for_json_list(prompt, "flashcards")


# --- Study Notes Generation using Gemini ---
async def generate_study_notes_from_text(text_to_generate_from: str) -> str:
    if not text_to_generate_from or len(text_to_generate_from.strip()) < 20:
        print("WARN: AI Service - Input text for study notes is too short.")
        return "Input text is too short to generate effective study notes."

    prompt = f"""Generate comprehensive and well-structured study notes from the following text.
The notes should clearly identify key concepts, provide concise explanations for each, and use bullet points or numbered lists for important details and sub-points.
The output should be formatted as a single block of text, suitable for direct display. Use markdown for headings (e.g., ## Heading, ### Subheading) and lists (e.g., * item or - item).

Text to process:
---
{text_to_generate_from}
---
""" # Removed "Formatted Study Notes:" and "\nOutput:\n" to let the model generate more freely as text
    
    if not GOOGLE_API_KEY:
        print("ERROR: AI Service (Study Notes) - GOOGLE_API_KEY is not configured.")
        raise Exception("Study notes generation service is not configured (API Key missing).")
    if not GEMINI_MODEL_NAME:
        print(f"ERROR: AI Service (Study Notes) - GEMINI_MODEL_NAME is not configured.")
        raise Exception(f"Study notes service is not configured (Model Name missing).")
    
    generated_text_content = "" # Initialize for error reporting scope

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
            print(f"WARN: AI Service (Study Notes) - generate_content_async not found. Update 'google-generativeai'. This will block.")
            response = gemini_model.generate_content(prompt, generation_config=generation_config)

        if not response.parts:
            print(f"ERROR: AI Service (Study Notes) - Gemini API response has no parts. Full response: {response}")
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                 raise Exception(f"Gemini API call blocked for Study Notes: {response.prompt_feedback.block_reason_message}")
            return "The AI could not generate study notes (empty response parts)."

        generated_text_content = response.text.strip()
        print(f"DEBUG: AI Service (Study Notes) - Gemini API Raw Response Text: {generated_text_content}")
        
        if not generated_text_content:
            print("ERROR: AI Service (Study Notes) - Gemini API returned empty content.")
            return "The AI could not generate study notes from the selected text."
        
        return generated_text_content

    except Exception as e:
        print(f"ERROR: AI Service (Study Notes) - Error during Gemini API call: {type(e)._name_} - {e}")
        raise Exception(f"An unexpected error occurred while generating study notes with Gemini: {str(e)}")