# models/__init__.py
from .user import User
from .account import Account
from .category import Category
from .transaction import Transaction
from .merchant import Merchant
from .receipt import Receipt
from .tag import Tag

# Exportiere alle Models
__all__ = ['User', 'Account', 'Category', 'Transaction', 'Merchant', 'Receipt', 'Tag', 'ai_insights']