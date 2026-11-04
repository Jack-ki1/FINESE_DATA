import datetime
import json
from sqlalchemy.orm import Session
from backend.app.database import SessionLocal
from backend.app.models import Job
from backend.app.schemas import TrainIn
from backend.app.services.ml import MLService

def run_ml_job(job_id: str) -> None:
    db: Session = SessionLocal()
    job = None
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job or job.status == "cancelled":
            return
        job.status = "running"
        job.progress = 10
        job.started_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()
        req = TrainIn.model_validate(json.loads(job.request_json))
        result = MLService.train(db, job.owner_id, job.workspace_id, req)
        db.refresh(job)
        if job.status != "cancelled":
            job.status = "completed"
            job.progress = 100
            job.result_json = json.dumps(result, default=str)
            job.finished_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()
    except Exception as exc:
        try:
            if job:
                job.status = "failed"
                job.error = str(getattr(exc, "detail", str(exc)))[:700]
                job.finished_at = datetime.datetime.now(datetime.timezone.utc)
                db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()
