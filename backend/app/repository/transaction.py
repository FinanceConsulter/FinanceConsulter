from sqlalchemy.orm import Session
from models.user import User
from schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse, TransactionFilter
from models.transaction import Transaction
from repository.account import AccountRepository
from repository.tag import TagRepository
from InternalResponse import InternalResponse
from fastapi import status
from models.tag import TransactionTag

class TransactionRepository:
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
    
    def create_transaction(self, current_user: User, new_transaction:TransactionCreate):
        account_response = AccountRepository(self.db).check_existing_account_id(current_user, new_transaction.account_id)
        if account_response.state == status.HTTP_409_CONFLICT:
            return account_response
        transaction = Transaction(
            user_id = current_user.id,
            account_id = new_transaction.account_id,
            date = new_transaction.date,
            description = new_transaction.description,
            amount_cents = new_transaction.amount_cents,
            category_id = new_transaction.category_id,
            currency_code = new_transaction.currency_code
        )
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        # ToDo: Add tags
        tags = TagRepository(self.db).internal_get_tags_by_id(current_user, new_transaction.tags)
        print(type(tags))
        for tag in tags:
            transaction.tags.append(tag) 
        
        self.db.commit()
        self.db.refresh(transaction)
        return transaction.to_response()
    
    def filter_transactions(self, current_user: User, transaction_filter: TransactionFilter)->list[Transaction]|InternalResponse:
        return