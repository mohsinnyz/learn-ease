# learn-ease-fyp/backend/services/ai_service.py
from transformers import T5ForConditionalGeneration, T5Tokenizer
import torch
import httpx # For making HTTP requests to Llama API
import json # For parsing JSON response
import os # To potentially get API keys from environment
from typing import List, Dict # Add these imports

# Potentially load Llama API specific configurations from environment
LLAMA_API_URL = os.getenv("LLAMA_API_URL", "YOUR_LLAMA_API_ENDPOINT_HERE") # Replace with your actual Llama API endpoint
HF_TOKEN = os.getenv("HUGGINGFACE_API_KEY") # Your Hugging Face API Token if needed for the Llama API

MODEL_NAME = "mohsinnyz/Booksum-Edu" # Your fine-tuned model from Hugging Face
tokenizer = None
model = None
device = None # For GPU acceleration

def load_summarization_model():
    global tokenizer, model, device
    try:
        print(f"INFO: AI Service - Initializing and loading tokenizer for {MODEL_NAME}...")
        tokenizer = T5Tokenizer.from_pretrained(MODEL_NAME)
        print(f"INFO: AI Service - Tokenizer for {MODEL_NAME} loaded.")

        print(f"INFO: AI Service - Initializing and loading model {MODEL_NAME}...")
        model = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)
        print(f"INFO: AI Service - Model {MODEL_NAME} loaded.")

        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)
        print(f"INFO: AI Service - Model moved to {device}.")

    except Exception as e:
        print(f"ERROR: AI Service - Failed to load model or tokenizer '{MODEL_NAME}': {e}")
        tokenizer = None
        model = None

if model is None: 
    load_summarization_model()

async def generate_summary(text_to_summarize: str) -> str:
    if not model or not tokenizer:
        print("ERROR: AI Service - Summarization model/tokenizer is not available.")
        raise Exception("Summarization model/tokenizer is not available or failed to load.")
    
    if not text_to_summarize or len(text_to_summarize.strip()) < 20:
        return "Input text is too short to summarize effectively."

    try:
        input_text_with_prefix = "summarize: " + text_to_summarize
        inputs = tokenizer.encode(
            input_text_with_prefix,
            return_tensors='pt',
            max_length=512,
            truncation=True,
            padding='max_length'
        ).to(device)

        summary_ids = model.generate(
            inputs,
            num_beams=4,
            max_length=150,
            min_length=30,
            length_penalty=2.0,
            early_stopping=True
        )
        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return summary
    except Exception as e:
        print(f"ERROR: AI Service - Error during summarization with model {MODEL_NAME}: {e}")
        raise Exception(f"Error generating summary: {str(e)}")

