from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from data_access.data_access import Base
from schemas.tag import TagResponse

class Tag(Base):
    __tablename__ = "tags"
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_tag_name'),
        Index('idx_tag_user', 'user_id'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String)
    created_at = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="tags")
    transaction_tags = relationship("TransactionTag", back_populates="tag", cascade="all, delete-orphan")
    line_item_tags = relationship("ReceiptLineItemTag", back_populates="tag", cascade="all, delete-orphan")
    transactions = relationship(
        "Transaction", 
        secondary="transaction_tags", 
        overlaps="tags" 
    )
    def to_response(self):
        return TagResponse(
            id = self.id,
            user_id = self.user_id,
            name = self.name,
            color = self.color
        )
    

class TransactionTag(Base):
    __tablename__ = "transaction_tags"
    __table_args__ = (
        Index('idx_trx_tag_tag', 'tag_id'),
    )

    transaction_id = Column(Integer, ForeignKey('transactions.id', ondelete='CASCADE'), primary_key=True)
    tag_id = Column(Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)

    # Relationships
    transaction = relationship("Transaction", back_populates="_tag_links") 
    tag = relationship("Tag", back_populates="transaction_tags")


class ReceiptLineItemTag(Base):
    __tablename__ = "receipt_line_item_tags"
    __table_args__ = (
        Index('idx_line_item_tag_tag', 'tag_id'),
    )

    line_item_id = Column(Integer, ForeignKey('receipt_line_items.id', ondelete='CASCADE'), primary_key=True)
    tag_id = Column(Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)

    # Relationships
    line_item = relationship("ReceiptLineItem", back_populates="tags")
    tag = relationship("Tag", back_populates="line_item_tags")