# backend/models/user_schemas.py
from pydantic import BaseModel, EmailStr, Field, HttpUrl, model_validator # Add HttpUrl
from typing import Optional
from bson import ObjectId 

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, field): 
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, field_schema): 
        field_schema.update(type="string")

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    firstname: str = Field(..., min_length=1)
    lastname: str = Field(..., min_length=1)
    age: int = Field(..., gt=0) 
    university_name: str = Field(...)

class UserLogin(BaseModel):
    email: EmailStr 
    password: str

# --- New schema for updating user details ---
class UserUpdate(BaseModel):
    firstname: Optional[str] = Field(None, min_length=1)
    lastname: Optional[str] = Field(None, min_length=1)
    age: Optional[int] = Field(None, gt=0)
    university_name: Optional[str] = Field(None)
    image: Optional[HttpUrl] = None # URL for profile picture

    class Config:
        # Ensure that at least one field is provided for an update
        str_min_length = 1 # Not a standard Pydantic config, custom validation might be needed if you want to enforce at least one field.
                              # For now, allowing all optional means an empty update is possible (which does nothing).

class UserInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    firstname: str
    lastname: str
    email: EmailStr # Typically not changed easily
    hashed_password: str
    age: Optional[int] = None 
    university_name: Optional[str] = None
    image: Optional[HttpUrl] = None  # <<< NEW FIELD (stores URL to image)
    verified: bool = False          # <<< NEW FIELD (defaults to False)

    class Config:
        populate_by_name = True 
        arbitrary_types_allowed = True 
        json_encoders = {ObjectId: str}

class UserPublic(BaseModel):
    id: str
    firstname: str
    lastname: str
    email: EmailStr
    age: Optional[int] = None
    university_name: Optional[str] = None
    image: Optional[HttpUrl] = None  # <<< NEW FIELD
    verified: bool                  # <<< NEW FIELD

    @classmethod
    def from_user_in_db(cls, user_in_db: UserInDB):
        return cls(
            id=str(user_in_db.id),
            firstname=user_in_db.firstname,
            lastname=user_in_db.lastname,
            email=user_in_db.email,
            age=user_in_db.age,
            university_name=user_in_db.university_name,
            image=user_in_db.image,         # Add image
            verified=user_in_db.verified    # Add verified status
        )

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# ... (other imports and schemas) ...

class UserPasswordChange(BaseModel):
    current_password: str = Field(..., description="The user's current password")
    new_password: str = Field(..., min_length=6, description="The new desired password (min length 6)")
    confirm_new_password: str = Field(..., description="Confirmation of the new password")

    @model_validator(mode='after') # Pydantic V2 style model validator
    def passwords_match(self) -> 'UserPasswordChange':
        pw1 = self.new_password
        pw2 = self.confirm_new_password
        if pw1 is not None and pw2 is not None and pw1 != pw2:
            raise ValueError('New password and confirmation password do not match')
        return self