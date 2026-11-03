# FINESE DATA — Backend Implementation Guide

**Status:** architecture and implementation handover for the browser-first starter. The starter is not a fully hosted multi-user SaaS application yet. This guide defines how to build the backend without compromising the privacy, honesty, or deployment constraints in the project brief.

## 1. Recommended operating modes

### Mode A — browser-local starter (default)

This is the launchable baseline represented in `frontend/`. Public marketing pages are rendered by Next.js. Basic CSV parsing, profiling, cleaning, supported charts, the restricted query subset, deterministic insight summaries and exports run in the browser. The user does not need an account, database, AI credential or Python server to try these features.

- Current import contract: CSV only, 10 MB maximum, 50,000 data rows, 150 columns.
- Local persistence uses browser `localStorage` for this small starter. This is not a durable database or backup and may be unavailable, quota-limited or evicted by the browser.
- No raw dataset is sent to a FINESE DATA API in this mode.
- Browser Studio does not call an AI provider; its assistant computes supported summaries locally. The separate FastAPI AI endpoint can call OpenAI only when configured and explicitly consented to; it sends the prompt and minimized dataset profile, not raw rows, and its generated text is not a verified computation.
- Server-side contact delivery is not implemented. The API returns `CONTACT_DELIVERY_UNAVAILABLE` instead of claiming an inquiry was sent.
- The current SQL panel is a **restricted teaching subset**, not DuckDB. It accepts only a small number of `SELECT` patterns, caps results, and blocks obvious file/network/write operations. Do not market it as general SQL until the DuckDB-WASM adapter is implemented and security-tested.
- The ML page is intentionally an explanation/roadmap, not a fake trainer. No training metrics are simulated.

### Mode B — optional cloud enhancement

Add authentication, named cloud projects, synced metadata, server-side contact delivery and optional AI only when there is a specific need. Basic local use should continue to work if every cloud credential is absent.

One reasonable stack is Supabase Auth + Postgres + private object storage; compare its then-current quotas, storage/egress rules, auth limits, regional availability and terms with alternatives before selecting it. Keep cloud features behind explicit configuration flags. Run schema migrations from source control. Never assume a free tier means unlimited, permanent, commercial or production-ready usage.

### Mode C — separately hosted Python compute

Deploy a separately controlled FastAPI service/worker for heavier use of the existing Flask/Pandas/scikit-learn/XGBoost/LightGBM/CatBoost/MLOps code. Host that component on infrastructure designed for longer CPU-bound jobs and durable storage. Vercel should orchestrate small requests and render the site, not be treated as a persistent Python job server.

Use a real queue such as a managed queue or Redis-backed task system only after checking costs, retention and operational responsibilities. A job should return an ID immediately; workers process the job with resource limits; a durable store tracks status, progress, metrics and artifact references. Include cancellation, retries, expiration and cleanup.

## 2. Vercel Hobby and deployment reality

**Do not deploy the commercial FINESE DATA business as a Vercel Hobby project unless its use clearly fits Vercel's current non-commercial, personal-use restriction.** Vercel's current Hobby plan page says Hobby is limited to non-commercial, personal use. For a business website or a commercial product, evaluate Vercel Pro or a compliant alternative and verify the terms before launch.

Official documentation checked for this handover:

- Vercel Hobby plan and its non-commercial restriction: https://vercel.com/docs/plans/hobby
- Function limits, body payload limits and memory/runtime details: https://vercel.com/docs/functions/limitations
- Function duration configuration: https://vercel.com/docs/functions/configuring-functions/duration
- Next.js App Router install requirements: https://nextjs.org/docs/app/getting-started/installation
- DuckDB-WASM overview and local-browser operation: https://duckdb.org/docs/current/clients/wasm/overview
- DuckDB-WASM deployment artifacts, workers and security considerations: https://duckdb.org/docs/stable/clients/wasm/deploying_duckdb_wasm

The Vercel Functions limits page currently documents a 4.5 MB request/response payload limit for Functions. Avoid posting full customer datasets through a Next.js route handler; a browser-local workflow or a direct-to-private-object-storage upload using a short-lived signed URL is more appropriate. Current maximum duration depends on compute configuration; duration is a request limit, not a promise that heavy training is appropriate there. Re-check all values before deployment because platform limits and plan terms change.

