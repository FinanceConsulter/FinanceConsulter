from pydantic import BaseModel
from typing import Optional

# Schema für User-Erstellung (REQUEST)
class UserCreate(BaseModel):
    email: str
    password_hash: str
    name: str
    first_name: str

# Schema für User-Response (RESPONSE)
class UserResponse(BaseModel):
    id: int
    email: str
    password_hash: str
    name: str
    first_name: str
    created_at: str
    
    class Config:
        from_attributes = True