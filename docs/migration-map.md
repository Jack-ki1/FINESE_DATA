# Legacy Flask → browser-first FINESE DATA migration map

| Legacy module | Existing location | New experience / target | Status |
|---|---|---|---|
| Landing / overview | `app.py` root → `templates/review.html` | `frontend/app/page.tsx` | New marketing landing page added; preserve old review route during transition. |
| Data review / profiling | `routes/review.py`, `services/profiling_service.py`, `core/dataset_context.py` | `/studio/data` and `/studio` | New CSV-only local profile and sample preview; compare formulas with legacy implementation before migration. |
| Data upload / store | `routes/data.py`, `core/dataset_store.py` | `frontend/lib/data.ts` import contract; future DuckDB-WASM worker | Browser-local CSV parser is implemented with caps; Parquet/local storage semantics and multi-format import remain deferred. |
| Data cleaning | `routes/cleaning.py`, `services/cleaning_service.py` | `/studio/clean` | Implements trim, exact duplicate removal, drop rows with missing values, and fill missing with “Unknown”; no full undo history yet. |
| Charts | `routes/charts.py`, `services/chart_service.py` | `/studio/charts` | Basic bar-frequency visualization works; full Plotly feature parity, linked dashboards, more chart types and export remain deferred. |
| AI assistant | `routes/chatbot.py`, `services/llm_service.py` | `/studio/assistant` | Deterministic local insight helpers work; generative provider proxy intentionally not connected. |
| SQL | `routes/sql.py`, `services/sql_service.py` | `/studio/sql` | Small, read-only teaching subset implemented. Not a general SQL engine; DuckDB-WASM worker is the planned replacement. |
| ML | `routes/ml.py`, `services/ml_service.py`, `utils/ml_utils.py` | `/studio/ml` | Honest disabled/educational state only; no model is trained. Heavy training moves to separately hosted bounded worker. |
| Experiments / registry | `routes/mlops.py`, `core/experiment_tracker.py`, `core/model_registry.py` | `/studio/experiments` | Local notes are implemented; model registry and durable experiments remain deferred. |
| Export | `routes/export.py` | `/studio/export` | CSV and JSON quality report downloads implemented in browser. XLSX/PDF/PPTX/Parquet export remains deferred. |
| Settings / local data deletion | New capability | `/studio/settings` | Theme preference and browser local data/experiment removal implemented. |
| Public company/services pages | Not found as current public brand site | `/platform`, `/solutions`, `/services`, `/resources`, `/about`, `/contact` | Public routes and draft copy added; owner must review brand/logo, business/legal details and contact delivery. |

## Migration rules

1. Do not delete legacy modules until replacement behavior has parity tests and a documented owner decision.
2. Share pure computation contracts across Python and TypeScript only after defining input/output schemas and parity fixtures; don't share session-bound state.
3. Keep the browser path functional without Supabase, an AI key or Python server.
4. Every feature label must correspond to a passing acceptance test; unsupported features remain marked as limited, planned or disconnected.
