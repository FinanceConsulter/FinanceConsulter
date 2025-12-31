from pydantic import BaseModel, EmailStr
from typing import Optional

# Schema für User-Erstellung (REQUEST)
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None  # Optional gemacht
    first_name: Optional[str] = None  # Optional gemacht
    last_name: Optional[str] = None  # Optional gemacht


# Schema für User-Update (REQUEST)
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

# Schema für User-Response (RESPONSE)
class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: Optional[str] = None  # Optional!
    first_name: Optional[str] = None  # Optional!
    last_name: Optional[str] = None  # Optional!
    created_at: str
    
    class Config:
        from_attributes = True