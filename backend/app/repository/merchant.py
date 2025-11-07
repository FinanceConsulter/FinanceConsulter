from sqlalchemy.orm import Session
from models.merchant import Merchant
from models.user import User
from schemas.merchant import MerchantCreate, MerchantResponse, MerchantUpdate

class RepositoryMerchant:
    def get_all(self, db: Session):
        merchants = db.query(Merchant).all()
        return merchants

    def get_userspecific_merchants(self, db: Session, user: User):
        merchants = db.query(Merchant).filter(User.id == user.id).all()
        return merchants
    
    # If merchant exists, True will be given back
    def check_existing_merchant(self, db: Session, user: User, merchant_name:str):
        existing_merchant = db.query(Merchant).filter(Merchant.user_id == user.id,Merchant.name == merchant_name).all()
        if existing_merchant:
            return True
        return False
    
    def create_merchant(self, db:Session, user: User, merchant:MerchantCreate):
        if self.check_existing_merchant(db, user, merchant.name):
            return None
        new_merchant = Merchant(
            user_id = user.id,
            name = merchant.name
        )
        db.add(new_merchant)
        db.commit()
        db.refresh(new_merchant)
        return new_merchant
    
    def update_merchant(self, db:Session, user: User, updated_merchant:MerchantUpdate):
        if self.check_existing_merchant(db, user, updated_merchant.new_name):
            return False
        merchant = db.query(Merchant).filter(Merchant.user_id == user.id,Merchant.id == updated_merchant.id).one_or_none() 
        merchant.name = updated_merchant.new_name
        db.add(merchant)
        db.commit()
        db.refresh(merchant)
        return merchant
        