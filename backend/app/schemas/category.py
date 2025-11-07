from pydantic import BaseModel
from typing import Optional

class CategoryCreate(BaseModel):
    name: str
    type: str
    parent_id: Optional[int]

class CategoryUpdate(BaseModel):
    id: int
    name: Optional[str]
    type: Optional[str]
    parent_id: Optional[int]

class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    parent_id: Optional[int]
