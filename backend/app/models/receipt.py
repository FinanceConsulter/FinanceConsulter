from sqlalchemy import Column, Integer, String, ForeignKey, Float, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from data_access.data_access import Base
from schemas.receipt import ReceiptResponse
from schemas.receipt_line_item import ReceiptLineItemResponse

class Receipt(Base):
    __tablename__ = "receipts"
    __table_args__ = (
        Index('idx_receipt_merchant', 'merchant_id'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    transaction_id = Column(Integer, ForeignKey('transactions.id', ondelete='SET NULL'))
    merchant_id = Column(Integer, ForeignKey('merchants.id', ondelete='SET NULL'))
    purchase_date = Column(String, nullable=False)
    total_cents = Column(Integer)
    raw_file_path = Column(String)
    ocr_text = Column(String)
    created_at = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="receipts")
    transaction = relationship("Transaction", back_populates="receipts")
    merchant = relationship("Merchant", back_populates="receipts")
    line_items = relationship("ReceiptLineItem", back_populates="receipt", cascade="all, delete-orphan")

    def to_response(self):
        return ReceiptResponse(
            id=self.id,
            user_id=self.user_id,
            transaction_id=self.transaction_id,
            merchant_id=self.merchant_id,
            purchase_date=self.purchase_date,
            total_cents=self.total_cents,
            raw_file_path=self.raw_file_path,
            ocr_text=self.ocr_text,
            created_at=self.created_at,
            line_items=[item.to_response() for item in self.line_items]
        )


class ReceiptLineItem(Base):
    __tablename__ = "receipt_line_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    receipt_id = Column(Integer, ForeignKey('receipts.id', ondelete='CASCADE'), nullable=False)
    product_name = Column(String, nullable=False)
    quantity = Column(Float, nullable=False, default=1.0)
    unit_price_cents = Column(Integer)
    total_price_cents = Column(Integer)

    # Relationships
    receipt = relationship("Receipt", back_populates="line_items")
    tags = relationship("ReceiptLineItemTag", back_populates="line_item", cascade="all, delete-orphan")

    def to_response(self):
        return ReceiptLineItemResponse(
            id=self.id,
            receipt_id=self.receipt_id,
            product_name=self.product_name,
            quantity=self.quantity,
            unit_price_cents=self.unit_price_cents,
            total_price_cents=self.total_price_cents,
            tags=[t.tag.to_response() for t in self.tags]
        )