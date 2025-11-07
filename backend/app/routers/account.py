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

@router.get('/{account_id}', response_model=AccountResponse)
def get_account(account_id: int, db:Session = Depends(get_db), current_user: User = Depends(oauth2.get_current_user)):
    account = RepositoryAccount().get_account(db, current_user, account_id)
    if account == None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No account with id {account_id} was found for this user")
    return account


@router.post('/new', response_model=AccountResponse)
def create_account(account:AccountCreate,db:Session = Depends(get_db), current_user: User = Depends(oauth2.get_current_user)):
    account = RepositoryAccount().create_account(db, current_user, account)
    if account == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to create account")
    return account

@router.put('/update')
def update_account(account:AccountUpdate,db:Session = Depends(get_db), current_user: User = Depends(oauth2.get_current_user)):
    updated_account =  RepositoryAccount().update_account(db, current_user, account)
    if update_account == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to update account")
    return updated_account