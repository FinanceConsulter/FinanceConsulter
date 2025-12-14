# Import Standard
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
import oauth2 as oauth2
import os
import time
import hashlib
import threading

# Import Request
from schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from schemas.category_onboarding import CategoryOnboardingRequest, CategoryOnboardingResponse

# Import Model
from models.user import User

# Import Repository
from repository.category import CategoryRepository

# Import Services
from services.standard_categories import STANDARD_CATEGORIES
from services.category_onboarding_generator import AICategoryOnboardingGenerator

# Import DataAccess
from data_access.data_access import get_db

router = APIRouter(
    prefix = '/category',
    tags=['category']
)

# --- Onboarding AI throttling/caching (in-process) ---
_AI_LOCK = threading.Lock()
_AI_TREE_CACHE: dict[str, tuple[float, list[dict]]] = {}
_AI_LAST_ATTEMPT_BY_USER: dict[int, float] = {}
_AI_LAST_QUOTA_BY_USER: dict[int, float] = {}

AI_ONBOARDING_CACHE_TTL_SECONDS = int(os.getenv('AI_ONBOARDING_CACHE_TTL_SECONDS', '86400'))  # 24h
AI_ONBOARDING_COOLDOWN_SECONDS = int(os.getenv('AI_ONBOARDING_COOLDOWN_SECONDS', '30'))
AI_ONBOARDING_QUOTA_BACKOFF_SECONDS = int(os.getenv('AI_ONBOARDING_QUOTA_BACKOFF_SECONDS', '3600'))  # 1h


def _is_quota_error(err: Exception) -> bool:
    msg = str(err)
    if '429' in msg:
        return True
    if 'TooManyRequests' in msg:
        return True
    if 'resource has been exhausted' in msg.lower():
        return True
    if 'quota' in msg.lower():
        return True
    return False


def _cache_key(user_id: int, behavior: str) -> str:
    b = (behavior or '').strip().encode('utf-8')
    h = hashlib.sha256(b).hexdigest()
    return f"{user_id}:{h}"

def get_repository(db:Session = Depends(get_db)) -> CategoryRepository:
    return CategoryRepository(db)

@router.get('/', response_model=List[CategoryResponse])
def get_categories(
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    categories = repo.get_userspecific_categories(current_user)
    if categories == []:
        raise HTTPException(status_code=status.HTTP_200_OK, detail="No Categories found for this user")
    return categories

@router.get('/{category_id}', response_model=CategoryResponse)
def get_category(
    category_id: int, 
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    category = repo.get_category(current_user, category_id)
    if category == None:
        raise HTTPException(status_code=status.HTTP_200_OK, detail=f"No category with id {category_id} found for this user")
    return category

@router.post('/', response_model=CategoryResponse)
def create_category(
    new_category: CategoryCreate,
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    try:
        category = repo.create_category(current_user, new_category)
        if category == None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unable to create category")
        return category
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.put('/', response_model=CategoryResponse)
def update_category(
    updated_category: CategoryUpdate, 
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    try:
        category = repo.update_category(current_user, updated_category)
        if category == None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to update category")
        return category
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.delete('/{category_id}', status_code=status.HTTP_200_OK)
def delete_category(
    category_id: int, 
    repo: CategoryRepository = Depends(get_repository), 
    current_user: User = Depends(oauth2.get_current_user)
):
    result = repo.delete_category(current_user,category_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unable to delete category")
    return {"action": "deleted"}


@router.post('/onboarding', response_model=CategoryOnboardingResponse)
def create_onboarding_categories(
    request: CategoryOnboardingRequest,
    repo: CategoryRepository = Depends(get_repository),
    current_user: User = Depends(oauth2.get_current_user)
):
    try:
        existing = repo.get_userspecific_categories(current_user)
        existing_names = {c.name for c in existing}

        warning: str | None = None

        # Always create standard categories first.
        tree = list(STANDARD_CATEGORIES)

        # If AI is chosen, add AI-generated categories as a supplement.
        if request.mode == 'ai':
            behavior = (request.behavior or '').strip()
            key = _cache_key(current_user.id, behavior)
            now = time.time()

            ai_tree: list[dict] | None = None

            with _AI_LOCK:
                cached = _AI_TREE_CACHE.get(key)
                last_attempt = _AI_LAST_ATTEMPT_BY_USER.get(current_user.id)
                last_quota = _AI_LAST_QUOTA_BY_USER.get(current_user.id)

            if cached and (now - cached[0]) < AI_ONBOARDING_CACHE_TTL_SECONDS:
                ai_tree = cached[1]
            elif last_quota and (now - last_quota) < AI_ONBOARDING_QUOTA_BACKOFF_SECONDS:
                warning = 'AI quota was exceeded recently; skipped AI and created standard categories.'
            elif last_attempt and (now - last_attempt) < AI_ONBOARDING_COOLDOWN_SECONDS:
                warning = 'AI request throttled; skipped AI and created standard categories.'
            else:
                with _AI_LOCK:
                    _AI_LAST_ATTEMPT_BY_USER[current_user.id] = now

                try:
                    generator = AICategoryOnboardingGenerator()
                    ai_tree = generator.generate_tree(behavior)
                    if isinstance(ai_tree, list) and ai_tree:
                        with _AI_LOCK:
                            _AI_TREE_CACHE[key] = (now, ai_tree)
                except ValueError as e:
                    # e.g. missing GEMINI_API_KEY or invalid AI output
                    warning = f"AI unavailable: {str(e)}"
                except Exception as e:
                    if _is_quota_error(e):
                        with _AI_LOCK:
                            _AI_LAST_QUOTA_BY_USER[current_user.id] = now
                        warning = 'AI quota exceeded; created standard categories instead.'
                    else:
                        warning = f"AI failed; created standard categories instead. ({str(e)})"

            if ai_tree:
                tree.extend(ai_tree)

        created_count = 0

        # Create parents first, then subcategories
        parent_id_by_name: dict[str, int] = {}
        for entry in tree:
            name = str(entry.get('name', '')).strip()
            ctype = str(entry.get('type', '')).strip()
            if not name or name in existing_names:
                continue
            created = repo.create_category(current_user, CategoryCreate(name=name, type=ctype, parent_id=None))
            if created:
                existing_names.add(created.name)
                parent_id_by_name[created.name] = created.id
                created_count += 1

        for entry in tree:
            parent_name = str(entry.get('name', '')).strip()
            ctype = str(entry.get('type', '')).strip()
            parent_id = parent_id_by_name.get(parent_name)
            if not parent_id:
                # parent exists already in DB or was skipped; try to resolve from existing list
                resolved = next((c for c in existing if c.name == parent_name), None)
                parent_id = resolved.id if resolved else None
            if not parent_id:
                continue

            subcats = entry.get('subcategories', [])
            if not isinstance(subcats, list):
                continue
            for sub in subcats:
                sname = str(sub).strip()
                if not sname or sname in existing_names:
                    continue
                created = repo.create_category(current_user, CategoryCreate(name=sname, type=ctype, parent_id=parent_id))
                if created:
                    existing_names.add(created.name)
                    created_count += 1

        return CategoryOnboardingResponse(created=created_count, warning=warning)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
