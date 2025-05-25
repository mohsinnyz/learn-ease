from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Annotated 

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.category_schemas import CategoryCreate, CategoryPublic, CategoryUpdate
from models.user_schemas import UserInDB # To type hint current_user
from services import category_service
from core.db import get_database
from core.security import get_current_user

router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
    dependencies=[Depends(get_current_user)] # Protect all routes in this router
)

@router.post("", response_model=CategoryPublic, status_code=status.HTTP_201_CREATED)
async def create_new_category(
    category_in: CategoryCreate,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    """
    Create a new category for the current authenticated user.
    """
    try:
        created_category_db = await category_service.create_category(
            db=db, category_in=category_in, user_id=current_user.id
        )
        return CategoryPublic.from_db_model(created_category_db)
    except ValueError as ve: # Catch duplicate category name error from service
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        # Log the exception e for server-side details
        print(f"Error creating category: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create category.")

@router.get("", response_model=List[CategoryPublic])
async def list_categories_for_user(
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    """
    List all categories for the current authenticated user.
    """
    try:
        categories_db = await category_service.get_categories_by_user(db=db, user_id=current_user.id)
        return [CategoryPublic.from_db_model(cat) for cat in categories_db]
    except Exception as e:
        print(f"Error listing categories: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not retrieve categories.")

@router.put("/{category_id}", response_model=CategoryPublic)
async def update_existing_category(
    category_id: str,
    category_update_data: CategoryUpdate,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    """
    Update an existing category's name for the current authenticated user.
    """
    try:
        updated_category_db = await category_service.update_category_name(
            db=db, category_id_str=category_id, category_update=category_update_data, user_id=current_user.id
        )
        if not updated_category_db:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found or you do not have permission to update it.")
        return CategoryPublic.from_db_model(updated_category_db)
    except ValueError as ve: # Catch duplicate name error
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        print(f"Error updating category {category_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update category.")

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_category(
    category_id: str,
    current_user: Annotated[UserInDB, Depends(get_current_user)],
    db: Annotated[AsyncIOMotorDatabase, Depends(get_database)],
):
    """
    Delete an existing category for the current authenticated user.
    Books in this category will become uncategorized.
    """
    try:
        deleted = await category_service.delete_category_for_user(
            db=db, category_id_str=category_id, user_id=current_user.id
        )
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found or you do not have permission to delete it.")
        return None # For 204 No Content
    except Exception as e:
        print(f"Error deleting category {category_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete category.")