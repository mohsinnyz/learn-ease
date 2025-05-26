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
MODEL_NAME_SUMMARIZE = "mohsinnyz/Booksum-Edu"
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

if model_summarize is None: 
    load_summarization_model()

async def generate_summary(text_to_summarize: str) -> str:
    if not ai_service.model_summarize or not ai_service.tokenizer_summarize:
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

    raw_generated_text = "" 
    parsed_flashcard_data = [] 

    try:
        print(f"INFO: AI Service ({error_context}) - Calling Gemini API ({GEMINI_MODEL_NAME}).")
        gemini_model = genai.GenerativeModel(GEMINI_MODEL_NAME)
        generation_config = genai.types.GenerationConfig(
            temperature=0.2, 
            max_output_tokens=1024 
        )
        # The prompt for flashcards already asks for JSON, so no need to add "Output:\n" here
        # if it makes the model add conversational fluff.
        
        if hasattr(gemini_model, 'generate_content_async'):
            response = await gemini_model.generate_content_async(prompt, generation_config=generation_config)
        else:
            print(f"WARN: AI Service ({error_context}) - generate_content_async not found. Update 'google-generativeai'. This will block.")
            response = gemini_model.generate_content(prompt, generation_config=generation_config)
        
        if not response.parts:
            print(f"ERROR: AI Service ({error_context}) - Gemini API response has no parts. Full response: {response}")
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                raise Exception(f"Gemini API call blocked for {error_context}: {response.prompt_feedback.block_reason_message}")
            return []

        raw_generated_text = response.text.strip()
        print(f"DEBUG: AI Service ({error_context}) - Gemini API Raw Response Text: {raw_generated_text}")
        
        # --- More Robust JSON Cleaning and Extraction ---
        # Attempt to remove markdown code block fences if present
        cleaned_text = raw_generated_text
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[len("```json"):]
        elif cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[len("```"):]
        
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-len("```")]
        
        cleaned_text = cleaned_text.strip() # Final strip

        if not cleaned_text:
            print(f"ERROR: AI Service ({error_context}) - Content became empty after cleaning attempts.")
            return []
        
        print(f"DEBUG: AI Service ({error_context}) - Text after initial cleaning for JSON: '{cleaned_text}'")

        # Find the first '[' and the last ']'
        json_start_index = cleaned_text.find('[')
        json_end_index = cleaned_text.rfind(']')

        if json_start_index != -1 and json_end_index != -1 and json_end_index > json_start_index:
            json_string_to_parse = cleaned_text[json_start_index : json_end_index+1]
            print(f"DEBUG: AI Service ({error_context}) - Extracted JSON string for parsing: '{json_string_to_parse}'")
            parsed_flashcard_data = json.loads(json_string_to_parse)
        else:
            # If no clear array found, try parsing the whole cleaned string (might fail)
            print(f"WARN: AI Service ({error_context}) - Could not find clear JSON array [..] in Gemini output. Attempting to parse cleaned string as is: '{cleaned_text}'")
            parsed_flashcard_data = json.loads(cleaned_text) 
        # --- End Robust JSON Cleaning ---

        if not isinstance(parsed_flashcard_data, list):
            raise ValueError("Parsed data is not a list.")
        
        validated_items = []
        for item in parsed_flashcard_data:
            if isinstance(item, dict) and "front" in item and "back" in item:
                validated_items.append({"front": str(item["front"]), "back": str(item["back"])})
            else:
                print(f"WARN: AI Service ({error_context}) - Skipping invalid item: {item}")
        
        if not validated_items and parsed_flashcard_data:
            raise ValueError("No valid items found after validation.")
        return validated_items

    except json.JSONDecodeError as e:
        # Use raw_generated_text in error if cleaned_text parsing failed, or json_string_to_parse if that was attempted
        text_that_failed_parsing = json_string_to_parse if 'json_string_to_parse' in locals() and json_string_to_parse else cleaned_text if 'cleaned_text' in locals() and cleaned_text else raw_generated_text
        print(f"ERROR: AI Service ({error_context}) - Failed to decode JSON. Text attempted for parsing was: '{text_that_failed_parsing}'. Error: {e}")
        raise Exception(f"Failed to parse {error_context} data from Gemini API (JSONDecodeError).")
    except ValueError as e: # Catches validation errors for list/dict structure
        print(f"ERROR: AI Service ({error_context}) - Data structure validation failed. Parsed data: {parsed_flashcard_data}. Error: {e}")
        raise Exception(f"{error_context} data from Gemini API has incorrect structure: {e}")
    except Exception as e:
        print(f"ERROR: AI Service ({error_context}) - Error during Gemini API call: {type(e).__name__} - {e}")
        raise Exception(f"An unexpected error occurred while generating {error_context} with Gemini: {str(e)}")


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
""" # Added "Flashcards JSON:" to guide the model to start the JSON immediately.
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
        raise Exception("Study notes generation service is not configured (API Key missing).")
    if not GEMINI_MODEL_NAME:
        print(f"ERROR: AI Service (Study Notes) - GEMINI_MODEL_NAME is not configured.")
        raise Exception(f"Study notes service is not configured (Model Name missing).")
    
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
            print(f"WARN: AI Service (Study Notes) - generate_content_async not found. Update 'google-generativeai'. This will block.")
            response = gemini_model.generate_content(prompt, generation_config=generation_config)

        if not response.parts:
            print(f"ERROR: AI Service (Study Notes) - Gemini API response has no parts. Full response: {response}")
            if response.prompt_feedback and response.prompt_feedback.block_reason:
                raise Exception(f"Gemini API call blocked for Study Notes: {response.prompt_feedback.block_reason_message}")
            return "The AI could not generate study notes (empty response parts)."

        raw_generated_text_notes = response.text.strip()
        print(f"DEBUG: AI Service (Study Notes) - Gemini API Raw Response Text: {raw_generated_text_notes}")
        
        if not raw_generated_text_notes:
            print("ERROR: AI Service (Study Notes) - Gemini API returned empty content.")
            return "The AI could not generate study notes from the selected text."
        
        return raw_generated_text_notes

    except Exception as e:
        print(f"ERROR: AI Service (Study Notes) - Error during Gemini API call: {type(e).__name__} - {e}") # Corrected typo
        raise Exception(f"An unexpected error occurred while generating study notes with Gemini: {str(e)}")

