from sqlalchemy.orm import Session
from models.user import User
from models.account import Account
from schemas.account import AccountCreate, AccountUpdate, AccountResponse

class RepositoryAccount:
    @staticmethod
    def convert_to_response(list:list[Account]):
        newList = []
        for item in list:
            newList.append(item.to_response())
        return newList
    
    def get_userspecific_accounts(self, db:Session, currentUser: User):
        accounts = db.query(Account).filter(User.id == currentUser.id).all()
        return self.convert_to_response(accounts)
    
    def create_account(self, db:Session, currentUser: User, account: AccountCreate):
        if self.check_existing_account(db,currentUser, account):
            return None
        new_account = Account(
            user_id = currentUser.id,
            name = account.name,
            type = account.type,
            currency_code = account.currency_code
        )
        db.add(new_account)
        db.commit()
        db.refresh(new_account)
        return new_account.to_response()
    
    def check_existing_account(self, db:Session, currentUser: User, account: AccountCreate):
        existing_account = db.query(Account).filter(Account.name == account.name, Account.user_id == currentUser.id).first()
        if existing_account:
            return True
        return False