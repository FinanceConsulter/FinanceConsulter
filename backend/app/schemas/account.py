from pydantic import BaseModel, Field, field_validator
from typing import Optional

class AccountCreate(BaseModel):
    name: str
    type: str
    currency_code: str
    
class AccountUpdate(BaseModel):
    id: int
    name: Optional[str] = None
    type: Optional[str] = None
    currency_code: Optional[str] = None
    
    @field_validator('name', 'type', 'currency_code')
    def empty_str_to_none(cls, v):
        if v == '':
            return None
        return v

class AccountResponse(BaseModel):
    id: int
    user_id: int
    name: str
    type: str
    currency_code: str
    
