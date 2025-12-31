# Import Standard
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2
import os

# Import Request
from schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse, TransactionFilter

# Import Model
from models.user import User
from InternalResponse import InternalResponse

# Import Repository
from repository.transaction import TransactionRepository
from repository.category import CategoryRepository

from schemas.transaction_categorize import (
    TransactionForCategorization,
    TransactionCategorySuggestionResponse,
)

from services.transaction_categorizer import (
    CategoryCandidate,
    CategorySuggestion,
    suggest_categories_batch,
    gemini_suggest_categories_batch,
)

# Import DataAccess
from data_access.data_access import get_db

router = APIRouter(
    prefix = '/transaction',
    tags=['transaction']
)

def get_repository(db: Session = Depends(get_db))->TransactionRepository:
    return TransactionRepository(db)


@router.post('/categorize/batch', response_model=List[TransactionCategorySuggestionResponse])
def categorize_transactions_batch(
    items: List[TransactionForCategorization],
    db: Session = Depends(get_db),
    current_user: User = Depends(oauth2.get_current_user),
):
    categories = CategoryRepository(db).get_userspecific_categories(current_user)
    candidates = [
        CategoryCandidate(
            id=c.id,
            name=c.name,
            type=c.type,
            parent_id=c.parent_id,
            description=c.description,
        )
        for c in categories
    ]

    threshold = float(os.getenv('CATEGORY_AUTO_THRESHOLD', '0.5'))
    min_threshold = float(os.getenv('CATEGORY_AUTO_MIN_THRESHOLD', '0.35'))
    min_margin = float(os.getenv('CATEGORY_AUTO_MIN_MARGIN', '0.03'))
    suggestions = suggest_categories_batch(
        categories=candidates,
        descriptions=[i.description for i in items],
        amount_cents_list=[i.amount_cents for i in items],
        currency_codes=[i.currency_code for i in items],
        threshold=threshold,
    )

    # Local fallback: if primary threshold fails but match is still reasonably strong,
    # assign the best category to reduce uncategorized manual entries.
    for idx, s in enumerate(suggestions):
        if (
            s.category_id is None
            and s.best_category_id is not None
            and s.score >= min_threshold
            and s.margin >= min_margin
        ):
            suggestions[idx] = CategorySuggestion(
                category_id=s.best_category_id,
                score=s.score,
                best_category_id=s.best_category_id,
                margin=s.margin,
            )

    # Optional Gemini fallback: only for items below threshold.
    # Uses a single request for all low-confidence transactions.
    enable_fallback = os.getenv('CATEGORY_GEMINI_FALLBACK_ENABLED', '0') == '1'
    if enable_fallback:
        low_indices = [idx for idx, s in enumerate(suggestions) if s.category_id is None]
        if low_indices:
            payload = [
                {
                    'client_id': (items[idx].client_id or str(idx)),
                    'description': items[idx].description,
                    'amount_cents': items[idx].amount_cents,
                    'currency_code': items[idx].currency_code,
                }
                for idx in low_indices
            ]

            gemini_map = gemini_suggest_categories_batch(
                categories=candidates,
                items=payload,
            )
            if gemini_map:
                for idx in low_indices:
                    key = items[idx].client_id or str(idx)
                    if key in gemini_map and gemini_map[key].category_id is not None:
                        suggestions[idx] = gemini_map[key]

    return [
        TransactionCategorySuggestionResponse(
            client_id=item.client_id,
            category_id=suggestion.category_id,
            score=suggestion.score,
        )
        for item, suggestion in zip(items, suggestions)
    ]

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

@router.get('/filter', response_model=List[TransactionResponse])
def filter_transactions(
    transaction_filter: TransactionFilter = Depends(),
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    transactions = repo.filter_transactions(current_user, transaction_filter)
    if type(transactions) == InternalResponse:
        raise HTTPException(status_code=transactions.state, detail=transactions.detail)
    return transactions

@router.post('/', response_model=TransactionResponse)
def create_transaction(
    new_transaction: TransactionCreate,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    transaction = repo.create_transaction(current_user, new_transaction)
    if type(transaction) == InternalResponse:
        raise HTTPException(status_code=transaction.state, detail=transaction.detail)
    if transaction == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to create transaction")
    return transaction

@router.post('/{transaction_id}/tags', response_model=TransactionResponse)
def get_tags(
    transaction_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    transaction = repo.get_transaction(current_user, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction

@router.post('/{transaction_id}/add_tags', response_model=TransactionResponse)
def add_tags(
    transaction_id: int,
    tags_id: list[int],
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.add_tags(current_user, transaction_id, tags_id)
    if type(result) == InternalResponse:
        raise HTTPException(status_code=result.state, detail=result.detail)
    return result

@router.put('/{transaction_id}/remove_tags', response_model=TransactionResponse)
def remove_tags(
    transaction_id: int,
    tags_id: list[int],
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.remove_tags(current_user, transaction_id, tags_id)
    if type(result) == InternalResponse:
        raise HTTPException(status_code=result.state, detail=result.detail)
    return result

@router.get('/{transaction_id}/category', response_model=TransactionResponse)
def get_category(
    transaction_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    transaction = repo.get_transaction(current_user, transaction_id)
    if transaction is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    return transaction

@router.post('/{transaction_id}/set_category', response_model=TransactionResponse)
def change_category(
    transaction_id: int,
    category_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    update = TransactionUpdate(category_id=category_id)
    result = repo.update_transaction(current_user, transaction_id, update)
    if type(result) == InternalResponse:
        raise HTTPException(status_code=result.state, detail=result.detail)
    return result

@router.put('/{transaction_id}/remove_category', response_model=TransactionResponse)
def remove_category(
    transaction_id: int,
    category_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.remove_category(current_user, transaction_id)
    if type(result) == InternalResponse:
        raise HTTPException(status_code=result.state, detail=result.detail)
    return result

@router.put('/{transaction_id}/receipt', response_model=TransactionResponse)
def set_receipt(
    transaction_id: int,
    receipt_id: int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.set_receipt(current_user, transaction_id, receipt_id)
    if type(result) == InternalResponse:
        raise HTTPException(status_code=result.state, detail=result.detail)
    return result


@router.put('/{transaction_id}', response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.update_transaction(current_user, transaction_id, transaction_update)
    if type(result) == InternalResponse:
        raise HTTPException(status_code=result.state, detail=result.detail)
    return result


@router.delete('/{transaction_id}', status_code=status.HTTP_200_OK)
def delete_transaction(
    transaction_id:int,
    repo: TransactionRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.delete_transaction(current_user, transaction_id)
    if result.state != status.HTTP_200_OK:
        raise HTTPException(status_code=result.state, detail=result.detail)
    return {"message": result.detail}