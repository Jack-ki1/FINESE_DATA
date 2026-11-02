from typing import Any
from pydantic import BaseModel, Field

class JobSubmitRequest(BaseModel):
    job_type: str = Field(..., description="Job type, e.g. 'ml_train', 'profile', 'clean'")
    dataset_id: str
    workspace_id: str | None = "default-workspace"
    parameters: dict[str, Any] = Field(default_factory=dict)

class JobSubmitResponse(BaseModel):
    job_id: str
    job_type: str
    status: str
    created_at: str

class JobStatusResponse(BaseModel):
    job_id: str
    job_type: str
    status: str  # pending, running, completed, failed, cancelled
    progress: int  # 0 to 100
    parameters: dict[str, Any]
    results: dict[str, Any] | None = None
    error: str | None = None
    created_at: str
    started_at: str | None = None
    completed_at: str | None = None

class JobCancelResponse(BaseModel):
    job_id: str
    status: str
    message: str