**Never rely on the function's writable local filesystem, in-memory globals, background threads, or a local SQLite file for shared durable production state.** Serverless instances can be recycled and concurrent requests may reach different instances. Keep public marketing content statically generated when possible; use server functions only for bounded orchestration or explicitly enabled services.

### Deployment checklist

1. Confirm whether the site is personal/non-commercial or commercial and select a permitted plan/host.
2. Set `frontend/` as the Vercel project root if deploying this subdirectory.
3. Select a Node.js version supported by the pinned Next.js release (the Next.js installation guide currently lists Node 20.9 minimum).
4. Configure `NEXT_PUBLIC_SITE_URL` to the real production origin before relying on sitemap URLs. Replace the `.example` placeholder.
5. If contact email preparation is wanted, set `NEXT_PUBLIC_CONTACT_EMAIL` to a real public inbox. This only opens the user's email client; it is not server-side delivery.
6. Keep all private provider keys server-side. Never place keys in `NEXT_PUBLIC_*` variables.
7. Build with a clean install, run tests, typecheck, lint and production build, then preview the deployment.
8. Set usage alerts, quotas, abuse controls and a documented upgrade plan for every external provider.

## 3. Keep the existing Flask engine — but isolate its responsibilities

The original app remains at the repository root. It contains reusable service and route modules worth auditing/migrating rather than deleting. Current root entry points include `app.py`, `config.py`, `state.py`, `core/`, `routes/`, `services/`, `utils/`, `templates/` and `static/`.

Before exposing existing endpoints to multiple users, address these design risks:

- `routes/data.py` and `core/dataset_store.py`: dataset context uses session and module-global current-dataset state. Scope every dataset to an authenticated user/workspace or make it explicitly request-bound; do not use module-global user data.
- `config.py` and `app.py`: filesystem sessions/uploads and in-process rate limiting are not shared durable production services. Replace them for hosted cloud mode.
- `routes/sql.py`: arbitrary input is sent to DuckDB against a dataframe. Never expose raw unrestricted SQL execution against an application process; isolate the database and block filesystem, network, extension loading and write access.
- `routes/ml.py`: globals such as `jobs`, in-process thread training and `N_JOBS = -1` are not reliable job orchestration. Put workload behind a bounded worker with queue, job ownership, concurrency policy, timeout, cancellation and cleanup.
- `routes/chatbot.py`: session-based API-key handling must not be assumed encrypted because a code comment says so. Review encryption/key lifetime, avoid logs, and prefer short-lived provider authorization or server-side BYOK vaulting with a separately reviewed key-management design.
- `routes/mlops.py`, `core/experiment_tracker.py`, and `core/model_registry.py`: in-process logs and local SQLite are development-level unless migrated to durable stores with workspace/user ownership.
- `static/uploads/`, export and report paths: do not store customer content in publicly served folders. Use private object storage with short-lived signed URLs if server-side files are required.

Preserve the old Flask app in the short term as a legacy/compute service. Do not move it to Vercel and claim parity just because a few route names exist in Next.js.

## 4. Suggested service boundaries

```text
Browser / Next.js UI
  ├─ Public marketing pages (server-rendered/static)
  ├─ Browser-local analytics engine
  │    ├─ CSV import and validation
  │    ├─ Web Worker + DuckDB-WASM (next milestone)
  │    ├─ deterministic profile/clean/chart helpers
  │    └─ local project metadata (quota-aware)
  └─ Optional authenticated API routes
       ├─ Auth + workspace membership validation
       ├─ contact delivery (server-side provider)
       ├─ AI proxy (consent, budget, tokens, quotas)
       ├─ signed upload/download URL broker
       └─ job submission/status only
            └─ separately hosted Python API / worker
                 ├─ bounded ML and explainability
                 ├─ MLOps / experiment registry
                 └─ artifact storage

Optional cloud data plane: managed Postgres + private object storage + queue.
```

Use Zod or a similarly maintained schema validator at trust boundaries. Validate every request on the server even if the browser validates it too. The browser UI must never be treated as an authorization layer.

## 5. Cloud data model (when enabled)

A sensible initial relational model is:

