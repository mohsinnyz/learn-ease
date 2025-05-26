# backend/models/user_schemas.py
from pydantic import BaseModel, EmailStr, Field, model_validator # Removed HttpUrl, added model_validator
from typing import Optional, Any, Dict # Added Any, Dict for model_validator
from bson import ObjectId 

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, field): # field is a placeholder for FieldInfo in Pydantic V2
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler): # Corrected for Pydantic V2
        # Pydantic V2 uses core_schema and handler
        json_schema = handler(core_schema)
        json_schema.update(type="string", example="507f1f77bcf86cd799439011")
        return json_schema


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

class UserUpdate(BaseModel):
    firstname: Optional[str] = Field(None, min_length=1)
    lastname: Optional[str] = Field(None, min_length=1)
    age: Optional[int] = Field(None, gt=0)
    university_name: Optional[str] = Field(None)
    image: Optional[str] = None # <<< CHANGED HttpUrl to str

    class Config:
        # str_min_length = 1 # This was for Pydantic V1 'min_anystr_length'
        # If you need to ensure at least one field is provided, use a model_validator
        pass


class UserInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    firstname: str
    lastname: str
    email: EmailStr 
    hashed_password: str
    age: Optional[int] = None 
    university_name: Optional[str] = None
    image: Optional[str] = None  # <<< CHANGED HttpUrl to str
    verified: bool = False          

    class Config:
        populate_by_name = True 
        arbitrary_types_allowed = True 
        json_encoders = {
            ObjectId: str,
            PyObjectId: str # Also good to have for PyObjectId if it's used directly
        }

class UserPublic(BaseModel):
    id: str
    firstname: str
    lastname: str
    email: EmailStr
    age: Optional[int] = None
    university_name: Optional[str] = None
    image: Optional[str] = None  # <<< CHANGED HttpUrl to str
    verified: bool                  

    @classmethod
    def from_user_in_db(cls, user_in_db: UserInDB):
        return cls(
            id=str(user_in_db.id),
            firstname=user_in_db.firstname,
            lastname=user_in_db.lastname,
            email=user_in_db.email,
            age=user_in_db.age,
            university_name=user_in_db.university_name,
            image=user_in_db.image,         
            verified=user_in_db.verified    
        )

class UserPasswordChange(BaseModel):
    current_password: str = Field(..., description="The user's current password")
    new_password: str = Field(..., min_length=6, description="The new desired password (min length 6)")
    confirm_new_password: str = Field(..., description="Confirmation of the new password")

    @model_validator(mode='after')
    def passwords_match(self) -> 'UserPasswordChange':
        pw1 = self.new_password
        pw2 = self.confirm_new_password
        if pw1 is not None and pw2 is not None and pw1 != pw2:
            raise ValueError('New password and confirmation password do not match')
        return self

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
