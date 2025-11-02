
from sqlalchemy.orm import Session
from models.user import User
from schemas.user import UserCreate, UserResponse
import password

def get_all(db: Session):
    users = db.query(User).all()
    return users

def get_user(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session,request: UserCreate):
    if check_existingUser(db, request):
        return None
    new_user = User(
        email=request.email,
        password_hash=password.get_pwd_hash(request.password),
        name=request.name,
        first_name=request.first_name,
        last_name=request.last_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def check_existingUser(db: Session, request: UserCreate):
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        return True