from sqlalchemy.orm import Session
from models.user import User
from schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse, TransactionFilter
from models.transaction import Transaction
from repository.account import AccountRepository
from repository.tag import TagRepository
from InternalResponse import InternalResponse
from fastapi import status
from models.tag import TransactionTag
from models.receipt import Receipt
from models.category import Category
from repository.category import CategoryRepository
import operator
import os

# services.transaction_categorizer (sentence-transformers) wird erst bei Bedarf importiert

class TransactionRepository:
    # Erlaubte Vergleichsoperatoren für filter_transactions (date_operation / amount_operation)
    _FILTER_OPERATIONS = {
        'eq': operator.eq, '=': operator.eq, '==': operator.eq,
        'lt': operator.lt, '<': operator.lt,
        'lte': operator.le, 'le': operator.le, '<=': operator.le,
        'gt': operator.gt, '>': operator.gt,
        'gte': operator.ge, 'ge': operator.ge, '>=': operator.ge,
    }

    def __init__(self, db: Session):
        self.db = db
    
    @staticmethod
    def convert_to_response(list:list[Transaction]):
        new_list = []
        for item in list:
            new_list.append(item.to_response())
        return new_list

    def get_userspecific_transaction(self, current_user: User):
        transactions = self.db.query(Transaction).filter(
            Transaction.user_id == current_user.id
        ).all()
        return self.convert_to_response(transactions)
    
    def get_transaction(self, current_user: User, transaction_id: int):
        transaction = self.db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.id == transaction_id
        ).first()
        if transaction == None:
            return None
        return transaction.to_response()
    
    def _owns_category(self, current_user: User, category_id: int) -> bool:
        return self.db.query(Category.id).filter(
            Category.id == category_id,
            Category.user_id == current_user.id
        ).first() is not None

    def create_transaction(self, current_user: User, new_transaction:TransactionCreate):
        account_response = AccountRepository(self.db).check_existing_account_id(current_user, new_transaction.account_id)
        if account_response.state == status.HTTP_409_CONFLICT:
            return account_response

        category_id = new_transaction.category_id
        if category_id is not None and not self._owns_category(current_user, category_id):
            return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Category not found")

        if category_id is None:
            try:
                # Lazy import: optional ML dependency (sentence-transformers)
                from services.transaction_categorizer import CategoryCandidate, suggest_category_for_transaction

                threshold = float(os.getenv('CATEGORY_AUTO_THRESHOLD', '0.5'))
                min_threshold = float(os.getenv('CATEGORY_AUTO_MIN_THRESHOLD', '0.35'))
                min_margin = float(os.getenv('CATEGORY_AUTO_MIN_MARGIN', '0.03'))
                categories = CategoryRepository(self.db).get_userspecific_categories(current_user)
                candidates = [
                    CategoryCandidate(
                        id=c.id,
                        name=c.name,
                        type=c.type,
                        parent_id=c.parent_id,
                        description=c.description,
                    )
                    for c in categories
                ]

                suggestion = suggest_category_for_transaction(
                    categories=candidates,
                    description=new_transaction.description,
                    amount_cents=new_transaction.amount_cents,
                    currency_code=new_transaction.currency_code,
                    threshold=threshold,
                )
                category_id = suggestion.category_id
                if (
                    category_id is None
                    and suggestion.best_category_id is not None
                    and suggestion.score >= min_threshold
                    and suggestion.margin >= min_margin
                ):
                    category_id = suggestion.best_category_id
            except Exception:
                # Categorization is best-effort; creating the transaction must still succeed.
                category_id = None

        transaction = Transaction(
            user_id = current_user.id,
            account_id = new_transaction.account_id,
            date = new_transaction.date,
            description = new_transaction.description,
            amount_cents = new_transaction.amount_cents,
            category_id = category_id,
            currency_code = new_transaction.currency_code
        )
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        
        if new_transaction.tags is not None and len(new_transaction.tags) > 0:
            tags = TagRepository(self.db).internal_get_tags_by_id(current_user, new_transaction.tags)
            for tag in tags:
                transaction.tags.append(tag)
            self.db.commit()
            self.db.refresh(transaction)
        
        return transaction.to_response()
    
    def filter_transactions(self, current_user: User, transaction_filter: TransactionFilter)->list[TransactionResponse]|InternalResponse:
        query = self.db.query(Transaction).filter(Transaction.user_id == current_user.id)

        if transaction_filter.account_id is not None:
            query = query.filter(Transaction.account_id == transaction_filter.account_id)
        if transaction_filter.category_id is not None:
            query = query.filter(Transaction.category_id == transaction_filter.category_id)
        if transaction_filter.description is not None:
            query = query.filter(Transaction.description.icontains(transaction_filter.description, autoescape=True))
        if transaction_filter.currency_code is not None:
            query = query.filter(Transaction.currency_code == transaction_filter.currency_code)
        if transaction_filter.created_at is not None:
            query = query.filter(Transaction.created_at.startswith(transaction_filter.created_at, autoescape=True))

        # date / amount_cents with optional comparison operation (default: equal)
        for column, value, operation in (
            (Transaction.date, transaction_filter.date, transaction_filter.date_operation),
            (Transaction.amount_cents, transaction_filter.amount_cents, transaction_filter.amount_operation),
        ):
            if value is None:
                continue
            compare = self._FILTER_OPERATIONS.get((operation or 'eq').strip().lower())
            if compare is None:
                return InternalResponse(state=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported filter operation '{operation}'")
            query = query.filter(compare(column, value))

        return self.convert_to_response(query.order_by(Transaction.date.desc(), Transaction.id.desc()).all())
    
    def update_transaction(self, current_user: User, transaction_id: int, transaction_update: TransactionUpdate)->Transaction|InternalResponse:
        transaction = self.db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.id == transaction_id
        ).first()
        
        if transaction == None:
            return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

        # Explizit gesendete Felder (auch null), damit category_id/tags geleert werden können
        fields = transaction_update.model_fields_set
        
        # Update transaction fields
        if transaction_update.date is not None:
            transaction.date = transaction_update.date

        if transaction_update.description is not None:
            transaction.description = transaction_update.description

        if transaction_update.amount_cents is not None:
            transaction.amount_cents = transaction_update.amount_cents

        if transaction_update.account_id is not None:
            account_response = AccountRepository(self.db).check_existing_account_id(current_user, transaction_update.account_id)
            if account_response.state != status.HTTP_200_OK:
                return account_response
            transaction.account_id = transaction_update.account_id

        if 'category_id' in fields:
            if transaction_update.category_id is not None and not self._owns_category(current_user, transaction_update.category_id):
                return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Category not found")
            transaction.category_id = transaction_update.category_id

        if transaction_update.currency_code is not None:
            transaction.currency_code = transaction_update.currency_code
            
        if 'tags' in fields:
            transaction.tags.clear()
            tags = TagRepository(self.db).internal_get_tags_by_id(current_user, transaction_update.tags or [])
            for tag in tags:
                transaction.tags.append(tag)
        
        self.db.commit()
        self.db.refresh(transaction)
        return transaction.to_response()

    def remove_category(self, current_user: User, transaction_id: int)->TransactionResponse|InternalResponse:
        transaction = self.db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.id == transaction_id
        ).first()

        if transaction == None:
            return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

        transaction.category_id = None
        self.db.commit()
        self.db.refresh(transaction)
        return transaction.to_response()
    
    def delete_transaction(self, current_user: User, transaction_id: int)->InternalResponse:
        transaction = self.db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.id == transaction_id
        ).first()
        
        if transaction == None:
            return InternalResponse(state=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
        
        self.db.delete(transaction)
        self.db.commit()
        return InternalResponse(state=status.HTTP_200_OK, detail="Transaction deleted successfully")