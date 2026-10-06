from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import date as date_type
from schemas.tag import TagResponse

class TransactionCreate(BaseModel):
    account_id: int
    date: date_type
    description: Optional[str] = None
    amount_cents: int
    currency_code: Optional[str] = None
    tags: Optional[list[int]] = None
    category_id: Optional[int] = None
    
    @field_validator('description')
    def empty_str_to_none(cls,item):
        if item == '':
            return None
        return item
    
    @field_validator('category_id')
    def zero_to_none(cls, item):
        if item == 0:
            return None
        return item
    
    @field_validator('tags', mode='before')
    @classmethod
    def filter_zero_tags(cls, value):
        if value is None:
            return None
        return [item for item in value if item != 0]
    

class TransactionUpdate(BaseModel):
    id: Optional[int] = None
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    date: Optional[date_type] = None
    description: Optional[str] = None
    amount_cents: Optional[int] = None
    currency_code: Optional[str] = None
    tags: Optional[list[int]] = None
    
    @field_validator('tags', mode='before')
    @classmethod
    def filter_zero_tags(cls, value):
        if value is None:
            return None
        return [item for item in value if item != 0]

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    account_id: int
    category_id: Optional[int]
    date: date_type
    description: Optional[str]
    amount_cents: int
    currency_code: str
    created_at: str
    tags: Optional[list[TagResponse]]

    model_config = ConfigDict(from_attributes=True)

class TransactionFilter(BaseModel):
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    date: Optional[date_type] = None
    date_operation: Optional[str] = None
    description: Optional[str] = None
    amount_cents: Optional[int] = None
    amount_operation: Optional[str] = None
    currency_code: Optional[str] = None
    created_at: Optional[str] = None

    @field_validator('date', 'date_operation', 'description', 'amount_operation', 'currency_code', 'created_at')
    def empty_str_to_none(cls,item):
        if item == '':
            return None
        return item
    
    @field_validator('account_id','category_id', 'amount_cents')
    def zero_to_none(cls, item):
        if item == 0:
            return None
        return item