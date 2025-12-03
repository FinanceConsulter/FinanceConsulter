# Import Standard
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2
from schemas.user import UserCreate
from models.user import User

# Import Request
from schemas.user import UserCreate, UserResponse

# Import Model
from models.user import User
from repository.user import UserRepository 

# Import DataAccess
from data_access.data_access import get_db

router = APIRouter(
    prefix='/user',
    tags=['user']
)

def get_repository(db:Session = Depends(get_db))->UserRepository:
    return UserRepository(db)

@router.get("/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(oauth2.get_current_user)
):
    """Get current authenticated user"""
    return current_user

@router.get("/{user_id}", response_model=List[UserResponse])
def get_user(
    user_id: int,
    repo: UserRepository = Depends(get_repository)
):
    guser = repo.get_user(user_id)
    if not guser:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return guser

@router.post("/register", response_model=UserResponse, status_code=201)
def create_user(
    request: UserCreate, 
    repo: UserRepository = Depends(get_repository)
):
    new_user = repo.create_user(request)
    if new_user == None:
        raise HTTPException(status_code=400, detail="Email bereits registriert")
    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int, 
    request: UserCreate, 
    repo: UserRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    """Update user profile"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    updated_user = repo.update_user(user_id, request)

    if updated_user == "EMAIL_EXISTS":
        raise HTTPException(status_code=400, detail="Email already registered")
    
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return updated_user