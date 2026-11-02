import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseModel):
    PROJECT_NAME: str = "FINESE DATA Compute Engine"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    ENV: str = os.getenv("ENV", "development")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "finese-data-compute-local-secret-key-change-in-prod")
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://finese-data.example",
    ]
    
    # Persistence
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/data/finese.db")
    STORAGE_DIR: Path = BASE_DIR / "data" / "storage"
    ARTIFACTS_DIR: Path = BASE_DIR / "artifacts"
    
    # Resource & Processing Caps (per backend.md)
    MAX_FILE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    MAX_DATA_ROWS: int = 50_000
    MAX_DATA_COLUMNS: int = 150
    DEFAULT_RANDOM_SEED: int = 42
    MAX_JOB_EXECUTION_SECONDS: int = 300
    ALLOWED_ESTIMATORS: list[str] = [
        "logistic_regression",
        "random_forest_classifier",
        "gradient_boosting_classifier",
        "linear_regression",
        "ridge_regression",
        "random_forest_regressor",
        "gradient_boosting_regressor",
    ]
    
    # Contact & AI settings
    CONTACT_EMAIL_RECIPIENT: str | None = os.getenv("CONTACT_EMAIL_RECIPIENT", None)
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY", None)
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY", None)

settings = Settings()

# Ensure directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
(BASE_DIR / "data").mkdir(parents=True, exist_ok=True)
