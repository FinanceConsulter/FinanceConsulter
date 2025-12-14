from fastapi import APIRouter, Depends, HTTPException, status, UploadFile
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2
from schemas.receipt import ReceiptCreate, ReceiptUpdate, ReceiptResponse
from models.user import User
from InternalResponse import InternalResponse
from repository.receipt import ReceiptRepository
from data_access.data_access import get_db
from services.receipt_scanner import scanner

router = APIRouter(
    prefix = '/receipt',
    tags=['receipt']
)

def get_repository(db: Session = Depends(get_db)) -> ReceiptRepository:
    return ReceiptRepository(db)

@router.get('/', response_model=List[ReceiptResponse])
def get_receipts(
    repo: ReceiptRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    return repo.get_receipts(current_user)

@router.get('/{receipt_id}', response_model=ReceiptResponse)
def get_receipt(
    receipt_id: int,
    repo: ReceiptRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    receipt = repo.get_receipt(current_user, receipt_id)
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    return receipt

@router.post('/', response_model=ReceiptResponse)
def create_receipt(
    receipt_create: ReceiptCreate,
    repo: ReceiptRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    return repo.create_receipt(current_user, receipt_create)

@router.put('/{receipt_id}', response_model=ReceiptResponse)
def update_receipt(
    receipt_id: int,
    receipt_update: ReceiptUpdate,
    repo: ReceiptRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.update_receipt(current_user, receipt_id, receipt_update)
    if isinstance(result, InternalResponse):
        raise HTTPException(status_code=result.state, detail=result.detail)
    return result

@router.delete('/{receipt_id}', status_code=status.HTTP_200_OK)
def delete_receipt(
    receipt_id: int,
    repo: ReceiptRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.delete_receipt(current_user, receipt_id)
    if result.state != status.HTTP_200_OK:
        raise HTTPException(status_code=result.state, detail=result.detail)
    return {"message": result.detail}

@router.post("/uploadfile/")
async def create_upload_file(
    file: UploadFile, 
    repo: ReceiptRepository = Depends(get_repository)
):
    return await repo.analyze_receipt(file)

@router.post('/scan')
async def scan_receipt(
    file: UploadFile,
    current_user: User = Depends(oauth2.get_current_user)
):
    content = await file.read()
    result = scanner.scan_image(content, file.filename)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result