from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from data_access.data_access import get_db
from sqlalchemy.orm import Session
from repository import user
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
import JWTToken

router = APIRouter(
    tags=['Authentication']
)

@router.post('/login')
def login(request:OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    auth_user = user.authenticate_user(db, request.username, request.password)
    if not auth_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Credentials")
    access_token_expires = timedelta(minutes=JWTToken.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = JWTToken.create_access_token(
        data={"sub": auth_user.email}
    )
    
    return {"access_token":access_token, "tokey_type" : "bearer"}