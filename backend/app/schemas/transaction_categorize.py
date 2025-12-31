from datetime import date as date_type
from typing import Optional

from pydantic import BaseModel


class TransactionForCategorization(BaseModel):
    # client can pass an identifier to map results back
    client_id: Optional[str] = None

    date: Optional[date_type] = None
    description: Optional[str] = None
    amount_cents: int
    currency_code: Optional[str] = None


class TransactionCategorySuggestionResponse(BaseModel):
    client_id: Optional[str] = None
    category_id: Optional[int] = None
    score: float
