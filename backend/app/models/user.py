from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from data_access.data_access import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255))
    name = Column(String(100))
    first_name = Column(String(100))
    last_name = Column(String(100))
    created_at = Column(String(50), nullable=False, default=lambda: datetime.utcnow().isoformat())

    # Relationships
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    merchants = relationship("Merchant", back_populates="user", cascade="all, delete-orphan")
    receipts = relationship("Receipt", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")