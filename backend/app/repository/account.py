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
    
    def get_userspecific_accounts(self, db:Session, current_user: User):
        accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
        return self.convert_to_response(accounts)
    
    def get_account(self, db:Session, current_user: User, account_id: int):
        account = db.query(Account).filter(Account.user_id == current_user.id, Account.id == account_id).first()
        if account == None:
            return None
        return account.to_response()
 
    def create_account(self, db:Session, current_user: User, account: AccountCreate):
        if self.check_existing_account(db,current_user, account.name):
            return None
        new_account = Account(
            user_id = current_user.id,
            name = account.name,
            type = account.type,
            currency_code = account.currency_code
        )
        db.add(new_account)
        db.commit()
        db.refresh(new_account)
        return new_account.to_response()
    
    def update_account(self, db:Session, current_user: User, updated_account: AccountUpdate):
        if self.check_existing_account(db, current_user, updated_account.name):
            return None
        account = db.query(Account).filter(
            Account.id == updated_account.id,
            Account.user_id == current_user.id
        ).first()
        if not updated_account.name == "":
            account.name = updated_account.name
        if not updated_account.type == "":
            account.type = updated_account.type
        if not updated_account.currency_code == "":
            account.currency_code = updated_account.currency_code
        db.add(account)
        db.commit()
        db.refresh(account)
        return account.to_response()
    
    def check_existing_account(self, db:Session, current_user: User, account_name: str):
        existing_account = db.query(Account).filter(
            Account.name == account_name, 
            Account.user_id == current_user.id).first()
        if existing_account:
            return True
        return False