# Import Standard
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
import password

# Import Request
from schemas.user import UserCreate, UserResponse

# Import Model
from models.user import User
from repository import user

# Import DataAccess
from data_access.data_access import SessionLocal, get_db

router = APIRouter(
    prefix='/user',
    tags=['user']
)

@router.get("/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return user.get_all(db)

@router.get("/{user_id}", response_model=List[UserResponse])
def get_user(user_id: int, db: Session = Depends(get_db)):
    guser = user.get_user(db, user_id)
    if not guser:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return guser

@router.post("/", response_model=UserResponse, status_code=201)
def create_user(request: UserCreate, db: Session = Depends(get_db)):
    new_user = user.create_user(db, request)
    if new_user == None:
        raise HTTPException(status_code=400, detail="Email bereits registriert")
    return new_user