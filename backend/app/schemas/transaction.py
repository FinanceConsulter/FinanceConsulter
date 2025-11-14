from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date
from schemas.tag import TagResponse

class TransactionCreate(BaseModel):
    account_id: int
    date: date
    description: Optional[str]
    amount_cents: int
    currency_code: Optional[str]
    tags: Optional[list[int]]
    category_id: Optional[int]
    
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
    id: int
    account_id: Optional[int]
    category_id: Optional[int]
    date: Optional[date]
    description: Optional[str]
    amount_cents: Optional[int]
    currency_code: Optional[str]

class TransactionResponse(BaseModel):
    id: int
    user_id: int
    account_id: int
    category_id: Optional[int]
    date: date
    description: Optional[str]
    amount_cents: int
    currency_code: str
    created_at: str
    tags: Optional[list[TagResponse]]

class TransactionFilter(BaseModel):
    account_id: Optional[int]
    category_id: Optional[int]
    date: Optional[date]
    date_operation: Optional[str]
    description: Optional[str]
    amount_cents: Optional[int]
    amount_operation: Optional[str]
    currency_code: Optional[str]
    created_at: Optional[str]

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