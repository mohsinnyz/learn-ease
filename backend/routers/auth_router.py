from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm 
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Annotated 

from models.user_schemas import UserCreate, UserPublic, Token, UserLogin 
from services import user_service
from core.security import create_access_token
from core.db import get_database 

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.post("/signup", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def signup_user(
    user_in: UserCreate, 
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)]
):
    # user_service.create_user will raise HTTPException if email exists
    created_user = await user_service.create_user(db=db, user_create=user_in)
    return created_user

@router.post("/login", response_model=Token)
async def login_for_access_token(
    user_credentials: UserLogin,
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)]
):
    user = await user_service.authenticate_user(db=db, email=user_credentials.email, password=user_credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}