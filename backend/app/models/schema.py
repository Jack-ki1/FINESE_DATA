import datetime
import uuid
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from backend.app.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(120), nullable=False)
    owner_id = Column(String(120), nullable=False, default="default-user")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id"), nullable=False)
    title = Column(String(180), nullable=False)
    description = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), nullable=False, default="default-workspace")
    project_id = Column(String(36), nullable=True)
    name = Column(String(200), nullable=False)
    storage_path = Column(String(500), nullable=False)
    content_type = Column(String(100), default="text/csv")
    byte_size = Column(Integer, nullable=False, default=0)
    row_count = Column(Integer, nullable=False, default=0)
    column_count = Column(Integer, nullable=False, default=0)
    columns_json = Column(Text, nullable=False, default="[]")
    checksum = Column(String(64), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

class DatasetVersion(Base):
    __tablename__ = "dataset_versions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)
    version_number = Column(Integer, default=1)
    storage_path = Column(String(500), nullable=False)
    transformation_log = Column(Text, default="{}")
    created_at = Column(DateTime, default=utc_now)

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), nullable=False, default="default-workspace")
    project_id = Column(String(36), nullable=True)
    job_type = Column(String(60), nullable=False)  # e.g., "ml_train", "data_profile", "data_clean"
    status = Column(String(30), nullable=False, default="pending")  # pending, running, completed, failed, cancelled
    progress = Column(Integer, default=0)
    parameters_json = Column(Text, default="{}")
    results_json = Column(Text, default="{}")
    error_summary = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)

class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), nullable=False, default="default-workspace")
    project_id = Column(String(36), nullable=True)
    dataset_id = Column(String(36), nullable=True)
    name = Column(String(180), nullable=False)
    task_type = Column(String(50), nullable=False)  # classification, regression
    estimator = Column(String(80), nullable=False)
    target_column = Column(String(120), nullable=False)
    parameters_json = Column(Text, default="{}")
    metrics_json = Column(Text, default="{}")
    random_seed = Column(Integer, default=42)
    created_at = Column(DateTime, default=utc_now)

class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("jobs.id"), nullable=True)
    name = Column(String(200), nullable=False)
    storage_path = Column(String(500), nullable=False)
    format = Column(String(50), nullable=False)  # csv, json, joblib, onnx
    byte_size = Column(Integer, default=0)
    checksum = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=utc_now)

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(120), nullable=False, default="system")
    action = Column(String(100), nullable=False)  # e.g., "dataset.upload", "job.submit"
    resource_type = Column(String(60), nullable=False)
    resource_id = Column(String(60), nullable=False)
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=utc_now)
