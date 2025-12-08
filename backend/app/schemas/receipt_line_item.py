from pydantic import BaseModel
from typing import Optional, List
from schemas.tag import TagResponse

class ReceiptLineItemCreate(BaseModel):
    product_name: str
    quantity: float = 1.0
    unit_price_cents: Optional[int] = None
    total_price_cents: Optional[int] = None
    tags: Optional[List[int]] = []

class ReceiptLineItemUpdate(BaseModel):
    product_name: Optional[str] = None
    quantity: Optional[float] = None
    unit_price_cents: Optional[int] = None
    total_price_cents: Optional[int] = None
    tags: Optional[List[int]] = None

class ReceiptLineItemResponse(BaseModel):
    id: int
    receipt_id: int
    product_name: str
    quantity: float
    unit_price_cents: Optional[int]
    total_price_cents: Optional[int]
    tags: List[TagResponse]
