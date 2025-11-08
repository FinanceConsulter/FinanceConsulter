# Import Standard
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2

# Import Request
from schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

# Import Model
from models.user import User

# Import Repository
from repository.category import CategoryRepository

# Import DataAccess
from data_access.data_access import get_db

router = APIRouter(
    prefix = '/category',
    tags=['category']
)

def get_repository(db:Session = Depends(get_db)) -> CategoryRepository:
    return CategoryRepository(db)

@router.get('/', response_model=List[CategoryResponse])
def get_categories(
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    categories = repo.get_userspecific_categories(current_user)
    if categories == []:
        raise HTTPException(status_code=status.HTTP_200_OK, detail="No Categories found for this user")
    return categories

@router.get('/{lcategory_id}', response_model=CategoryResponse)
def get_categories(
    category_id, 
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    category = repo.get_category(current_user, category_id)
    if category == None:
        raise HTTPException(status_code=status.HTTP_200_OK, detail=f"No category with id {category_id} found for this user")
    return category

@router.post('/', response_model=CategoryResponse)
def create_category(
    new_category: CategoryCreate,
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    category = repo.create_category(current_user, new_category)
    if category == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create category")
    return category

@router.put('/', response_model=CategoryResponse)
def update_category(
    updated_category: CategoryUpdate, 
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    category = repo.update_category(current_user, updated_category)
    if category == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to update category")
    return category

@router.delete('/{category_id}', status_code=status.HTTP_200_OK)
def update_category(
    category_id: int, 
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.delete_category(current_user,category_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to delete category")
    return {"action": "deleted"}
