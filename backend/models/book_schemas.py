from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from bson import ObjectId

from .user_schemas import PyObjectId

class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    original_filename: Optional[str] = None
    content_type: Optional[str] = None
    file_size_bytes: Optional[int] = None

class BookCreateInternal(BookBase): # Data for creating DB entry
    user_id: PyObjectId
    stored_filename: str         # Unique filename on server (e.g., UUID_original.pdf)
    file_path_local: str         # Full path to the PDF on server
    extracted_text_path_local: Optional[str] = None # Full path to extracted text file

class BookInDB(BookCreateInternal):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = "processing" # e.g., "processing", "ready", "error_extraction", "error_upload"

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }

class BookPublic(BaseModel): # Data returned to client
    id: str
    title: str
    filename: Optional[str] = None # Typically the original_filename for display
    upload_date: str

    @classmethod
    def from_db_model(cls, db_book: BookInDB):
        return cls(
            id=str(db_book.id),
            title=db_book.title,
            filename=db_book.original_filename,
            upload_date=db_book.upload_date.isoformat()
        )