from pydantic import BaseModel, Field, constr
from typing import Optional
from datetime import datetime
from bson import ObjectId # For MongoDB ObjectId handling

# Assuming PyObjectId is defined in user_schemas.py or a common utility file
# If not, you might need to define or import it appropriately.
# For now, let's assume it's in user_schemas as per previous structure.
from .user_schemas import PyObjectId

class CategoryBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=1, max_length=100) = Field(..., description="Name of the category")

class CategoryCreate(CategoryBase):
    # No extra fields needed from user for simple creation, user_id will be added in service
    pass

class CategoryUpdate(BaseModel):
    name: constr(strip_whitespace=True, min_length=1, max_length=100) = Field(..., description="New name for the category")

class CategoryInDBBase(CategoryBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: PyObjectId = Field(..., description="The ID of the user who owns this category")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    # updated_at: datetime = Field(default_factory=datetime.utcnow) # Optional: for tracking updates

    class Config:
        populate_by_name = True # Pydantic V2 (formerly allow_population_by_field_name)
        arbitrary_types_allowed = True 
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }

# This will be the model returned by API endpoints (e.g., when listing categories)
class CategoryPublic(BaseModel):
    id: str
    name: str
    user_id: str # Keep as str for client
    created_at: str
    # updated_at: Optional[str] = None

    @classmethod
    def from_db_model(cls, db_category: CategoryInDBBase):
        return cls(
            id=str(db_category.id),
            name=db_category.name,
            user_id=str(db_category.user_id),
            created_at=db_category.created_at.isoformat(),
            # updated_at=db_category.updated_at.isoformat() if db_category.updated_at else None
        )