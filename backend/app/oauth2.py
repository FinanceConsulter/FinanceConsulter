from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import JWTToken
from sqlalchemy.orm import Session
from data_access.data_access import get_db
from models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(
    db: Session = Depends(get_db),  # ← DB-Session hinzufügen!
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"}
    )
    token_data = JWTToken.verify_token(token, credentials_exception)
    user = db.query(User).filter(User.email == token_data.username).first()
    # user = db.query(User).filter(User.id == token_data.user_id).first()
    if user is None:
        raise credentials_exception
    
    return user
    