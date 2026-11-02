from pydantic import BaseModel, Field

class UploadInitRequest(BaseModel):
    filename: str = Field(..., min_length=1, max_length=200)
    content_type: str = Field(default="text/csv")
    byte_size: int = Field(..., gt=0, le=10 * 1024 * 1024)  # 10 MB limit
    workspace_id: str | None = "default-workspace"

class UploadInitResponse(BaseModel):
    upload_id: str
    upload_url: str
    expires_at: str
    max_bytes: int

class UploadCompleteRequest(BaseModel):
    upload_id: str
    workspace_id: str | None = "default-workspace"
    checksum: str | None = None

class UploadCompleteResponse(BaseModel):
    dataset_id: str
    name: str
    row_count: int
    column_count: int
    columns: list[str]
    byte_size: int
