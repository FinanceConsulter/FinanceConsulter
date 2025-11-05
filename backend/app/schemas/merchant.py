from pydantic import BaseModel, EmailStr
from typing import Optional

class MerchantCreate(BaseModel):
    name: str

class MerchantUpdate(BaseModel):
    id: int
    new_name: str

class MerchantResponse(BaseModel):
    id: int
    user_id: int
    name: str
    created_at: str