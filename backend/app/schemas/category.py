from pydantic import BaseModel, field_validator
from typing import Optional

class CategoryCreate(BaseModel):
    name: str
    type: str
    parent_id: Optional[int]

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

    @field_validator('name','type','parent_id')
    def empty_str_to_none(cls, v):
        if v == '':
            return None
        return v

class CategoryResponse(BaseModel):
    id: int
    name: str
    type: str
    parent_id: Optional[int]
