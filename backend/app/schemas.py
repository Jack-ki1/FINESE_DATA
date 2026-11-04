from pydantic import BaseModel, Field, field_validator
import re
from typing import Any

class RegisterIn(BaseModel):
    email: str
    password: str = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=1, max_length=160)
    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value=value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value): raise ValueError("Enter a valid email address.")
        return value
class LoginIn(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=128)
    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        value=value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value): raise ValueError("Enter a valid email address.")
        return value
class UserOut(BaseModel):
    id: str; email: str; full_name: str
class AuthOut(BaseModel):
    access_token: str; token_type: str = "bearer"; user: UserOut
class CleanIn(BaseModel):
    operation: str
    column: str | None = None
    strategy: str = "median"
    value: str | float | int | None = None
    columns: list[str] | None = None
    options: dict[str, Any] | None = None
    dry_run: bool = False
class RecipeIn(BaseModel):
    steps: list[dict[str, Any]] = Field(min_length=1, max_length=30)
class TrainIn(BaseModel):
    dataset_id: str
    task_type: str = "classification"
    target_column: str | None = None
    features: list[str] | None = None
    estimator: str = "random_forest"
    test_size: float = Field(default=0.2, gt=0.05, lt=0.5)
    random_seed: int = 42
    cv_folds: int = Field(default=5, ge=2, le=10)
    tune: bool = False
    hyperparameters: dict[str, Any] | None = None
class ChatIn(BaseModel):
    dataset_id: str | None = None
    prompt: str = Field(min_length=2, max_length=4000)
    provider: str = "auto"
    model: str | None = None
    temperature: float | None = None
    share_data_with_ai: bool = False
    include_sample_rows: bool = False
    conversation_id: str | None = None
class PlotIn(BaseModel):
    spec: dict[str, Any]
class PivotIn(BaseModel):
    spec: dict[str, Any]
class SweepIn(TrainIn):
    estimators: list[str] | None = None

class PredictIn(BaseModel):
    rows: list[dict[str, Any]]

class AggregateIn(BaseModel):
    group_by: str = Field(min_length=1, max_length=160)
    metric: str | None = None
    aggregation: str = "count"
    top_n: int = Field(default=20, ge=1, le=100)

class MLJobIn(BaseModel):
    request: TrainIn
