# FINESE DATA V2 architecture

## Runtime topology

- **Next.js App Router** renders the marketing site, login/signup, the protected Studio and the authenticated API proxy.
- **HttpOnly session cookie** holds the signed backend bearer token. Browser code does not read the token. The server-side Studio layout checks session validity before rendering the protected route.
- **FastAPI** owns authentication, workspace access, file ingestion, profiling, transformations, AI provider calls, model training, experiments and inference.
- **PostgreSQL** is the Docker Compose database. SQLite is the default local-development database.
- **Private local storage volume** holds raw datasets, transformed versions and serialized model artifacts. It is separated into user/dataset folders.
- **Redis + Celery** execute ML training jobs in the Docker Compose stack. Local development can use inline jobs.

## Main data flow

1. User signs in. FastAPI creates/validates the identity; Next.js stores the access token in an HttpOnly, SameSite cookie.
2. The Studio calls same-origin `/api/proxy/...` routes. The Next.js server reads the cookie and forwards a bearer token to FastAPI.
3. FastAPI applies user ownership filters before reading or mutating a dataset, experiment, job, conversation or model.
4. Uploaded data is stored under a user-specific directory. Metadata and version records are written to SQL storage.
5. Dataset transformations write a new immutable physical version and update the dataset's active version pointer. Undo restores the prior version pointer.
6. ML jobs are stored in the jobs table and dispatched to Celery/Redis in the Compose configuration. The worker writes experiment metadata and the fitted model artifact.
7. Prediction requests load the authenticated user's registered artifact and invoke the fitted pipeline.

## Important boundaries

- Dataset values are untrusted input. AI receives a minimized profile; raw sample rows are sent only when separately selected by the user.
- Generated AI text is not treated as an executed computation. The current assistant uses deterministic profiling/statistical summaries as its evidence layer.
- Remote database connectors are disabled by default, restricted to an exact host allowlist and should use read-only source accounts.
- The current model deployment state is a workspace registry flag plus an authenticated inference route, not a public managed endpoint.
- Local filesystem storage is appropriate for development and a single-node Compose installation. Multi-node deployment requires shared object storage and lifecycle controls.

## Scaling path

For a production multi-tenant deployment, move raw files and model artifacts to private S3-compatible storage, add Alembic migrations, managed secrets, managed Redis, API rate limiting, durable job retries/dead-letter handling, worker resource quotas and monitoring. Add row-level security if direct database access is exposed to clients; current access is enforced in FastAPI service queries.