- `profiles`: auth provider subject, display preferences and minimal profile fields.
- `workspaces`: owner and workspace metadata.
- `workspace_members`: workspace, user, role. Start with owner-only if sharing is not required.
- `projects`: workspace ID, title, creation/update times, deletion/retention state.
- `datasets`: project ID, owner/workspace scope, original filename (sanitized), storage key, content type, byte size, row/column metadata, checksum and deletion status.
- `dataset_versions`: dataset ID, parent version, transform log metadata and a pointer to private storage only if versions actually exist.
- `experiments`: project ID, actor ID, parameters, random seed, code/version identifier, metrics and state.
- `jobs`: project/workspace ID, submitter, worker job ID, status enum, timestamps, retry count, cancellation state, capped resource profile and safe error summary.
- `artifacts`: job ID, private object key, format, byte size, checksum, expiration and owner scope.
- `audit_events`: actor, action, resource IDs and timestamp; do not store raw dataset values or credentials.

Turn on Row Level Security (RLS) for every user-scoped table, and test cross-user read/write denial. Use server-side service-role keys only in trusted server environments. Never ship a service-role key to the client. Store uploaded files in private buckets; use server-issued short-lived signed URLs with size/type restrictions. Enforce cleanup of abandoned uploads, expired datasets and expired artifacts.

## 6. Required API contract (design before implementation)

All endpoints should return a stable JSON error envelope such as `{ "error": { "code": "INVALID_INPUT", "message": "...", "requestId": "..." } }` and must not expose stack traces or secret values.

| Endpoint | Responsibility | Important constraints |
|---|---|---|
| `POST /api/contact` | Validate contact form and submit to configured delivery provider | Schema, honeypot/abuse defense, shared rate limit, no silent success |
| `POST /api/ai/insights` | Optional provider proxy | Explicit consent, input minimization, token/cost cap, server-only secret, user/workspace budget |
| `POST /api/uploads/init` | Create an authorized upload intent | Auth, workspace ownership, size/type cap, private bucket, short expiration |
| `POST /api/uploads/complete` | Verify uploaded object and create dataset metadata | Check checksum/size/content; never trust client filenames or object keys |
| `POST /api/jobs` | Submit an optional Python job | Authz, allowed job type, bounded parameters, idempotency key, quota check |
| `GET /api/jobs/:id` | Report job state | Ownership check on every request; redact internals |
| `POST /api/jobs/:id/cancel` | Ask worker to cancel | Verify ownership and terminal state; cancellation not instantaneous guarantee |
| `DELETE /api/datasets/:id` | Request dataset deletion | Owner check, invalidate metadata and enqueue object deletion, document retention window |

No endpoint above is implemented by this starter. Do not publish these paths as working API routes until each has code, security review and tests.

## 7. Browser data engine and SQL

The next browser analytics increment should use DuckDB-WASM in a dedicated worker. The official DuckDB docs describe its WebAssembly implementation as operating in the browser without sending data to a server, and list worker/WASM assets that must be bundled or served correctly.

Implementation outline:

1. Add a thin engine adapter interface: `importFile`, `getSchema`, `profile`, `query`, `transform`, `export`.
2. Instantiate DuckDB-WASM in a Worker and serve its JS worker/WASM assets using a supported package setup; test production pathing, CSP and offline failure states.
3. Register only the in-memory files created by the app. Do not enable arbitrary extension installation or network-backed file functions by default.
4. Query with bounded result counts and UI cancellation. Show execution time as measured, not fabricated.
5. Enforce file bytes, column count, row count, memory/worker watchdog strategy and graceful failure messages. Limits depend on real client browser resources.
6. Add adversarial tests for multi-statement queries, extension/network/file access, writes/DDL and unexpected table references.
7. Keep a restricted adapter interface for the UI instead of letting arbitrary components interact directly with low-level SQL connections.

The current starter's query subset is intentionally simpler and explicitly labeled. Do not remove this notice until full DuckDB-WASM behavior and threat tests are complete.

## 8. AI and data privacy

AI should enhance exploration, not invent arithmetic.

- Local deterministic operations come first, including profile summaries, basic comparisons and query results.
- For generative AI, show a just-in-time disclosure of the provider and exactly what is shared: schema, selected sample, whole dataset, or prompt text. Never send complete data silently.
- Make opt-in per workspace or per operation, and let the user cancel before data transmission.
- Use server-side provider credentials; use hard caps for request bytes, tokens, per-user/per-workspace usage, time and spend. Rate counters must use shared storage if running in a serverless environment.
- Have the model propose a query/tool call, validate it, execute deterministic computations, then return the result with its source query/columns/row count. Do not trust model-generated numeric claims without computation.
- Log request IDs, status, token counts and duration without dataset values, prompts that contain PII, API keys or sensitive content. Define retention and deletion controls.
- Review provider data retention, training use, processing region, licensing and commercial terms before launch.

