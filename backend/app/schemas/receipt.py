from pydantic import BaseModel
from typing import Optional, List
from schemas.receipt_line_item import ReceiptLineItemResponse, ReceiptLineItemCreate

class ReceiptCreate(BaseModel):
    merchant_id: Optional[int] = None
    purchase_date: str
    total_cents: Optional[int] = None
    raw_file_path: Optional[str] = None
    ocr_text: Optional[str] = None
    line_items: Optional[List[ReceiptLineItemCreate]] = []

class ReceiptUpdate(BaseModel):
    merchant_id: Optional[int] = None
    purchase_date: Optional[str] = None
    total_cents: Optional[int] = None
    raw_file_path: Optional[str] = None
    ocr_text: Optional[str] = None

class ReceiptResponse(BaseModel):
    id: int
    user_id: int
    transaction_id: Optional[int]
    merchant_id: Optional[int]
    purchase_date: str
    total_cents: Optional[int]
    raw_file_path: Optional[str]
    ocr_text: Optional[str]
    created_at: str
    line_items: List[ReceiptLineItemResponse]
