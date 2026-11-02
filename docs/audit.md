# Repository audit — FINESE_2

**Audit snapshot:** GitHub `main` commit `e2124054de7269d9f1290ab6e4bd90679654a997`, whose branch metadata points to root tree `ac46a96bdb44303e72bd6a5a4dbfa8dc3b943930` (verified 2026-10-19).

## Verified repository shape

The repository is a Flask application, not a pre-existing Next.js app. The recursive tree includes:

- Entry/configuration: `app.py`, `config.py`, `state.py`, `requirements.txt`, `Dockerfile`, `docker-compose.yml`, `space.yaml`, `deploy_hf.sh`, `logging_config.py`.
- Core: `core/dataset_context.py`, `core/dataset_store.py`, `core/experiment_tracker.py`, `core/model_registry.py`.
- Routes: data, review, cleaning, charts, chatbot, ML, MLOps, SQL and export under `routes/`.
- Services: chart, cleaning, health, LLM, ML, profiling and SQL services under `services/`.
- Legacy UI: `templates/base.html`, `review.html`, `cleaning.html`, `charts.html`, `chatbot.html`, `ml.html`, `mlops.html`, `sql.html`, `export.html`, plus `static/css/style.css` and `static/js/main.js`.

The README describes seven original modules and a Flask-based product. Its feature descriptions are not proof that every module works end-to-end. The separate modern frontend and documentation in this download bundle have not been committed back to GitHub; the source repository remains unchanged by this packaging step. The supplied design reference is included as `docs/design-reference.png`. This handover does not claim to have executed the full legacy app because the packaging environment could not download dependencies; current runtime behavior must be tested in a Python-enabled checkout.

## Findings confirmed from source inspection

- `app.py` creates server-side filesystem sessions, upload/export/report/model directories and a process-local Flask-Limiter `memory://` store, and registers many Blueprints.
- `config.py` sets `UPLOAD_FOLDER = static/uploads`, a 50 MB request size, a filesystem session directory and a SQLite database URI default. Those defaults are not a durable multi-user serverless architecture.
- `core/dataset_store.py` persists DataFrames to local Parquet and is paired with current-dataset context helpers.
- `routes/data.py` relies on session state and dataset-context functions; inspect the `set_current_dataset`/`clear_current_dataset` flow before concurrency or tenancy.
- `routes/chatbot.py` contains preset response handlers and a route that accepts a provider API key into session. Any claim of encryption needs evidence from actual code and a dedicated review.
- `routes/sql.py` sends a submitted query to a DuckDB connection against the current DataFrame. Restriction/isolation must be proven before exposing it to untrusted users.
- `routes/ml.py` contains in-process global job/registry dictionaries, threads and parallelism configuration. This is not a durable job queue.
- `routes/mlops.py` includes local experiment storage and optional third-party tracking integrations; user/workspace ownership, durable persistence and capability flags need verification.
- Existing templates/style are legacy Bootstrap-oriented and are not the orange/navy marketing website in the provided design reference.

## Preserve / migrate decision

| Existing area | Decision | Notes |
|---|---|---|
| `core/`, `services/`, `utils/` | Preserve and audit | Keep useful deterministic analysis logic; port behind well-defined interfaces; add tests before relying on it. |
| `routes/` | Preserve as legacy API until migrated | Review auth, validation, request sizes and ownership. Do not expose every endpoint just because it exists. |
| `templates/`, `static/` | Preserve for legacy Flask runtime | New public experience is under `modern-web/`; old UI remains available for comparison during migration. |
| `app.py`, `config.py`, `state.py` | Preserve, then refactor for separately hosted Python deployment | Remove module-global user context and local-only persistence before multi-user use. |
| Local uploads/SQLite/session directories | Not for cloud persistence | Replace with request-scoped memory for local mode, or managed private storage / durable database for cloud mode. |
| MLOps / worker features | Limited until separate infrastructure exists | Don't describe the current process-local implementation as dependable serverless jobs. |

## Validation status

- [x] Current repository and recursive file inventory queried from GitHub.
- [x] Entry point, configuration and dependency files inspected.
- [x] Legacy architecture risks recorded.
- [x] A separate `modern-web/` starter created without deleting legacy files.
- [ ] Original Flask app startup and real dataset end-to-end run — blocked in this environment; do in a clean Python-enabled checkout.
- [ ] Modern Next.js `npm ci`, lint, typecheck and build — package registry request timed out in the artifact environment; regenerate the lockfile and run in a network-enabled environment.
- [ ] Browser automation/accessibility/performance tests — not run.

This audit is a source inventory and migration-risk audit, not a production security audit or certification.
