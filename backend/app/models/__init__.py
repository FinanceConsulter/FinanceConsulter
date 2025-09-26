from .base import Base
from .core_models import (
    User, Account, Category, Merchant,
    Transaction, Receipt, ReceiptLineItem,
    Tag, transaction_tags, receipt_line_item_tags
)

__all__ = [
    'Base','User','Account','Category','Merchant','Transaction','Receipt','ReceiptLineItem','Tag','transaction_tags','receipt_line_item_tags'
]

# Helper (optional): engine + session factory
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def get_engine(db_path: str = 'sqlite:///../db/finance_consulter.db'):
    return create_engine(db_path, echo=False, future=True)

def get_session_factory(db_path: str = 'sqlite:///../db/finance_consulter.db'):
    engine = get_engine(db_path)
    return sessionmaker(bind=engine, expire_on_commit=False, autoflush=False)
