from sqlalchemy import Column, Integer, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from data_access.data_access import Base

class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index('idx_tx_user_date', 'user_id', 'date'),
        Index('idx_tx_category', 'category_id'),
        Index('idx_tx_account', 'account_id'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    account_id = Column(Integer, ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'))
    date = Column(String, nullable=False)
    description = Column(String)
    amount_cents = Column(Integer, nullable=False)  # negative = out, positive = in
    currency_code = Column(String, nullable=False, default='EUR')
    created_at = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    tags = relationship("TransactionTag", back_populates="transaction", cascade="all, delete-orphan")
    receipts = relationship("Receipt", back_populates="transaction")