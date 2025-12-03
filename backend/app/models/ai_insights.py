from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from data_access.data_access import Base 

class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    health_score = Column(Integer)
    summary = Column(Text)
    raw_json = Column(Text) # Speichert das komplette JSON Ergebnis
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User")