from pydantic import BaseModel
from typing import List, Optional

class Recommendation(BaseModel):
    title: str
    description: str
    impact: Optional[str] = None

class InsightItem(BaseModel):
    id: Optional[int] = None
    severity: str
    category: str
    title: str
    description: str
    ai_analysis: str
    recommendations: List[Recommendation]
    is_resolved: bool = False
    detected_at: Optional[str] = None

class AIInsightsResponse(BaseModel):
    health_score: int
    summary: str
    last_analyzed: Optional[str] = None
    insights: List[InsightItem]