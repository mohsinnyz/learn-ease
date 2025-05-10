# backend/models/user_schemas.py
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from bson import ObjectId # For MongoDB ObjectId handling

# Helper for MongoDB ObjectId
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, field): # Changed from `values` to `field` for Pydantic v2 compatibility
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema): # Changed from `core_schema` to `field_schema` for Pydantic v2 compatibility
        field_schema.update(type="string")


# Properties to receive via API on user creation
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    firstname: str = Field(..., min_length=1)
    lastname: str = Field(..., min_length=1)
    age: int = Field(..., gt=0) # Assuming age must be a positive integer
    university_name: str = Field(...)

# Properties to receive via API on user login
class UserLogin(BaseModel):
    email: EmailStr # Changed from username to email to match UserCreate
    password: str

# Properties stored in DB (includes hashed_password)
class UserInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    firstname: str
    lastname: str
    email: EmailStr
    hashed_password: str
    age: Optional[int] = None # Make it optional in DB if not all users might have it initially
    university_name: Optional[str] = None # Make it optional in DB

    class Config:
        populate_by_name = True # Changed from allow_population_by_field_name for Pydantic v2
        arbitrary_types_allowed = True # To allow ObjectId
        json_encoders = {ObjectId: str}

# Properties to return to client (omits hashed_password)
class UserPublic(BaseModel):
    id: str
    firstname: str
    lastname: str
    email: EmailStr
    age: Optional[int] = None
    university_name: Optional[str] = None

    @classmethod
    def from_user_in_db(cls, user_in_db: UserInDB):
        return cls(
            id=str(user_in_db.id),
            firstname=user_in_db.firstname,
            lastname=user_in_db.lastname,
            email=user_in_db.email,
            age=user_in_db.age,
            university_name=user_in_db.university_name
        )

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None