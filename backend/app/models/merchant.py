from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from data_access.data_access import Base

class Merchant(Base):
    __tablename__ = "merchants"
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_merchant_name'),
        Index('idx_merchant_user', 'user_id'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="merchants")
    receipts = relationship("Receipt", back_populates="merchant")