from pydantic import BaseModel, field_validator
from typing import Optional

class TagCreate(BaseModel):
    name: str
    color: str

class TagUpdate(BaseModel):
    id: int
    name: Optional[str]
    color: Optional[str]

    @field_validator('name','color')
    def empty_str_to_none(cls, item):
        if item == '':
            return None
        return item

class TagResponse(BaseModel):
    id: int
    user_id: int
    name: str
    color: str