from pydantic import BaseModel, Field
from typing import List # Ensure List is imported

class TextForSummarization(BaseModel):
    text_to_summarize: str = Field(..., min_length=10, description="Text selected by the user to be summarized.")

class SummarizationResponse(BaseModel):
    summary: str

# --- Schemas for Flashcard Generation ---
class TextForFlashcards(BaseModel):
    text_to_generate_from: str = Field(..., min_length=10, description="Text selected by the user to generate flashcards from.")

class Flashcard(BaseModel):
    front: str = Field(..., description="The front content of the flashcard (e.g., question or term).")
    back: str = Field(..., description="The back content of the flashcard (e.g., answer or definition).")

class FlashcardsResponse(BaseModel):
    flashcards: List[Flashcard] = Field(..., description="A list of generated flashcards.")

# --- Schemas for Study Notes Generation ---
class TextForStudyNotes(BaseModel):
    text_to_generate_notes_from: str = Field(..., min_length=20, description="Text selected by the user to generate study notes from.")

class StudyNotesResponse(BaseModel):
    study_notes: str = Field(..., description="The generated structured study notes.")