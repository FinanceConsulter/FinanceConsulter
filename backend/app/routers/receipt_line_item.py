from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2
from schemas.receipt_line_item import ReceiptLineItemCreate, ReceiptLineItemUpdate, ReceiptLineItemResponse
from models.user import User
from InternalResponse import InternalResponse
from repository.receipt_line_item import ReceiptLineItemRepository
from data_access.data_access import get_db

router = APIRouter(
    prefix = '/receipt_line_item',
    tags=['receipt_line_item']
)

def get_repository(db: Session = Depends(get_db)) -> ReceiptLineItemRepository:
    return ReceiptLineItemRepository(db)

@router.get('/{receipt_id}', response_model=List[ReceiptLineItemResponse])
def get_line_items(
    receipt_id: int,
    repo: ReceiptLineItemRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.get_line_items(current_user, receipt_id)
    if isinstance(result, InternalResponse):
        raise HTTPException(status_code=result.state, detail=result.detail)
    return result

@router.post('/{receipt_id}', response_model=ReceiptLineItemResponse)
def create_line_item(
    receipt_id: int,
    item_create: ReceiptLineItemCreate,
    repo: ReceiptLineItemRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.create_line_item(current_user, receipt_id, item_create)
    if isinstance(result, InternalResponse):
        raise HTTPException(status_code=result.state, detail=result.detail)
    return result

@router.put('/{line_item_id}', response_model=ReceiptLineItemResponse)
def update_line_item(
    line_item_id: int,
    item_update: ReceiptLineItemUpdate,
    repo: ReceiptLineItemRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.update_line_item(current_user, line_item_id, item_update)
    if isinstance(result, InternalResponse):
        raise HTTPException(status_code=result.state, detail=result.detail)
    return result

@router.delete('/{line_item_id}', status_code=status.HTTP_200_OK)
def delete_line_item(
    line_item_id: int,
    repo: ReceiptLineItemRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.delete_line_item(current_user, line_item_id)
    if result.state != status.HTTP_200_OK:
        raise HTTPException(status_code=result.state, detail=result.detail)
    return {"message": result.detail}
