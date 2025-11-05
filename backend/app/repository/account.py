from sqlalchemy.orm import Session
from models.user import User
from models.account import Account
from schemas.account import AccountCreate, AccountUpdate, AccountResponse

class RepositoryAccount:
    @staticmethod
    def convert_to_response(list:list[Account]):
        newList = []
        for item in list:
            newList.append(item.to_Respone())
        return newList
    
    def get_userspecific_accounts(self, db:Session, currentUser: User):
        accounts = db.query(Account).filter(User.id == currentUser.id).all()
        return self.convert_to_response(accounts)