## 9. Heavy ML and job lifecycle

Do not run unbounded Pandas/scikit-learn/XGBoost/LightGBM/CatBoost training synchronously inside a Vercel handler. Use a separately hosted Python runtime and durable job orchestration. The worker design should include:

- Allowed estimator/task matrix and dependency allowlist.
- File, feature, row, CPU, memory, wall-clock and concurrency caps.
- Deterministic train/validation/test split and random seed.
- Fit preprocessing only on training data to avoid leakage.
- Task-appropriate metrics, baseline and confusion/residual analysis.
- Progress events, cancel semantics, retries, timeout state, safe error summaries and cleanup.
- User/workspace ownership checks on submit, status, cancellation, logs and artifact download.
- Model serialization policy; never load user-supplied pickle/joblib artifacts from untrusted sources.

Only show a capability as enabled when the worker health check, queue, persistence and job lifecycle are connected and covered by integration tests.

## 10. Security and privacy checklist

- [ ] File validation by extension, signature/encoding, size, rows, columns and sheets; sanitized filenames.
- [ ] CSV formula-injection prevention in exports (implemented for text values in this starter; review headers and imported/exported values).
- [ ] No `eval`, no arbitrary Python or JavaScript execution from a dataset.
- [ ] Read-only and isolated SQL; no filesystem/network extension loading.
- [ ] CSRF protection where cookie-authenticated mutations are used; restrictive CORS where applicable.
- [ ] Content Security Policy and reviewed security headers for all third-party resources.
- [ ] Server-side validation, authorization and ownership scope on every resource endpoint.
- [ ] Private object storage, short-lived signed URLs, lifecycle/retention cleanup.
- [ ] Rate limiting backed by shared storage; cost and quota controls on AI and jobs.
- [ ] No credentials or raw dataset values in logs or client bundles.
- [ ] Cross-workspace isolation tests, upload abuse tests, adversarial SQL tests and deletion tests.
- [ ] Accessibility, dependency, secret and vulnerability checks in CI.

## 11. Secrets and environment variables

Use `.env.example` for names only, never real credentials. Keep secrets out of Git history, browser bundles, error reports, screenshots and test fixtures. Suggested server-side names after implementation:

- `DATABASE_URL` or managed provider equivalents — server-only.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` (only public anon key may be exposed), `SUPABASE_SERVICE_ROLE_KEY` (server-only).
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` or other chosen provider key — server-only.
- `CONTACT_EMAIL_PROVIDER_API_KEY` — server-only.
- `QUEUE_URL`, `OBJECT_STORAGE_*`, signing key and worker auth secret — server-only.
- `NEXT_PUBLIC_SITE_URL` and optional public `NEXT_PUBLIC_CONTACT_EMAIL` — non-secret values only.

Review key rotation and least privilege before enabling any provider. This starter does not implement encrypted BYOK storage; do not claim that it does.

## 12. Phased delivery and exit gates

1. **Audit baseline:** run the original Flask app and tests, capture sample import → profile → clean → query → export, inspect all routes and globals. Record the exact commit. No code deletion before inventory.
2. **Brand + public pages:** confirm logo asset and page screenshots at desktop/mobile widths; run keyboard, contrast and reduced-motion checks.
3. **Data core:** add Worker-based DuckDB-WASM, type inference fixtures, cleaning preview + undo log and CSV export. Test CSV edge cases, 10k/100k row behavior on supported devices.
4. **Charts and workspace:** implement accessible chart schema, filters, workspace save/reopen and exports. Three chart types are required before marking this milestone done.
5. **AI/ML:** deterministic computed provenance first; then optional AI proxy with consent/budget. External worker only after security, lifecycle and repeatability tests.
6. **Cloud/auth:** implement RLS and owner-scoped storage, then cross-user authorization tests. Keep local mode functional without cloud environment variables.
7. **Release:** clean-clone install, lint, typecheck, unit/integration/e2e tests, build, preview deploy, mobile/accessibility/performance checks and cost/terms review.

## 13. Commands

From `frontend/`:

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm run build
npm start
```

The package versions are pinned in `package.json`. `package-lock.json` is intentionally not fabricated: package-registry access timed out in the generation environment, so a lockfile could not be generated or verified here. Run `npm install` in a network-enabled environment, review the dependency tree and commit the resulting lockfile before treating deployment as reproducible.
