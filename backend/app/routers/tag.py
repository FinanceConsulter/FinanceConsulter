# Import Standard
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2

# Import Request
from schemas.tag import TagCreate, TagResponse, TagUpdate

# Import Model
from models.tag import Tag
from models.user import User

# Import Repository
from repository.tag import TagRepository

# Import DataAccess
from data_access.data_access import get_db

router = APIRouter(
    prefix='/tag',
    tags=['tag']
)

def get_repository(db: Session = Depends(get_db))-> TagRepository:
    return TagRepository(db)

@router.get('/', response_model=List[TagResponse])
def get_tags(
    repo: TagRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    tags = repo.get_userspecific_tags(current_user)
    if tags == []:
        raise HTTPException(status_code=status.HTTP_200_OK, detail="No tag found for this user")
    return tags

@router.get('/{tag_id}', response_model=TagResponse)
def get_tag(
    tag_id: int,
    repo: TagRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    tag = repo.get_tag(current_user, tag_id)
    if tag == None:
        raise HTTPException(status_code=status.HTTP_200_OK, detail=f"No tag with id {tag_id} found for this user")
    return tag

@router.post('/', response_model=TagResponse)
def create_tags(
    new_tag: TagCreate,
    repo: TagRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    tag = repo.create_tag(current_user, new_tag)
    if tag == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create tag")
    return tag

@router.put('/', response_model=TagResponse)
def update_tags(
    updated_tag: TagUpdate,
    repo: TagRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    tag = repo.update_tag(current_user, updated_tag)
    if tag == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to update tag")
    return tag

@router.delete('/{tag_id}', status_code=status.HTTP_200_OK)
def delete_tags(
    tag_id: int,
    repo: TagRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.delete_tag(current_user,tag_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to delete tag")
    return {"action": "deleted"}