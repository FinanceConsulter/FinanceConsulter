from pydantic import BaseModel
from typing import Optional

class TransactionCreate(BaseModel):
    account_id: int
    category_id: int
    date: str
    description: Optional[str]
    amount_cents: int
    currency_code: Optional[str]

class TransactionUpdate(BaseModel):
    id: int
    account_id: Optional[int]
    category_id: Optional[int]
    date: Optional[str]
    description: Optional[str]
    amount_cents: Optional[int]
    currency_code: Optional[str]

class TransactionResponse[BaseModel]:
    id: int
    user_id: int
    account_id: int
    category_id: int
    date: str
    description: Optional[str]
    amount_cents: int
    currency_code: str
    created_at: str