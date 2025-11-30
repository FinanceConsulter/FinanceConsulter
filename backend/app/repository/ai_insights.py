from sqlalchemy.orm import Session
from sqlalchemy import desc
import json
from models.user import User
from models.ai_insights import AIInsight
from schemas.ai_insights import AIInsightsResponse

class AIInsightRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_latest_insight(self, current_user: User) -> dict | None:
        """
        Holt den neuesten Eintrag aus der DB und parst das JSON.
        """
        latest_insight = self.db.query(AIInsight).filter(
            AIInsight.user_id == current_user.id
        ).order_by(desc(AIInsight.created_at)).first()

        if not latest_insight:
            return None

        try:
            # Wir geben das geparste JSON zurück, das passt auf unser Schema
            return json.loads(latest_insight.raw_json)
        except json.JSONDecodeError:
            return None

    def create_insight(self, current_user: User, insight_data: dict) -> dict:
        """
        Speichert neue Insights als JSON-String in der DB.
        """
        new_insight = AIInsight(
            user_id=current_user.id,
            health_score=insight_data.get("health_score", 0),
            summary=insight_data.get("summary", ""),
            raw_json=json.dumps(insight_data)
        )
        
        self.db.add(new_insight)
        self.db.commit()
        self.db.refresh(new_insight)
        
        return insight_data