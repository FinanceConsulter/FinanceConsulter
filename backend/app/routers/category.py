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
    return

@router.get('/{lcategory_id}', response_model=CategoryResponse)
def get_categories(
    category_id, 
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    return

@router.post('/', response_model=CategoryResponse)
def create_category(
    new_category: CategoryCreate,
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    return

@router.put('/', response_model=CategoryResponse)
def update_category(
    updated_category: CategoryUpdate, 
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    return

@router.delete('/{category_id}', response_model=CategoryResponse)
def update_category(
    category_id: int, 
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    return
