# Import Standard
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2

# Import Request
from schemas.merchant import MerchantCreate, MerchantResponse, MerchantUpdate

# Import Model
from models.merchant import Merchant
from models.user import User
from repository.merchant import RepositoryMerchant

# Import DataAccess
from data_access.data_access import get_db

router = APIRouter(
    prefix='/merchant',
    tags=['merchant']
)

@router.get("/", response_model=List[MerchantResponse])
def get_merchants(db:Session = Depends(get_db), current_user: User = Depends(oauth2.get_current_user)):
    merchants = RepositoryMerchant().get_userspecific_merchants(db, current_user)
    if merchants == []:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No merchants from this user were found")
    return merchants

@router.post("/new", response_model=MerchantResponse)
def create_merchant(merchant:MerchantCreate, db:Session = Depends(get_db),current_user: User = Depends(oauth2.get_current_user)):
    new_merchant = RepositoryMerchant().create_merchant(db,current_user, merchant)
    if new_merchant == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Something went wrong")
    return new_merchant

@router.put("/", response_model=MerchantResponse)
def update_merchant(merchant:MerchantUpdate, db:Session = Depends(get_db),current_user: User = Depends(oauth2.get_current_user)):
    updated_merchant = RepositoryMerchant().update_merchant(db, current_user, merchant)
    if not updated_merchant:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Something went wrong")
    return updated_merchant