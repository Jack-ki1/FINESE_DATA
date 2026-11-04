# V2 implementation status

This document separates working features from constrained features and future integrations. A visible page or dependency is not, by itself, evidence of a complete backend capability.

| Area | Implemented in this build | Constraint / next engineering step |
|---|---|---|
| Public site | One-page responsive homepage, sections, product preview and CTAs | Brand-owner review of copy, logo and legal details |
| Accounts | Signup, login, password hashing, expiring HMAC-signed tokens, HttpOnly cookie | Add email verification, password recovery, MFA/OAuth and managed rate limits |
| Workspace | Per-user workspace; ownership filtering for datasets, jobs, experiments and conversations | Teams, invites, role-based access and audit UI not yet included |
| Storage | Local file storage; persistent Docker volume; PostgreSQL metadata in Compose | Managed object storage, signed uploads, retention lifecycle and backup automation |
| Ingestion | CSV, TSV, XLSX, XLS, JSON, JSONL/NDJSON, Parquet, SQLite | Warehouse-specific optimized connectors, object-store imports and streaming ingestion |
| Profiling | Missingness, duplicates, memory, inferred types, summaries, distributions, correlations | Domain validation rules, schema contracts, drift and reference-data checks |
| Health score | Transparent 65% completeness + 35% uniqueness heuristic | Not an accuracy score; do not use as a regulatory or business-truth certification |
| Cleaning | Eight deterministic actions, version history and undo | Fuzzy entity resolution, custom pipelines, visual lineage graph and bulk recipe management |
| Chat | Local deterministic summaries; optional OpenAI and Anthropic; saved conversations; consent | No arbitrary Python execution, arbitrary SQL execution or autonomous tool-using agent |
| Pivot / charts | Group-by count/sum/mean/median and tabular distribution presentation | Full chart catalogue, cross-filter dashboards, chart editing and PNG/SVG export |
| Traditional ML | Classification, regression, K-means, Isolation Forest; preprocessing, holdout, baseline, CV, grid search | More algorithms, cost-sensitive optimization, time-series validation, fairness and advanced tuning |
| Deep learning | Optional PyTorch tabular MLP for classification/regression | No CNN/RNN/LSTM/vision/Transformer training UI in this version |
| Model artifacts | Actual fitted joblib/torch bundles, authenticated download and predict route | Public serving, API gateway, model monitoring and autoscaling not included |
| Job execution | Inline local runner; Celery/Redis dispatch in Docker Compose | Retries, quotas, cancellation semantics, worker autoscaling and observability need deployment hardening |
| Reports | HTML, JSON, PDF, PowerPoint | Custom templates, scheduled reporting and signed/shareable report links not included |
| Data exports | CSV, JSON, Excel and Parquet | More formats and robust very-large-file streaming are future work |
| Connectors | PostgreSQL/MySQL preview and import behind off-by-default switch + host allowlist | Read-only DB user is mandatory; add per-tenant connector vault and managed secrets before production |

## Release acceptance checks

- [x] API registration/login and protected account identity.
- [x] User A cannot access User B's datasets or jobs in automated tests.
- [x] File upload, profile, clean, undo and data export.
- [x] Real scikit-learn model fit, saved artifact download and inference.
- [x] Job endpoint execution and user scoping.
- [x] Local-only AI mode and mocked Anthropic provider integration test.
- [x] HTML, PDF and PowerPoint report generation tests.
- [x] Python test suite passes in the build environment.
- [x] Frontend source syntax parse check performed.
- [ ] Full Next.js lint/typecheck/production build in this packaging environment (npm packages could not be fetched here).
- [ ] Browser-based visual and end-to-end tests.
- [ ] Production penetration test, dependency scan and deployment validation.
