from backend.app.celery_app import celery_app
from backend.app.services.jobs import run_ml_job

@celery_app.task(name="finese.run_ml_job", acks_late=True)
def run_ml_job_task(job_id: str) -> None:
    run_ml_job(job_id)
