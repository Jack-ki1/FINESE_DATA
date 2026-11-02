# FINESE DATA Compute Engine (Backend)

The compute service for FINESE DATA, implementing Mode C from `backend.md`. Built with FastAPI, SQLAlchemy, SQLite/PostgreSQL, and scikit-learn.

## Architecture

* **Framework:** FastAPI with fully typed Pydantic v2 schemas and OpenAPI documentation (`/api/docs`).
* **Storage:** Isolated filesystem storage with SHA-256 deduplication and SQLite durable metadata store.
* **Bounded ML Pipeline:** Leakage-safe preprocessing (imputation + scaling fit strictly on train splits), baseline dummy comparison, task-appropriate metrics, and artifact generation.
* **Async Job Worker:** Non-blocking background worker for long-running compute jobs with cancellation and safe error reporting.
* **Error Standards:** Uniform error envelope per `backend.md`:
  ```json
  {
    "error": {
      "code": "INVALID_INPUT",
      "message": "Human readable message",
      "requestId": "uuid"
    }
  }
  ```

## Running the Backend

```bash
# From workspace root
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Run server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Running Tests

```bash
PYTHONPATH=. pytest backend/tests/ -v
```

## API Endpoints

* `POST /api/contact` - Anti-spam honeypot and validated contact handler.
* `POST /api/ai/insights` - User-consent gated AI insights with deterministic computation fallback.
* `POST /api/uploads/init` - Authorize file upload intent within 10 MB cap.
* `POST /api/uploads/complete` - Finalize upload, inspect dimensions, and register dataset.
* `POST /api/uploads/direct` - Direct binary file upload helper.
* `GET /api/datasets` - List registered datasets.
* `GET /api/datasets/{id}` - Fetch dataset summary.
* `GET /api/datasets/{id}/profile` - Deterministic column profiling and quality heuristics.
* `POST /api/datasets/{id}/clean` - Deterministic transforms (`trim`, `drop-duplicates`, `drop-missing`, `fill-missing`).
* `GET /api/datasets/{id}/export` - Download sanitized CSV with formula injection defense.
* `DELETE /api/datasets/{id}` - Soft-delete metadata and remove files.
* `POST /api/jobs` - Submit asynchronous compute job.
* `GET /api/jobs/{id}` - Poll job progress and safe results.
* `POST /api/jobs/{id}/cancel` - Request job cancellation.
* `POST /api/ml/train` - Supervised classification or regression training with baseline model benchmarking.
* `GET /api/ml/estimators` - Allowed estimator catalog.
