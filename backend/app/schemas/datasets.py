from pydantic import BaseModel

class ColumnProfile(BaseModel):
    name: str
    type: str
    non_null_count: int
    missing_count: int
    missing_pct: float
    unique_count: int
    mean: float | None = None
    min: float | None = None
    max: float | None = None

class DatasetSummary(BaseModel):
    id: str
    name: str
    workspace_id: str
    row_count: int
    column_count: int
    columns: list[str]
    byte_size: int
    created_at: str

class DatasetProfileResponse(BaseModel):
    id: str
    name: str
    rows: int
    columns: int
    missing_count: int
    missing_pct: float
    duplicates_count: int
    duplicates_pct: float
    quality_score: int
    column_profiles: list[ColumnProfile]

class DatasetCleanRequest(BaseModel):
    operation: str  # trim, drop-duplicates, drop-missing, fill-missing
    fill_value: str | None = "Unknown"

class DatasetCleanResponse(BaseModel):
    original_dataset_id: str
    new_dataset_id: str
    operation: str
    affected_count: int
    rows_remaining: int
