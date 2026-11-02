import uuid
from typing import Any, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")

class ErrorDetail(BaseModel):
    code: str
    message: str
    requestId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    details: Any | None = None

class ErrorResponse(BaseModel):
    error: ErrorDetail

class SuccessEnvelope(BaseModel, Generic[T]):
    data: T
    requestId: str = Field(default_factory=lambda: str(uuid.uuid4()))
