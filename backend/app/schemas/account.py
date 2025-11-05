from pydantic import BaseModel
from typing import Optional

class AccountCreate(BaseModel):
    name: str
    type: str
    currency_code: str
    
class AccountUpdate(BaseModel):
    id: int
    name: Optional[str]
    type: Optional[str]
    currency_code: Optional[str]

class AccountResponse(BaseModel):
    id: int
    user_id: int
    name: str
    type: str
    currency_code: str
    
