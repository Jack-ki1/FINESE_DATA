import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.models.schema import Dataset, DatasetVersion
from backend.app.schemas.datasets import ColumnProfile, DatasetProfileResponse
from backend.app.security import APIException, escape_csv_cell, sanitize_filename

class DatasetService:
    @staticmethod
    def save_raw_file(content: bytes, filename: str, workspace_id: str = "default-workspace") -> Path:
        """Saves an uploaded raw file to isolated storage."""
        if len(content) > settings.MAX_FILE_BYTES:
            raise APIException(400, "FILE_TOO_LARGE", f"File size exceeds the {settings.MAX_FILE_BYTES // (1024*1024)} MB limit.")
        
        safe_name = sanitize_filename(filename)
        content_hash = hashlib.sha256(content).hexdigest()
        dest_filename = f"{content_hash[:16]}_{safe_name}"
        dest_path = settings.STORAGE_DIR / dest_filename
        
        with open(dest_path, "wb") as f:
            f.write(content)
            
        return dest_path

    @staticmethod
    def load_dataframe(file_path: Path) -> pd.DataFrame:
        """Safely loads a DataFrame from disk with row/column caps."""
        if not file_path.exists():
            raise APIException(404, "FILE_NOT_FOUND", "The requested dataset file does not exist on disk.")
            
        try:
            if file_path.suffix.lower() == ".csv":
                df = pd.read_csv(file_path, nrows=settings.MAX_DATA_ROWS + 1)
            elif file_path.suffix.lower() == ".parquet":
                df = pd.read_parquet(file_path)
            else:
                raise APIException(400, "UNSUPPORTED_FORMAT", "Only CSV and Parquet files are supported.")
        except Exception as e:
            raise APIException(400, "PARSE_ERROR", f"Failed to parse data file: {str(e)}")

        if len(df) > settings.MAX_DATA_ROWS:
            raise APIException(400, "ROW_CAP_EXCEEDED", f"Dataset exceeds the limit of {settings.MAX_DATA_ROWS} rows.")
        if len(df.columns) > settings.MAX_DATA_COLUMNS:
            raise APIException(400, "COLUMN_CAP_EXCEEDED", f"Dataset exceeds the limit of {settings.MAX_DATA_COLUMNS} columns.")
        if len(df.columns) == 0:
            raise APIException(400, "EMPTY_DATASET", "Dataset contains no columns.")

        return df

    @staticmethod
    def register_dataset(db: Session, file_path: Path, filename: str, workspace_id: str = "default-workspace", project_id: str | None = None) -> Dataset:
        """Inspects data dimensions and stores metadata in DB."""
        df = DatasetService.load_dataframe(file_path)
        byte_size = file_path.stat().st_size
        
        with open(file_path, "rb") as f:
            checksum = hashlib.sha256(f.read()).hexdigest()

        columns_list = [str(c) for c in df.columns]
        
        dataset = Dataset(
            workspace_id=workspace_id,
            project_id=project_id,
            name=sanitize_filename(filename),
            storage_path=str(file_path),
            content_type="text/csv" if file_path.suffix.lower() == ".csv" else "application/octet-stream",
            byte_size=byte_size,
            row_count=len(df),
            column_count=len(columns_list),
            columns_json=json.dumps(columns_list),
            checksum=checksum,
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        return dataset

    @staticmethod
    def profile_dataframe(df: pd.DataFrame, dataset_id: str, name: str) -> DatasetProfileResponse:
        """Calculates deterministic profile signals, stats, and heuristic score."""
        total_rows = len(df)
        total_cols = len(df.columns)
        total_cells = max(total_rows * total_cols, 1)

        missing_count = int(df.isna().sum().sum())
        missing_pct = round((missing_count / total_cells) * 100, 2)

        duplicate_count = int(df.duplicated().sum())
        duplicate_pct = round((duplicate_count / max(total_rows, 1)) * 100, 2)

        # Transparent heuristic score formula: 100 - missing*0.7 - duplicates*0.3
        quality_score = max(0, round(100 - (missing_pct * 0.7) - (duplicate_pct * 0.3)))

        column_profiles: list[ColumnProfile] = []
        for col in df.columns:
            series = df[col]
            non_null = int(series.count())
            missing = total_rows - non_null
            missing_p = round((missing / max(total_rows, 1)) * 100, 2)
            unique_count = int(series.nunique(dropna=True))

            # Heuristic type detection
            mean_val = None
            min_val = None
            max_val = None
            col_type = "Text"

            if pd.api.types.is_numeric_dtype(series):
                col_type = "Number"
                valid_num = series.dropna()
                if len(valid_num) > 0:
                    mean_val = float(valid_num.mean())
                    min_val = float(valid_num.min())
                    max_val = float(valid_num.max())
            elif pd.api.types.is_datetime64_any_dtype(series):
                col_type = "Datetime"
            elif unique_count <= 20 and total_rows > 30:
                col_type = "Categorical"
            else:
                # Check for date-like strings
                sample_str = series.dropna().astype(str).head(10)
                if len(sample_str) > 0 and sample_str.str.match(r"^\d{4}-\d{2}(-\d{2})?$").all():
                    col_type = "Date-like text"

            column_profiles.append(
                ColumnProfile(
                    name=str(col),
                    type=col_type,
                    non_null_count=non_null,
                    missing_count=missing,
                    missing_pct=missing_p,
                    unique_count=unique_count,
                    mean=round(mean_val, 4) if mean_val is not None else None,
                    min=round(min_val, 4) if min_val is not None else None,
                    max=round(max_val, 4) if max_val is not None else None,
                )
            )

        return DatasetProfileResponse(
            id=dataset_id,
            name=name,
            rows=total_rows,
            columns=total_cols,
            missing_count=missing_count,
            missing_pct=missing_pct,
            duplicates_count=duplicate_count,
            duplicates_pct=duplicate_pct,
            quality_score=quality_score,
            column_profiles=column_profiles,
        )

    @staticmethod
    def clean_dataset(db: Session, dataset_id: str, operation: str, fill_value: str = "Unknown") -> tuple[Dataset, int]:
        """Performs deterministic cleaning operation and creates a new dataset version."""
        ds = db.query(Dataset).filter(Dataset.id == dataset_id, Dataset.is_deleted == False).first()
        if not ds:
            raise APIException(404, "DATASET_NOT_FOUND", f"Dataset '{dataset_id}' not found.")

        df = DatasetService.load_dataframe(Path(ds.storage_path))
        initial_rows = len(df)
        affected = 0

        if operation == "trim":
            str_cols = df.select_dtypes(include=["object", "string"]).columns
            for c in str_cols:
                mask = df[c].astype(str) != df[c].astype(str).str.strip()
                affected += int(mask.sum())
                df[c] = df[c].astype(str).str.strip()
        elif operation == "drop-duplicates":
            dup_mask = df.duplicated()
            affected = int(dup_mask.sum())
            df = df.drop_duplicates()
        elif operation == "drop-missing":
            before = len(df)
            df = df.dropna()
            affected = before - len(df)
        elif operation == "fill-missing":
            affected = int(df.isna().sum().sum())
            df = df.fillna(fill_value)
        else:
            raise APIException(400, "INVALID_OPERATION", f"Operation '{operation}' is not supported. Use trim, drop-duplicates, drop-missing, or fill-missing.")

        # Save cleaned dataset
        new_filename = f"{Path(ds.name).stem}_{operation}.csv"
        dest_path = settings.STORAGE_DIR / f"cleaned_{ds.id[:8]}_{new_filename}"
        df.to_csv(dest_path, index=False)

        new_ds = Dataset(
            workspace_id=ds.workspace_id,
            project_id=ds.project_id,
            name=new_filename,
            storage_path=str(dest_path),
            content_type="text/csv",
            byte_size=dest_path.stat().st_size,
            row_count=len(df),
            column_count=len(df.columns),
            columns_json=json.dumps([str(c) for c in df.columns]),
            checksum=hashlib.sha256(dest_path.read_bytes()).hexdigest(),
        )
        db.add(new_ds)
        db.commit()
        db.refresh(new_ds)

        # Record version
        version = DatasetVersion(
            dataset_id=ds.id,
            version_number=2,
            storage_path=str(dest_path),
            transformation_log=json.dumps({"operation": operation, "affected": affected}),
        )
        db.add(version)
        db.commit()

        return new_ds, affected
