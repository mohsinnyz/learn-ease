from pydantic import BaseModel, Field

class TextForSummarization(BaseModel):
    text_to_summarize: str = Field(..., min_length=20, description="Text selected by the user to be summarized.") 

class SummarizationResponse(BaseModel):
    summary: str