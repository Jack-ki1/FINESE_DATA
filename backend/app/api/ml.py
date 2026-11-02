import json
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models.schema import Experiment
from backend.app.schemas.ml import MLTrainRequest, MLTrainResponse
from backend.app.services.ml_service import MLService

router = APIRouter(prefix="/ml", tags=["ml"])

@router.get("/estimators")
def list_estimators():
    return {
        "classification": [
            {"id": "logistic_regression", "name": "Logistic Regression", "type": "linear"},
            {"id": "random_forest_classifier", "name": "Random Forest Classifier", "type": "ensemble"},
            {"id": "gradient_boosting_classifier", "name": "Gradient Boosting Classifier", "type": "boosting"},
        ],
        "regression": [
            {"id": "linear_regression", "name": "Linear Regression", "type": "linear"},
            {"id": "ridge_regression", "name": "Ridge Regression", "type": "linear"},
            {"id": "random_forest_regressor", "name": "Random Forest Regressor", "type": "ensemble"},
            {"id": "gradient_boosting_regressor", "name": "Gradient Boosting Regressor", "type": "boosting"},
        ],
    }

@router.post("/train", response_model=MLTrainResponse)
def train_model(req: MLTrainRequest, db: Session = Depends(get_db)):
    return MLService.train_model(db, req)

@router.get("/experiments")
def list_experiments(workspace_id: str = Query("default-workspace"), db: Session = Depends(get_db)):
    experiments = db.query(Experiment).filter(
        Experiment.workspace_id == workspace_id
    ).order_by(Experiment.created_at.desc()).all()

    return [
        {
            "id": exp.id,
            "name": exp.name,
            "dataset_id": exp.dataset_id,
            "task_type": exp.task_type,
            "estimator": exp.estimator,
            "target_column": exp.target_column,
            "metrics": json.loads(exp.metrics_json),
            "random_seed": exp.random_seed,
            "created_at": exp.created_at.isoformat(),
        }
        for exp in experiments
    ]