# --- New Function for Flashcard Generation ---
async def generate_flashcards_from_text(text_to_generate_from: str) -> List[Dict[str, str]]:
    """
    Generates flashcards from the given text using a Llama API.
    """
    if not text_to_generate_from or len(text_to_generate_from.strip()) < 10:
        # You might want to return an empty list or a specific message if input is too short
        print("WARN: AI Service - Input text for flashcards is too short.")
        return []

    # Prompt for the Llama model
    # Adjust this prompt based on the specific Llama model and desired output format.
    prompt = f"""Generate flashcards from the following text. Each flashcard should have a 'front' (a question or term) and a 'back' (the answer or definition).
Format the output STRICTLY as a JSON list of objects, where each object has 'front' and 'back' keys. For example:
[
  {{"front": "Example Term?", "back": "Example Definition."}},
  {{"front": "Another Question?", "back": "Another Answer."}}
]

Text:
"{text_to_generate_from}"

Flashcards:
"""

    headers = {
        "Content-Type": "application/json",
    }
    if HF_TOKEN: # Add Authorization header if an HF token is provided/needed
        headers["Authorization"] = f"Bearer {HF_TOKEN}"

    payload = {
        "inputs": prompt,
        # Add any other parameters required by the Llama API, e.g., max_tokens, temperature
        "parameters": {
            "max_new_tokens": 300, # Adjust based on expected output length
            "return_full_text": False, # Often, you only want the generated part
             # "temperature": 0.7, # Example generation parameter
        }
    }
    
    if LLAMA_API_URL == "YOUR_LLAMA_API_ENDPOINT_HERE":
        print("ERROR: AI Service - LLAMA_API_URL is not configured.")
        raise Exception("Flashcard generation service is not configured (API URL missing).")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client: # Increased timeout for potentially long LLM calls
            print(f"INFO: AI Service - Calling Llama API at {LLAMA_API_URL} for flashcards.")
            response = await client.post(LLAMA_API_URL, headers=headers, json=payload)
            response.raise_for_status() # Raises an HTTPStatusError for bad responses (4xx or 5xx)
            
            api_response_data = response.json()
            print(f"DEBUG: AI Service - Llama API Raw Response: {api_response_data}")

            # --- IMPORTANT: Output parsing depends heavily on Llama API's response structure ---
            # This is a common structure for Hugging Face Inference API for text-generation
            # It might return a list with a dictionary containing 'generated_text'
            # Or it might directly return the generated text if you're using a specific setup.
            # You MUST inspect the actual API response and adjust parsing accordingly.
            
            generated_text_content = ""
            if isinstance(api_response_data, list) and len(api_response_data) > 0 and "generated_text" in api_response_data[0]:
                generated_text_content = api_response_data[0]["generated_text"].strip()
            elif isinstance(api_response_data, dict) and "generated_text" in api_response_data: # Some APIs might return a dict
                generated_text_content = api_response_data["generated_text"].strip()
            elif isinstance(api_response_data, str): # If the API directly returns the string
                 generated_text_content = api_response_data.strip()
            else:
                print(f"ERROR: AI Service - Unexpected Llama API response structure: {api_response_data}")
                raise Exception("Failed to parse flashcard data from Llama API due to unexpected format.")

            if not generated_text_content:
                print("ERROR: AI Service - Llama API returned empty 'generated_text'.")
                return [] # Or raise an exception

            # Attempt to parse the generated text as JSON
            try:
                # The Llama model needs to reliably output a valid JSON string.
                # Sometimes models add extra text before/after the JSON, or the JSON is malformed.
                # Basic cleanup: try to find the start of the JSON list '[' and end ']'
                json_start_index = generated_text_content.find('[')
                json_end_index = generated_text_content.rfind(']')

                if json_start_index != -1 and json_end_index != -1 and json_end_index > json_start_index:
                    json_string = generated_text_content[json_start_index : json_end_index+1]
                    flashcards_data = json.loads(json_string)
                else: # Fallback if no clear JSON array found
                    print(f"WARN: AI Service - Could not find clear JSON array in Llama output. Full output: {generated_text_content}")
                    # Attempt to parse the whole string, might fail
                    flashcards_data = json.loads(generated_text_content) 

                # Validate that flashcards_data is a list of dicts with 'front' and 'back'
                if not isinstance(flashcards_data, list):
                    raise ValueError("Parsed flashcard data is not a list.")
                
                validated_flashcards = []
                for item in flashcards_data:
                    if isinstance(item, dict) and "front" in item and "back" in item:
                        validated_flashcards.append({"front": str(item["front"]), "back": str(item["back"])})
                    else:
                        print(f"WARN: AI Service - Skipping invalid flashcard item: {item}")
                
                if not validated_flashcards and flashcards_data: # If original list wasn't empty but validation yielded nothing
                     raise ValueError("No valid flashcard items found after validation.")

                return validated_flashcards
            except json.JSONDecodeError as e:
                print(f"ERROR: AI Service - Failed to decode JSON from Llama API response for flashcards. Output was: {generated_text_content}. Error: {e}")
                raise Exception("Failed to parse flashcard data from Llama API (JSONDecodeError).")
            except ValueError as e: # Catch validation errors for list/dict structure
                 print(f"ERROR: AI Service - Flashcard data structure validation failed. Parsed data: {flashcards_data}. Error: {e}")
                 raise Exception(f"Flashcard data from Llama API has incorrect structure: {e}")


    except httpx.HTTPStatusError as e:
        print(f"ERROR: AI Service - Llama API request failed with status {e.response.status_code}: {e.response.text}")
        raise Exception(f"Llama API request failed (status {e.response.status_code}).")
    except httpx.RequestError as e:
        print(f"ERROR: AI Service - Llama API request failed due to a network issue or invalid URL: {e}")
        raise Exception(f"Could not connect to Llama API: {e}")
    except Exception as e:
        print(f"ERROR: AI Service - Unexpected error during flashcard generation: {e}")
        raise Exception(f"An unexpected error occurred while generating flashcards: {str(e)}")