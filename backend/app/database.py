from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from backend.app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    _apply_light_migrations()


def _apply_light_migrations():
    """Additive column migrations for installs created before a feature shipped.

    ``create_all`` only creates missing tables, so new nullable/defaulted columns
    have to be added explicitly. These statements are idempotent.
    """
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    pending = []
    if "workspaces" in inspector.get_table_names():
        columns = {c["name"] for c in inspector.get_columns("workspaces")}
        if "settings_json" not in columns:
            pending.append("ALTER TABLE workspaces ADD COLUMN settings_json TEXT DEFAULT '{}'")
    if pending:
        with engine.begin() as conn:
            for statement in pending:
                conn.execute(text(statement))
