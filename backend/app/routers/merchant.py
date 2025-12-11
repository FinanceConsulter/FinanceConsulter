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
from repository.merchant import MerchantRepository

# Import DataAccess
from data_access.data_access import get_db

router = APIRouter(
    prefix='/merchant',
    tags=['merchant']
)

def get_repository(db: Session = Depends(get_db)) -> MerchantRepository:
    return MerchantRepository(db)

@router.get("/", response_model=List[MerchantResponse])
def get_merchants(
    repo: MerchantRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    merchants = repo.get_userspecific_merchants(current_user)
    if merchants == []:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No merchants from this user were found")
    return merchants

@router.get("/{merchant_id}", response_model=MerchantResponse)
def get_merchant(
    merchant_id: int,
    repo: MerchantRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    merchant = repo.get_merchant(current_user, merchant_id)
    if not merchant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found")
    return merchant

@router.post("/", response_model=MerchantResponse)
def create_merchant(
    merchant: MerchantCreate,
    repo: MerchantRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    new_merchant = repo.create_merchant(current_user, merchant)
    if new_merchant == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Something went wrong")
    return new_merchant

@router.put("/", response_model=MerchantResponse)
def update_merchant(
    merchant: MerchantUpdate,
    repo: MerchantRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    updated_merchant = repo.update_merchant(current_user, merchant)
    if not updated_merchant:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Something went wrong")
    return updated_merchant

@router.delete("/{merchant_id}", status_code=status.HTTP_200_OK)
def delete_merchant(
    merchant_id: int,
    repo: MerchantRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.delete_merchant(current_user, merchant_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merchant not found or unable to delete")
    return {"action": "deleted"}