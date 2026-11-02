import asyncio
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.schema import Job
from backend.app.schemas.jobs import (
    JobCancelResponse,
    JobStatusResponse,
    JobSubmitRequest,
    JobSubmitResponse,
)
from backend.app.services.job_runner import JobRunner
from backend.app.security import APIException

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("", response_model=JobSubmitResponse)
async def submit_job(req: JobSubmitRequest, db: Session = Depends(get_db)):
    job = JobRunner.create_job(db, req)
    # Trigger background worker execution
    asyncio.create_task(JobRunner.run_job_async(job.id))

    return JobSubmitResponse(
        job_id=job.id,
        job_type=job.job_type,
        status=job.status,
        created_at=job.created_at.isoformat(),
    )

@router.get("/{job_id}", response_model=JobStatusResponse)
def get_job_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise APIException(404, "JOB_NOT_FOUND", f"Job '{job_id}' not found.")

    results = None
    if job.results_json and job.results_json != "{}":
        try:
            results = json.loads(job.results_json)
        except Exception:
            pass

    return JobStatusResponse(
        job_id=job.id,
        job_type=job.job_type,
        status=job.status,
        progress=job.progress,
        parameters=json.loads(job.parameters_json or "{}"),
        results=results,
        error=job.error_summary,
        created_at=job.created_at.isoformat(),
        started_at=job.started_at.isoformat() if job.started_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
    )

@router.post("/{job_id}/cancel", response_model=JobCancelResponse)
def cancel_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise APIException(404, "JOB_NOT_FOUND", f"Job '{job_id}' not found.")

    if job.status in ("completed", "failed", "cancelled"):
        return JobCancelResponse(
            job_id=job.id,
            status=job.status,
            message=f"Job is already in terminal state '{job.status}'.",
        )

    job.status = "cancelled"
    job.error_summary = "Job execution cancelled by user request."
    db.commit()

    return JobCancelResponse(
        job_id=job.id,
        status="cancelled",
        message="Job cancellation requested successfully.",
    )
