from sqlalchemy.orm import Session
from models.user import User
from schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from models.transaction import Transaction

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
        # ToDo: check account
        # ToDo: Add category_id
        transaction = Transaction(
            user_id = current_user.id,
            account_id = new_transaction.account_id,
            date = new_transaction.date,
            description = new_transaction.description,
            amount_cents = new_transaction.amount_cents,
            category_id = new_transaction.category_id,
            currency_code = new_transaction.currency_code
        )
        # ToDo: Add tags
        self.db.add(transaction)
        self.db.commit()
        self.db.refresh(transaction)
        return transaction.to_response()
    