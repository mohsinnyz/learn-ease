# learn-ease-fyp/backend/services/ai_service.py
from transformers import T5ForConditionalGeneration, T5Tokenizer
import torch

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
        # Keep tokenizer and model as None to indicate failure
        tokenizer = None
        model = None

# Call load_model when this module is first imported (FastAPI will typically import it once)
# For more robust reloading or on-demand loading, other strategies might be needed in complex apps.
if model is None: # Ensure it only loads once
    load_summarization_model()

async def generate_summary(text_to_summarize: str) -> str:
    if not model or not tokenizer:
        print("ERROR: AI Service - Summarization model/tokenizer is not available.")
        raise Exception("Summarization model/tokenizer is not available or failed to load.")
    
    if not text_to_summarize or len(text_to_summarize.strip()) < 20:
        return "Input text is too short to summarize effectively."

    try:
        # Prepare the text for T5. T5 was often trained with a prefix for summarization tasks.
        # If your "mohsinnzy/Booksum-Edu" model was fine-tuned with such a prefix, include it.
        # Common prefix: "summarize: "
        # If not, you can pass the text directly. Let's assume "summarize: " for now.
        input_text_with_prefix = "summarize: " + text_to_summarize

        inputs = tokenizer.encode(
            input_text_with_prefix,
            return_tensors='pt',      # PyTorch tensors
            max_length=512,           # Max input tokens for T5-base (can be up to 1024 for some variants)
            truncation=True,          # Truncate if longer
            padding='max_length'      # Pad to max_length
        ).to(device) # Move input tensors to the same device as the model

        summary_ids = model.generate(
            inputs,
            num_beams=4,
            max_length=150, # Max length of the generated summary in tokens
            min_length=30,  # Min length of the generated summary in tokens
            length_penalty=2.0,
            early_stopping=True
        )

        summary = tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return summary

    except Exception as e:
        print(f"ERROR: AI Service - Error during summarization with model {MODEL_NAME}: {e}")
        raise Exception(f"Error generating summary: {str(e)}")