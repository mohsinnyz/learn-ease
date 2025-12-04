#learn-ease-fyp\backend\core\security.py

from datetime import datetime, timedelta, timezone
from typing import Optional, Annotated
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorDatabase
from core.config import JWT_SECRET_KEY, ALGORITHM
from bson import ObjectId

from .config import JWT_SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from core.db import get_database 
from models.user_schemas import TokenData, UserInDB, PyObjectId
from services import user_service

# --- Password Hashing 
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# --- JWT Token Creation 
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})

    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)


# tokenUrl should point to your actual login endpoint in auth_router.py
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> UserInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY)
        email: Optional[str] = payload.get("sub")
        ...
    except JWTError:
        raise credentials_exception
    
    # Fetch the user from DB to ensure they exist, are active, etc.
    # Your user_service.get_user_by_email should return a UserInDB instance
    # which includes the 'id' as a PyObjectId.
    user = await user_service.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    
    
    if not isinstance(user, UserInDB):
        print(f"WARNING: get_current_user expected UserInDB but received {type(user)} for email {email}.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User object retrieved in an unexpected format."
        )
    
    # Important check: Ensure the user.id is indeed a PyObjectId for consistency
    # with how book_service will use it to associate books.
    if not hasattr(user, 'id') or not isinstance(user.id, ObjectId): # <--- Changed PyObjectId to ObjectId
        print(f"CRITICAL WARNING: User object for email {email} does not have a valid BSON ObjectId 'id'. Current id: {getattr(user, 'id', 'MISSING')}, type: {type(getattr(user, 'id', 'MISSING'))}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User identity 'id' is not a valid ObjectId."
        )

    return user

# ... (at the end of the file, after your existing get_current_user)

async def get_current_user_from_token(
    db: AsyncIOMotorDatabase, 
    token: str
) -> UserInDB:
# --- (END FIX) ---

    """
    Identical to get_current_user, but takes the token as a string.
    Used for WebSockets.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await user_service.get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user