from __future__ import annotations

from pydantic import BaseModel
from typing import Literal, Optional


class CategoryOnboardingRequest(BaseModel):
    mode: Literal['standard', 'ai']
    behavior: Optional[str] = None


class CategoryOnboardingResponse(BaseModel):
    created: int
    warning: Optional[str] = None
