from sqlalchemy.orm import Session
from models.user import User
from schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from models.transaction import Transaction

class TransactionRepository:
    @staticmethod
    def convert_to_response(list:list[Transaction]):
        new_list = []
        for item in list:
            new_list.append(item.to_response())
        return new_list

    def get_userspecific_transaction(self, db:Session, currentUser: User):
        return