"""
API Router for AI-powered Financial Insights
Uses Repository Pattern and Pydantic Schemas.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from data_access.data_access import get_db
from oauth2 import get_current_user
from models.user import User

from schemas.ai_insights import AIInsightsResponse
from repository.ai_insights import AIInsightRepository

from repository.transaction import TransactionRepository
from repository.category import CategoryRepository
from repository.account import AccountRepository

from services.ai_insights_generator import AIInsightsGenerator

load_dotenv()

router = APIRouter(
    prefix="/ai-insights",
    tags=["AI Insights"]
)

def get_repository(db: Session = Depends(get_db)) -> AIInsightRepository:
    return AIInsightRepository(db)

@router.get("/", response_model=Optional[AIInsightsResponse])
def get_latest_insights(
    repo: AIInsightRepository = Depends(get_repository),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve the latest generated insights from the database using Repository.
    """
    insights = repo.get_latest_insight(current_user)
    if not insights:
        return None
    return insights


@router.post("/generate", response_model=AIInsightsResponse)
def generate_new_insights(
    db: Session = Depends(get_db),
    repo: AIInsightRepository = Depends(get_repository),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers generation and saves via Repository.
    """
    try:
        api_key = os.getenv('GEMINI_API_KEY')
        
        if not api_key:
            print("❌ FEHLER: GEMINI_API_KEY Environment Variable ist leer!")
            raise HTTPException(
                status_code=500,
                detail="AI service not configured. Please set GEMINI_API_KEY in .env file in the backend root directory."
            )
        
        # 1. Fetch Data
        trans_repo = TransactionRepository(db)
        cat_repo = CategoryRepository(db)
        acc_repo = AccountRepository(db)

        transactions = trans_repo.get_userspecific_transaction(current_user)
        categories = cat_repo.get_userspecific_categories(current_user)
        
        try:
            if hasattr(acc_repo, 'get_userspecific_accounts'):
                accounts = acc_repo.get_userspecific_accounts(current_user)
            elif hasattr(acc_repo, 'get_accounts'):
                accounts = acc_repo.get_accounts(current_user)
            else:
                accounts = acc_repo.get_userspecific_accounts(current_user)
        except AttributeError:
             accounts = []
             print("⚠️ Warnung: Konnte Account-Methode nicht finden.")

        
        # 2. Serialize for Generator
        transactions_data = [
            {
                "id": t.id,
                "date": str(t.date),
                "description": t.description,
                "amount_cents": t.amount_cents,
                "category_id": t.category_id,
                "account_id": t.account_id
            } for t in transactions
        ]
        
        categories_data = [{"id": c.id, "name": c.name, "type": c.type} for c in categories]
        accounts_data = [{"id": a.id, "name": a.name, "currency_code": a.currency_code} for a in accounts]
        user_data = {"id": current_user.id, "first_name": current_user.first_name, "last_name": current_user.last_name}
        
        # 3. Generate
        generator = AIInsightsGenerator(api_key=api_key)
        insights_result = generator.generate_insights(
            transactions=transactions_data,
            categories=categories_data,
            accounts=accounts_data,
            user=user_data
        )
        
        # 4. Save via Repository
        saved_insight = repo.create_insight(current_user, insights_result)
        
        return saved_insight
        
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"Error generating AI insights: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")