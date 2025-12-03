
from sqlalchemy.orm import Session
from models.user import User
from schemas.user import UserCreate, UserResponse
import password

class UserRepository:
    def __init__(self, db:Session):
        self.db = db

    def get_all(self):
        users = self.db.query(User).all()
        return users

    def get_user(self, user_id: int):
        return self.db.query(User).filter(User.id == user_id).first()

    def authenticate_user(self, user_email: str, user_password: str):
        auth_user =  self.db.query(User).filter(User.email == user_email).first()
        if not auth_user:
            return None
        if not password.verify_password(user_password, auth_user.password_hash):
            return None
        return auth_user

    def create_user(self, request: UserCreate):
        if self.check_existingUser(request):
            return None
        new_user = User(
            email=request.email,
            password_hash=password.get_pwd_hash(request.password),
            name=request.name,
            first_name=request.first_name,
            last_name=request.last_name
        )
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        return new_user

    def check_existingUser(self, request: UserCreate):
        existing_user = self.db.query(User).filter(User.email == request.email).first()
        if existing_user:
            return True
        return False
    
    def update_user(self, user_id: int, request: UserCreate):
        user = self.get_user(user_id)
        if not user:
            return None

        # Check if email is being changed and if the new one already exists
        if request.email and request.email != user.email:
            if self.db.query(User).filter(User.email == request.email).first():
                return "EMAIL_EXISTS"

        update_data = request.model_dump(exclude_unset=True)
        
        if 'password' in update_data and update_data['password']:
            update_data['password_hash'] = password.get_pwd_hash(update_data['password'])
        
        # Remove password from update_data to avoid updating it directly
        if 'password' in update_data:
            del update_data['password']

        for field, value in update_data.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user
