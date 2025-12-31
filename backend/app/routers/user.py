# Import Standard
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2
from schemas.user import UserCreate
from models.user import User

# Import Request
from schemas.user import UserCreate, UserResponse, UserUpdate, PasswordChangeRequest

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
    request: UserUpdate, 
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


@router.put("/{user_id}/password", response_model=UserResponse)
def change_password(
    user_id: int,
    request: PasswordChangeRequest,
    repo: UserRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    """Change user password"""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    result = repo.change_password(user_id, request.current_password, request.new_password)

    if result is None:
        raise HTTPException(status_code=404, detail="User not found")

    if result == "NO_PASSWORD_SET":
        raise HTTPException(status_code=400, detail="No password set for this user")

    if result == "INVALID_CURRENT_PASSWORD":
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    return result