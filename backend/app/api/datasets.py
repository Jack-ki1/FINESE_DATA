import json
from pathlib import Path
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.schema import Dataset
from backend.app.schemas.datasets import (
    DatasetCleanRequest,
    DatasetCleanResponse,
    DatasetProfileResponse,
    DatasetSummary,
)
from backend.app.services.dataset_service import DatasetService
from backend.app.security import APIException, escape_csv_cell

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.get("", response_model=list[DatasetSummary])
def list_datasets(workspace_id: str = Query("default-workspace"), db: Session = Depends(get_db)):
    datasets = db.query(Dataset).filter(
        Dataset.workspace_id == workspace_id,
        Dataset.is_deleted == False,
    ).order_by(Dataset.created_at.desc()).all()

    return [
        DatasetSummary(
            id=d.id,
            name=d.name,
            workspace_id=d.workspace_id,
            row_count=d.row_count,
            column_count=d.column_count,
            columns=json.loads(d.columns_json),
            byte_size=d.byte_size,
            created_at=d.created_at.isoformat(),
        )
        for d in datasets
    ]

@router.get("/{dataset_id}", response_model=DatasetSummary)
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.is_deleted == False).first()
    if not ds:
        raise APIException(404, "DATASET_NOT_FOUND", f"Dataset '{dataset_id}' not found.")

    return DatasetSummary(
        id=ds.id,
        name=ds.name,
        workspace_id=ds.workspace_id,
        row_count=ds.row_count,
        column_count=ds.column_count,
        columns=json.loads(ds.columns_json),
        byte_size=ds.byte_size,
        created_at=ds.created_at.isoformat(),
    )

@router.get("/{dataset_id}/profile", response_model=DatasetProfileResponse)
def profile_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.is_deleted == False).first()
    if not ds:
        raise APIException(404, "DATASET_NOT_FOUND", f"Dataset '{dataset_id}' not found.")

    df = DatasetService.load_dataframe(Path(ds.storage_path))
    return DatasetService.profile_dataframe(df, ds.id, ds.name)

@router.post("/{dataset_id}/clean", response_model=DatasetCleanResponse)
def clean_dataset(dataset_id: str, req: DatasetCleanRequest, db: Session = Depends(get_db)):
    new_ds, affected = DatasetService.clean_dataset(db, dataset_id, req.operation, req.fill_value or "Unknown")
    return DatasetCleanResponse(
        original_dataset_id=dataset_id,
        new_dataset_id=new_ds.id,
        operation=req.operation,
        affected_count=affected,
        rows_remaining=new_ds.row_count,
    )

@router.get("/{dataset_id}/export")
def export_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.is_deleted == False).first()
    if not ds:
        raise APIException(404, "DATASET_NOT_FOUND", f"Dataset '{dataset_id}' not found.")

    df = DatasetService.load_dataframe(Path(ds.storage_path))
    
    # Export with formula injection prevention
    lines = []
    # Header
    lines.append(",".join(escape_csv_cell(c) for c in df.columns))
    for _, row in df.iterrows():
        lines.append(",".join(escape_csv_cell(val) for val in row))
    
    csv_content = "\r\n".join(lines)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={ds.name}"},
    )

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.is_deleted == False).first()
    if not ds:
        raise APIException(404, "DATASET_NOT_FOUND", f"Dataset '{dataset_id}' not found.")

    ds.is_deleted = True
    db.commit()

    # Clean up file on disk if exists
    try:
        path = Path(ds.storage_path)
        if path.exists():
            path.unlink()
    except Exception:
        pass

    return {"status": "deleted", "dataset_id": dataset_id}
