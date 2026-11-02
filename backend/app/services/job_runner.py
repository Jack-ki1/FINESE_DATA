import asyncio
import datetime
import json
from pathlib import Path
from typing import Any
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models.schema import Dataset, Job
from backend.app.schemas.jobs import JobSubmitRequest
from backend.app.schemas.ml import MLTrainRequest
from backend.app.services.dataset_service import DatasetService
from backend.app.services.ml_service import MLService
from backend.app.security import APIException

class JobRunner:
    @staticmethod
    def create_job(db: Session, req: JobSubmitRequest) -> Job:
        job = Job(
            workspace_id=req.workspace_id or "default-workspace",
            job_type=req.job_type,
            status="pending",
            progress=0,
            parameters_json=json.dumps(req.parameters),
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    async def run_job_async(job_id: str):
        """Worker task executing bounded compute jobs."""
        db = SessionLocal()
        job = None
        try:
            job = db.query(Job).filter(Job.id == job_id).first()
            if not job or job.status == "cancelled":
                return

            job.status = "running"
            job.started_at = datetime.datetime.now(datetime.timezone.utc)
            job.progress = 10
            db.commit()

            params = json.loads(job.parameters_json)
            dataset_id = params.get("dataset_id")

            if job.job_type == "ml_train":
                job.progress = 30
                db.commit()

                train_req = MLTrainRequest(
                    dataset_id=dataset_id,
                    target_column=params["target_column"],
                    task_type=params.get("task_type", "classification"),
                    estimator=params.get("estimator", "random_forest_classifier"),
                    features=params.get("features"),
                    test_size=float(params.get("test_size", 0.2)),
                    random_seed=int(params.get("random_seed", 42)),
                )
                
                # Check cancellation
                db.refresh(job)
                if job.status == "cancelled":
                    return

                res = MLService.train_model(db, train_req)
                job.progress = 90
                db.commit()

                job.results_json = json.dumps(res.model_dump())

            elif job.job_type == "profile":
                ds = db.query(Dataset).filter(Dataset.id == dataset_id).first()
                if not ds:
                    raise APIException(404, "DATASET_NOT_FOUND", "Dataset not found.")
                df = DatasetService.load_dataframe(Path(ds.storage_path))
                job.progress = 50
                db.commit()

                profile = DatasetService.profile_dataframe(df, ds.id, ds.name)
                job.results_json = json.dumps(profile.model_dump())

            elif job.job_type == "clean":
                op = params.get("operation", "drop-duplicates")
                fill_val = params.get("fill_value", "Unknown")
                cleaned_ds, affected = DatasetService.clean_dataset(db, dataset_id, op, fill_val)
                job.results_json = json.dumps({
                    "cleaned_dataset_id": cleaned_ds.id,
                    "operation": op,
                    "affected": affected,
                    "new_rows": cleaned_ds.row_count,
                })

            else:
                raise APIException(400, "INVALID_JOB_TYPE", f"Unknown job type '{job.job_type}'.")

            # Finalize
            db.refresh(job)
            if job.status != "cancelled":
                job.status = "completed"
                job.progress = 100
                job.completed_at = datetime.datetime.now(datetime.timezone.utc)
                db.commit()

        except APIException as e:
            if job:
                job.status = "failed"
                job.error_summary = f"[{e.code}] {e.message}"
                job.completed_at = datetime.datetime.now(datetime.timezone.utc)
                db.commit()
        except Exception as e:
            if job:
                job.status = "failed"
                job.error_summary = f"[EXECUTION_ERROR] Bounded worker error: {str(e)}"
                job.completed_at = datetime.datetime.now(datetime.timezone.utc)
                db.commit()
        finally:
            db.close()
