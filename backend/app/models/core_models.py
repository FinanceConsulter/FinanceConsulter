from __future__ import annotations
from typing import List
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, ForeignKey, DateTime, Integer as Int, UniqueConstraint,
    Table
)
from sqlalchemy.orm import relationship

from .base import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String)
    name = Column(String)
    first_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    accounts = relationship('Accounts', back_populates='user', cascade='all, delete-orphan')
    categories = relationship('Categories', back_populates='user', cascade='all, delete-orphan')
    merchants = relationship('Merchants', back_populates='user', cascade='all, delete-orphan')
    transactions = relationship('Transactions', back_populates='user', cascade='all, delete-orphan')
    receipts = relationship('Receipts', back_populates='user', cascade='all, delete-orphan')
    tags = relationship('Tags', back_populates='user', cascade='all, delete-orphan')

class Account(Base):
    __tablename__ = 'accounts'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    currency_code = Column(String, nullable=False, default='EUR')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship('User', back_populates='accounts')
    transactions = relationship('Transaction', back_populates='account')

    __table_args__ = (UniqueConstraint('user_id','name', name='uq_account_user_name'),)

class Category(Base):
    __tablename__ = 'categories'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    parent_id = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'))
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)

    user = relationship('User', back_populates='categories')
    parent = relationship('Category', remote_side=[id])
    transactions = relationship('Transaction', back_populates='category')

    __table_args__ = (UniqueConstraint('user_id','name', name='uq_category_user_name'),)

class Merchant(Base):
    __tablename__ = 'merchants'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship('User', back_populates='merchants')
    receipts = relationship('Receipt', back_populates='merchant')

    __table_args__ = (UniqueConstraint('user_id','name', name='uq_merchant_user_name'),)

class Transaction(Base):
    __tablename__ = 'transactions'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    account_id = Column(Integer, ForeignKey('accounts.id', ondelete='CASCADE'), nullable=False)
    category_id = Column(Integer, ForeignKey('categories.id', ondelete='SET NULL'))
    date = Column(DateTime, nullable=False)
    description = Column(Text)
    amount_cents = Column(Integer, nullable=False)
    currency_code = Column(String, nullable=False, default='EUR')
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship('User', back_populates='transactions')
    account = relationship('Account', back_populates='transactions')
    category = relationship('Category', back_populates='transactions')
    receipt = relationship('Receipt', back_populates='transaction', uselist=False)
    tags = relationship('Tag', secondary='transaction_tags', back_populates='transactions')

class Receipt(Base):
    __tablename__ = 'receipts'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    transaction_id = Column(Integer, ForeignKey('transactions.id', ondelete='SET NULL'))
    merchant_id = Column(Integer, ForeignKey('merchants.id', ondelete='SET NULL'))
    purchase_date = Column(DateTime, nullable=False)
    total_cents = Column(Integer)
    raw_file_path = Column(String)
    ocr_text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship('User', back_populates='receipts')
    transaction = relationship('Transaction', back_populates='receipt')
    merchant = relationship('Merchant', back_populates='receipts')
    line_items = relationship('ReceiptLineItem', back_populates='receipt', cascade='all, delete-orphan')

class ReceiptLineItem(Base):
    __tablename__ = 'receipt_line_items'
    id = Column(Integer, primary_key=True)
    receipt_id = Column(Integer, ForeignKey('receipts.id', ondelete='CASCADE'), nullable=False)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price_cents = Column(Integer)
    total_price_cents = Column(Integer)

    receipt = relationship('Receipt', back_populates='line_items')
    tags = relationship('Tag', secondary='receipt_line_item_tags', back_populates='line_items')

class Tag(Base):
    __tablename__ = 'tags'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship('User', back_populates='tags')
    transactions = relationship('Transaction', secondary='transaction_tags', back_populates='tags')
    line_items = relationship('ReceiptLineItem', secondary='receipt_line_item_tags', back_populates='tags')

    __table_args__ = (UniqueConstraint('user_id','name', name='uq_tag_user_name'),)

# Association Tables
from sqlalchemy import Table, Column
from sqlalchemy import MetaData

transaction_tags = Table(
    'transaction_tags', Base.metadata,
    Column('transaction_id', Integer, ForeignKey('transactions.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)

receipt_line_item_tags = Table(
    'receipt_line_item_tags', Base.metadata,
    Column('line_item_id', Integer, ForeignKey('receipt_line_items.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)
