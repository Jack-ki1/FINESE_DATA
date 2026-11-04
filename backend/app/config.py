from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parents[2]

def _csv_env(name: str, default: str) -> list[str]:
    return [v.strip() for v in os.getenv(name, default).split(",") if v.strip()]

class Settings:
    APP_ENV = os.getenv("APP_ENV", "development")
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-this-secret-before-deployment")
    DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'data' / 'finese.db'}")
    STORAGE_DIR = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "data" / "storage"))).resolve()
    ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", str(BASE_DIR / "data" / "artifacts"))).resolve()
    FRONTEND_ORIGINS = _csv_env("FRONTEND_ORIGINS", "http://localhost:3000")
    MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_MB", "50")) * 1024 * 1024
    MAX_ROWS = int(os.getenv("MAX_ROWS", "250000"))
    MAX_COLUMNS = int(os.getenv("MAX_COLUMNS", "500"))
    TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7
    REDIS_URL = os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0")
    JOB_EXECUTION_MODE = os.getenv("JOB_EXECUTION_MODE", "inline").lower()
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
    ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-latest")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
    MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
    TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY")
    FIREWORKS_API_KEY = os.getenv("FIREWORKS_API_KEY")
    PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
    XAI_API_KEY = os.getenv("XAI_API_KEY")
    CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
    MOONSHOT_API_KEY = os.getenv("MOONSHOT_API_KEY")
    NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")
    AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
    AZURE_OPENAI_BASE_URL = os.getenv("AZURE_OPENAI_BASE_URL", "")
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "")
    CUSTOM_AI_API_KEY = os.getenv("CUSTOM_AI_API_KEY")
    CUSTOM_AI_BASE_URL = os.getenv("CUSTOM_AI_BASE_URL", "")
    ALLOW_REMOTE_DATABASE_CONNECTORS = os.getenv("ALLOW_REMOTE_DATABASE_CONNECTORS", "false").lower() == "true"
    REMOTE_DB_ALLOWED_HOSTS = _csv_env("REMOTE_DB_ALLOWED_HOSTS", "")

settings = Settings()
if settings.APP_ENV.lower() == "production" and settings.SECRET_KEY == "dev-only-change-this-secret-before-deployment":
    raise RuntimeError("Set a unique SECRET_KEY before running FINESE DATA in production.")
if settings.APP_ENV.lower() == "production" and settings.JOB_EXECUTION_MODE != "celery":
    raise RuntimeError("Production requires JOB_EXECUTION_MODE=celery so ML jobs survive API restarts.")
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
(settings.STORAGE_DIR.parent).mkdir(parents=True, exist_ok=True)
