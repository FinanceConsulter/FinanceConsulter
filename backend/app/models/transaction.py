from sqlalchemy import Column, Integer, String, ForeignKey, Index, Date
from sqlalchemy.orm import relationship
from datetime import datetime, date
from data_access.data_access import Base
from schemas.transaction import TransactionResponse

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
    date = Column(Date, nullable=False)
    description = Column(String)
    amount_cents = Column(Integer, nullable=False)  # negative = out, positive = in
    currency_code = Column(String, nullable=False, default='CHF')
    created_at = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    _tag_links = relationship(
        "TransactionTag", 
        back_populates="transaction", 
        cascade="all, delete-orphan"
    )
    tags = relationship(
        "Tag", 
        secondary="transaction_tags", 
        back_populates="transactions",
        overlaps="_tag_links"
    )
    receipts = relationship("Receipt", back_populates="transaction")

    def to_response(self):
        return TransactionResponse(
            id=self.id,
            user_id = self.user_id,
            account_id=self.account_id,
            category_id=self.category_id,
            date=self.date,
            description=self.description,
            amount_cents=self.amount_cents,
            currency_code=self.currency_code,
            created_at=self.created_at,
            tags=self.tags
        )