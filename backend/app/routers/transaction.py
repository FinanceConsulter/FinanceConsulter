# Import Standard
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2

# Import Request
from schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse, TransactionFilter

# Import Model
from models.user import User

# Import Repository
from repository.transaction import TransactionRepository

# Import DataAccess
from data_access.data_access import get_db

router = APIRouter(
    prefix = '/transaction',
    tags=['transaction']
)

def get_repository(db: Session = Depends(get_db))->TransactionRepository:
    return TransactionRepository(db)

@router.get('/', response_model=List[TransactionResponse])
def get_transactions(
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    transactions = repo.get_userspecific_transaction(current_user)
    if transactions == []:
        raise HTTPException(status_code=status.HTTP_200_OK, detail="No transactions found for this user")
    return transactions

@router.get('/{transaction_id}', response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    transaction =  repo.get_transaction(current_user, transaction_id)
    if transaction == None:
        raise HTTPException(status_code=status.HTTP_200_OK, detail="No transaction found for this user")
    return transaction

@router.get('/filter', response_model=TransactionResponse)
def filter_transactions(
    transactin_filter: TransactionFilter,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    pass

@router.post('/', response_model=TransactionResponse)
def create_transactions(
    new_transaction: TransactionCreate,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    transaction = repo.create_transaction(current_user, new_transaction)
    if transaction == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to create transaction")
    return transaction

@router.post('/{transaction_id}/tags', response_model=TransactionResponse, tags=['tag'])
def get_tags(
    transaction_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    pass

@router.post('/{transaction_id}/add_tags', response_model=TransactionResponse, tags=['tag'])
def add_tags(
    transaction_id: int,
    tags_id: list[int],
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    pass

@router.put('/{transaction_id}/remove_tags', response_model=TransactionResponse, tags=['tag'])
def remove_tags(
    transaction_id: int,
    tags_id: list[int],
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    pass

@router.get('/{transaction_id}/category', response_model=TransactionResponse, tags=['category'])
def get_category(
    transaction_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    pass

@router.post('/{transaction_id}/set_category', response_model=TransactionResponse, tags=['category'])
def change_category(
    transaction_id: int,
    category_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    pass

@router.put('/{transaction_id}/remove_category', response_model=TransactionResponse, tags=['category'])
def remove_category(
    transaction_id: int,
    category_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    pass

@router.put('/', response_model=TransactionResponse, tags=['category'])
def set_receipt(
    receipt_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    pass


@router.delete('/{transaction_id}', status_code=status.HTTP_200_OK)
def delete_transaction(
    transaction_id:int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    pass