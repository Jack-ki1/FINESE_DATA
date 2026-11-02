import datetime
import json
from pathlib import Path
import uuid
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.schemas.uploads import (
    UploadCompleteRequest,
    UploadCompleteResponse,
    UploadInitRequest,
    UploadInitResponse,
)
from backend.app.services.dataset_service import DatasetService
from backend.app.security import APIException, sanitize_filename

router = APIRouter(prefix="/uploads", tags=["uploads"])

# In-memory registry of authorized upload intents (short-lived)
_upload_intents: dict[str, dict] = {}

@router.post("/init", response_model=UploadInitResponse)
async def init_upload(req: UploadInitRequest):
    if req.byte_size > settings.MAX_FILE_BYTES:
        raise APIException(400, "FILE_TOO_LARGE", f"File size exceeds {settings.MAX_FILE_BYTES // (1024*1024)} MB limit.")

    ext = Path(req.filename).suffix.lower()
    if ext not in (".csv", ".parquet"):
        raise APIException(400, "INVALID_FILE_TYPE", "Only .csv and .parquet files are supported.")

    upload_id = str(uuid.uuid4())
    expires_at = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=15)).isoformat()

    _upload_intents[upload_id] = {
        "filename": sanitize_filename(req.filename),
        "content_type": req.content_type,
        "byte_size": req.byte_size,
        "workspace_id": req.workspace_id or "default-workspace",
        "expires_at": expires_at,
    }

    return UploadInitResponse(
        upload_id=upload_id,
        upload_url=f"/api/uploads/file/{upload_id}",
        expires_at=expires_at,
        max_bytes=settings.MAX_FILE_BYTES,
    )

@router.post("/file/{upload_id}")
async def upload_file_body(upload_id: str, request: Request):
    if upload_id not in _upload_intents:
        raise APIException(404, "UPLOAD_NOT_FOUND", "Upload intent not found or expired.")

    intent = _upload_intents[upload_id]
    content = await request.body()

    if len(content) == 0:
        raise APIException(400, "EMPTY_UPLOAD", "Received empty payload.")

    if len(content) > settings.MAX_FILE_BYTES:
        raise APIException(400, "FILE_TOO_LARGE", "Uploaded file exceeds maximum allowed size.")

    dest_path = DatasetService.save_raw_file(content, intent["filename"], intent["workspace_id"])
    intent["saved_path"] = str(dest_path)

    return {"status": "uploaded", "upload_id": upload_id}

@router.post("/complete", response_model=UploadCompleteResponse)
async def complete_upload(req: UploadCompleteRequest, db: Session = Depends(get_db)):
    if req.upload_id not in _upload_intents:
        raise APIException(404, "UPLOAD_NOT_FOUND", "Upload intent not found or expired.")

    intent = _upload_intents.pop(req.upload_id)
    saved_path_str = intent.get("saved_path")
    if not saved_path_str or not Path(saved_path_str).exists():
        raise APIException(400, "UPLOAD_INCOMPLETE", "No uploaded content was received for this upload ID.")

    file_path = Path(saved_path_str)
    ds = DatasetService.register_dataset(
        db=db,
        file_path=file_path,
        filename=intent["filename"],
        workspace_id=intent["workspace_id"],
    )

    cols = json.loads(ds.columns_json)

    return UploadCompleteResponse(
        dataset_id=ds.id,
        name=ds.name,
        row_count=ds.row_count,
        column_count=ds.column_count,
        columns=cols,
        byte_size=ds.byte_size,
    )

@router.post("/direct", response_model=UploadCompleteResponse)
async def direct_upload(
    request: Request,
    filename: str = Query("uploaded.csv"),
    workspace_id: str = Query("default-workspace"),
    db: Session = Depends(get_db),
):
    """Direct binary upload helper for immediate ingestion."""
    content = await request.body()
    if len(content) == 0:
        raise APIException(400, "EMPTY_UPLOAD", "Received empty payload.")
    if len(content) > settings.MAX_FILE_BYTES:
        raise APIException(400, "FILE_TOO_LARGE", f"File exceeds {settings.MAX_FILE_BYTES // (1024*1024)} MB limit.")

    file_path = DatasetService.save_raw_file(content, filename, workspace_id)
    ds = DatasetService.register_dataset(
        db=db,
        file_path=file_path,
        filename=filename,
        workspace_id=workspace_id,
    )

    return UploadCompleteResponse(
        dataset_id=ds.id,
        name=ds.name,
        row_count=ds.row_count,
        column_count=ds.column_count,
        columns=json.loads(ds.columns_json),
        byte_size=ds.byte_size,
    )
