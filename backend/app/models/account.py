from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from data_access.data_access import Base
from schemas.account import AccountResponse

class Account(Base):
    __tablename__ = "accounts"
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='uq_user_account_name'),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # 'asset', 'liability', 'cash'
    currency_code = Column(String, nullable=False, default='CHF')
    created_at = Column(String, nullable=False, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    
    def to_response(self):
        return AccountResponse(
            id=self.id, 
            user_id=self.user_id, 
            name=self.name, 
            type=self.type,
            currency_code=self.currency_code,
            transactions = self.transactions
        )