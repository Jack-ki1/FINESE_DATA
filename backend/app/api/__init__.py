from fastapi import APIRouter
from backend.app.api.contact import router as contact_router
from backend.app.api.ai import router as ai_router
from backend.app.api.uploads import router as uploads_router
from backend.app.api.datasets import router as datasets_router
from backend.app.api.jobs import router as jobs_router
from backend.app.api.ml import router as ml_router

api_router = APIRouter()
api_router.include_router(contact_router)
api_router.include_router(ai_router)
api_router.include_router(uploads_router)
api_router.include_router(datasets_router)
api_router.include_router(jobs_router)
api_router.include_router(ml_router)
