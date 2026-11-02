from typing import Any
from pydantic import BaseModel, Field

class MLTrainRequest(BaseModel):
    dataset_id: str
    target_column: str
    task_type: str = Field(..., description="'classification' or 'regression'")
    estimator: str = Field(default="random_forest_classifier")
    features: list[str] | None = None
    test_size: float = Field(default=0.2, gt=0.05, lt=0.5)
    random_seed: int = Field(default=42)
    workspace_id: str | None = "default-workspace"

class MLTrainResponse(BaseModel):
    experiment_id: str
    dataset_id: str
    task_type: str
    estimator: str
    target_column: str
    features_used: list[str]
    train_rows: int
    test_rows: int
    metrics: dict[str, Any]
    baseline_metrics: dict[str, Any]
    feature_importances: dict[str, float] | None = None
    model_artifact_id: str | None = None
