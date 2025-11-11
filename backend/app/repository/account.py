from sqlalchemy.orm import Session
from models.user import User
from models.account import Account
from schemas.account import AccountCreate, AccountUpdate, AccountResponse
from InternalResponse import InternalResponse
from fastapi import status
class AccountRepository:
    def __init__(self, db:Session):
        self.db = db
        
    @staticmethod
    def convert_to_response(list:list[Account]):
        newList = []
        for item in list:
            newList.append(item.to_response())
        return newList
    
    def get_userspecific_accounts(self, current_user: User):
        accounts = self.db.query(Account).filter(
            Account.user_id == current_user.id
        ).all()
        return self.convert_to_response(accounts)
    
    def get_account(self, current_user: User, account_id: int):
        account = self.db.query(Account).filter(
            Account.user_id == current_user.id, 
            Account.id == account_id
        ).first()
        if account == None:
            return None
        return account.to_response()
 
    def create_account(self, current_user: User, account: AccountCreate):
        if self.check_existing_account(current_user, account.name):
            return None
        new_account = Account(
            user_id = current_user.id,
            **account.model_dump()
        )
        self.db.add(new_account)
        self.db.commit()
        self.db.refresh(new_account)
        return new_account.to_response()
    
    def update_account(self, current_user: User, updated_account: AccountUpdate):
        if self.check_existing_account(current_user, updated_account.name):
            return None
        account = self.db.query(Account).filter(
            Account.id == updated_account.id,
            Account.user_id == current_user.id
        ).first()
        
        update_data = updated_account.model_dump(exclude_none=True)
        for field, value in update_data.items():
            if field != 'id':
                setattr(account, field, value)
            
        self.db.commit()
        self.db.refresh(account)
        return account.to_response()
    
    def check_existing_account(self, current_user: User, account_name: str):
        existing_account = self.db.query(Account).filter(
            Account.name == account_name, 
            Account.user_id == current_user.id).first()
        if existing_account:
            return True
        return False
    
    def check_existing_account_id(self, current_user: User, account_id: int):
        existing_account = self.db.query(Account).filter(
            Account.name == account_id, 
            Account.user_id == current_user.id).first()
        if existing_account:
            return InternalResponse(state=status.HTTP_200_OK, detail=f"Found account with id {account_id} and name {existing_account.name} for user {current_user.id}")
        return InternalResponse(state=status.HTTP_409_CONFLICT, detail=f"Found no account with id {account_id} for user {current_user.id}")