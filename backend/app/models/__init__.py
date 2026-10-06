# models/__init__.py
from .user import User
from .account import Account
from .category import Category
from .transaction import Transaction
from .merchant import Merchant
from .receipt import Receipt, ReceiptLineItem
from .tag import Tag, TransactionTag, ReceiptLineItemTag
from .ai_insights import AIInsight

# Exportiere alle Models
__all__ = [
    'User', 'Account', 'Category', 'Transaction', 'Merchant', 'Receipt', 'ReceiptLineItem',
    'Tag', 'TransactionTag', 'ReceiptLineItemTag', 'AIInsight',
]
