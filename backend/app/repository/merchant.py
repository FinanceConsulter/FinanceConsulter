from sqlalchemy.orm import Session
from models.merchant import Merchant
from models.user import User
from schemas.merchant import MerchantCreate, MerchantResponse, MerchantUpdate

class MerchantRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self):
        merchants = self.db.query(Merchant).all()
        return merchants

    def get_userspecific_merchants(self, user: User):
        merchants = self.db.query(Merchant).filter(Merchant.user_id == user.id).all()
        return merchants
    
    def get_merchant(self, user: User, merchant_id: int):
        merchant = self.db.query(Merchant).filter(
            Merchant.user_id == user.id,
            Merchant.id == merchant_id
        ).first()
        return merchant

    # If merchant exists, True will be given back
    def check_existing_merchant(self, user: User, merchant_name:str):
        existing_merchant = self.db.query(Merchant).filter(Merchant.user_id == user.id,Merchant.name == merchant_name).all()
        if existing_merchant:
            return True
        return False
    
    def create_merchant(self, user: User, merchant:MerchantCreate):
        if self.check_existing_merchant(user, merchant.name):
            return None
        new_merchant = Merchant(
            user_id = user.id,
            name = merchant.name
        )
        self.db.add(new_merchant)
        self.db.commit()
        self.db.refresh(new_merchant)
        return new_merchant
    
    def update_merchant(self, user: User, updated_merchant:MerchantUpdate):
        if self.check_existing_merchant(user, updated_merchant.new_name):
            return False
        merchant = self.db.query(Merchant).filter(Merchant.user_id == user.id,Merchant.id == updated_merchant.id).one_or_none() 
        if not merchant:
            return None
        merchant.name = updated_merchant.new_name
        self.db.add(merchant)
        self.db.commit()
        self.db.refresh(merchant)
        return merchant

    def delete_merchant(self, user: User, merchant_id: int):
        merchant = self.db.query(Merchant).filter(
            Merchant.user_id == user.id,
            Merchant.id == merchant_id
        ).first()
        
        if not merchant:
            return False
            
        self.db.delete(merchant)
        self.db.commit()
        return True
        