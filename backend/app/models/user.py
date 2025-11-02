from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from data_access.data_access import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), nullable=False, unique=True)  # Länge hinzugefügt
    password_hash = Column(String(255))  # Länge hinzugefügt
    name = Column(String(100))  # Länge hinzugefügt
    first_name = Column(String(100))  # Länge hinzugefügt
    last_name = Column(String(100))  # Länge hinzugefügt
    created_at = Column(String(50), nullable=False, default=lambda: datetime.utcnow().isoformat())  # Länge hinzugefügt

    # Relationships
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    merchants = relationship("Merchant", back_populates="user", cascade="all, delete-orphan")
    receipts = relationship("Receipt", back_populates="user", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="user", cascade="all, delete-orphan")