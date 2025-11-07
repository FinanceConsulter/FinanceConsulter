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


# Import DataAccess
from data_access.data_access import get_db

router = APIRouter(
    prefix = '/category',
    tags=['category']
)

@router.get('/', response_model=List[CategoryResponse])
def get_categories(db:Session=Depends(get_db), current_user: User = Depends(oauth2.get_current_user)):
    return

@router.get('/{lcategory_id}', response_model=List[CategoryResponse])
def get_categories(category_id, intdb:Session=Depends(get_db), current_user: User = Depends(oauth2.get_current_user)):
    return