# Import Standard
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile
from fastapi.responses import StreamingResponse
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2

# Import Schema

# Import Model
from models.receipt import Receipt, ReceiptLineItem
from models.user import User
from repository.receipt import RepositoryReceipt

# Import DataAccess
from data_access.data_access import get_db

def get_repository(db: Session = Depends(get_db))->RepositoryReceipt:
    return RepositoryReceipt(db)

router = APIRouter(
    prefix='/receipt',
    tags=['receipt']
)

@router.post("/uploadfile/")
async def create_upload_file(
    file: UploadFile, 
    repo: RepositoryReceipt = Depends(get_repository)
):
    return await repo.create_receipt(file)
    if await repo.create_receipt(file):
        return {"filename": file.filename}
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no details")
    return await repo.create_receipt(file)
    return StreamingResponse(repo.create_receipt(file), media_type="image/png")