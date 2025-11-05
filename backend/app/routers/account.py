# Import Standard
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2

# Import Request
from schemas.account import AccountCreate, AccountUpdate, AccountResponse

# Import Model
from models.account import Account
from models.user import User

# Import Repository
from repository.account import RepositoryAccount

# Import DataAccess
from data_access.data_access import get_db

router = APIRouter(
    prefix='/account',
    tags=['account']
)

@router.get('/', response_model=List[AccountResponse])
def get_accounts(db:Session = Depends(get_db), current_user: User = Depends(oauth2.get_current_user)):
    accounts = RepositoryAccount().get_userspecific_accounts(db, current_user)
    if accounts == []:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No accounts from this user were found")
    return accounts

@router.post('/new', response_model=AccountResponse)
def create_account(account:AccountCreate,db:Session = Depends(get_db), current_user: User = Depends(oauth2.get_current_user)):
    return