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

# Import DataAccess
from data_access.data_access import get_db

# Import Repository
from repository.account import AccountRepository

router = APIRouter(
    prefix='/account',
    tags=['account']
)

def get_repository(db:Session = Depends(get_db))-> AccountRepository:
    return AccountRepository(db)

@router.get('/', response_model=List[AccountResponse])
def get_accounts(
    repo:AccountRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    accounts = repo.get_userspecific_accounts(current_user)

    return accounts

@router.get('/{account_id}', response_model=AccountResponse)
def get_account(
    account_id: int, 
    repo:AccountRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    account = repo.get_account(current_user, account_id)
    if account == None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No account with id {account_id} was found for this user")
    return account


@router.post('/new', response_model=AccountResponse)
def create_account(
    account:AccountCreate,
    repo:AccountRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    account = repo.create_account(current_user, account)
    if account == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to create account")
    return account

@router.put('/update')
def update_account(
    account:AccountUpdate,
    repo:AccountRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    updated_account =  repo.update_account(current_user, account)
    if update_account == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to update account")
    return updated_account

@router.delete('/{account_id}', status_code=status.HTTP_200_OK)
def delete_account(
    account_id: int,
    repo: AccountRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.delete_account(current_user, account_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to delete account")
    return {"action": "deleted", "message": "Account and all associated transactions deleted successfully"}
