from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.schemas.ai import AIInsightRequest, AIInsightResponse
from backend.app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["ai"])

@router.post("/insights", response_model=AIInsightResponse)
async def get_insights(req: AIInsightRequest, db: Session = Depends(get_db)):
    return await AIService.generate_insight(db, req)
