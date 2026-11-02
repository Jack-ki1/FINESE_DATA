from pydantic import BaseModel, Field

class AIInsightRequest(BaseModel):
    dataset_id: str | None = None
    prompt: str = Field(..., min_length=2, max_length=1000)
    user_consent: bool = Field(..., description="Explicit opt-in to analyze data with AI")
    sample_rows: int = Field(default=5, ge=1, le=20)
    max_tokens: int = Field(default=500, ge=50, le=1000)

class AIInsightResponse(BaseModel):
    insight: str
    provenance: dict
    model_used: str
    tokens_used: int
    computation_verified: bool
