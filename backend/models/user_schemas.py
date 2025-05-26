from pydantic import BaseModel, EmailStr, Field, model_validator, field_validator
from typing import Optional
from bson import ObjectId
import re

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
    def __get_pydantic_json_schema__(cls, core_schema, handler): 
        json_schema = handler(core_schema)
        json_schema.update(type="string", example="507f1f77bcf86cd799439011")
        return json_schema

# --- Password Validation Logic ---
def validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"[0-9]", password):
        raise ValueError("Password must contain at least one number.")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?~`]", password): # Common special characters
        raise ValueError("Password must contain at least one special character.")
    return password
# --- End Password Validation Logic ---


class UserCreate(BaseModel):
    email: EmailStr
    password: str # We will add a validator for this
    firstname: str = Field(..., min_length=1)
    lastname: str = Field(..., min_length=1)
    age: int = Field(..., gt=0) 
    university_name: str = Field(...)

    # Pydantic V2 validator for password field
    @field_validator('password')
    @classmethod
    def validate_password(cls, value: str) -> str:
        return validate_password_strength(value)


class UserLogin(BaseModel):
    email: EmailStr 
    password: str

class UserUpdate(BaseModel):
    firstname: Optional[str] = Field(None, min_length=1)
    lastname: Optional[str] = Field(None, min_length=1)
    age: Optional[int] = Field(None, gt=0)
    university_name: Optional[str] = Field(None)
    image: Optional[str] = None 

    class Config:
        pass


class UserInDB(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    firstname: str
    lastname: str
    email: EmailStr 
    hashed_password: str
    age: Optional[int] = None 
    university_name: Optional[str] = None
    image: Optional[str] = None  
    verified: bool = False          

    class Config:
        populate_by_name = True 
        arbitrary_types_allowed = True 
        json_encoders = {
            ObjectId: str,
            PyObjectId: str 
        }

class UserPublic(BaseModel):
    id: str
    firstname: str
    lastname: str
    email: EmailStr
    age: Optional[int] = None
    university_name: Optional[str] = None
    image: Optional[str] = None  
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
    new_password: str = Field(..., description="The new desired password") # min_length removed here, will be handled by validator
    confirm_new_password: str = Field(..., description="Confirmation of the new password")

    # Pydantic V2 validator for new_password field
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)

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