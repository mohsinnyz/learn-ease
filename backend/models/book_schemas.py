from pydantic import BaseModel, Field
from typing import Optional, List # Keep List if used elsewhere
from datetime import datetime
from bson import ObjectId

from .user_schemas import PyObjectId # This should already be there

class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    original_filename: Optional[str] = None
    content_type: Optional[str] = None
    file_size_bytes: Optional[int] = None

class BookCreateInternal(BookBase): # Data for creating DB entry
    user_id: PyObjectId
    stored_filename: str
    file_path_local: str
    extracted_text_path_local: Optional[str] = None
    category_id: Optional[PyObjectId] = None # <<< NEW FIELD

class BookInDB(BookCreateInternal):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = "processing" 
    # category_id is inherited from BookCreateInternal <<< ALREADY INCLUDED IF ADDED ABOVE

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
    filename: Optional[str] = None
    upload_date: str
    category_id: Optional[str] = None # <<< NEW FIELD

    @classmethod
    def from_db_model(cls, db_book: BookInDB):
        return cls(
            id=str(db_book.id),
            title=db_book.title,
            filename=db_book.original_filename,
            upload_date=db_book.upload_date.isoformat(),
            category_id=str(db_book.category_id) if db_book.category_id else None # <<< UPDATE THIS
        )

# Schema for updating a book's category
class BookCategoryUpdate(BaseModel):
    category_id: Optional[str] = Field(default=None, description="The new category ID for the book. Null to make it uncategorized.")