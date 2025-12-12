from pydantic import BaseModel, field_validator
from typing import Optional

class CategoryCreate(BaseModel):
    name: str
    type: str
    parent_id: Optional[int] = None
    description: Optional[str] = None

    @field_validator('parent_id')
    def empty_str_to_none(cls, v):
        if v == '':
            return None
        return v

class CategoryUpdate(BaseModel):
    id: int
    name: Optional[str]
    type: Optional[str]
    parent_id: Optional[int]
    description: Optional[str]

    @field_validator('name','type', 'description')
    def empty_str_to_none(cls, item):
        if item == '':
            return None
        return item
    
    @field_validator('parent_id')
    def zero_to_end(cls, item):
        if item == 0:
            return None
        return item

class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    parent_id: Optional[int] = None
    description: Optional[str] = None
