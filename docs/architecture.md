# FINESE DATA architecture

## Boundary map

The project is organized into distinct, decoupled services:

- `frontend/`: the Next.js App Router experience and API gateway route handlers.
- `backend/`: the FastAPI analytics and machine learning compute engine (Mode C).
- `docs/`: architectural audits, migration maps, security checklists.

Inside `frontend/`:
- `frontend/app/`: public page routes, Studio route entrypoints, layout, metadata, robots and sitemap.
- `frontend/app/api/`: Next.js Route Handlers implementing standard API contracts.
- `frontend/components/landing.tsx`: long marketing page and shared public-page shell components.
- `frontend/components/studio.tsx`: interactive Studio shell and workflows; local state only.
- `frontend/components/contact-form.tsx`: validation and submission preparation.
- `frontend/lib/data.ts`: deterministic local CSV parser, profile calculations, cleaning operations, restricted query subset, CSV export and local insight helper.
- `backend.md`: target server/API architecture, persistence choices, security boundaries, deployment constraints and phased acceptance gates.

## Runtime data flow today

1. Browser imports CSV through a file picker.
2. The local parser validates size/shape and converts values to typed cells.
3. Profile/clean/chart/query/insight operations execute in browser JavaScript.
4. The current dataset and small experiment notes are saved to `localStorage` when available.
5. Export builds files in the browser using `Blob` and object URLs.
6. No dataset is posted to a FINESE DATA server in these local workflows.

The current parser and local storage are appropriate only for a capped starter. For a serious analytics engine, replace the supported query subset with DuckDB-WASM in a Worker and test how it serves its Worker/WASM assets in the production bundle. Set quotas based on measured browser performance rather than promising unlimited rows.

## Target cloud architecture

Keep cloud APIs thin and optional. Authentication and ownership checks should guard workspace/project records. Large files should go directly to private object storage with short-lived signed URLs, not through a serverless function body. SQL/data scans run in the browser where feasible. A separately hosted Python service should handle bounded heavy ML jobs through a durable queue and durable result store. See `backend.md`.

## Legacy Python boundary

The current Flask app already has profile, clean, chart, SQL, assistant, ML, export and MLOps route/service areas. Preserve useful computation, but remove reliance on session-global dataset IDs, module globals, filesystem persistence, in-process rate-limit/job state and public upload paths before treating it as multi-user cloud infrastructure. A future typed engine contract should make ownership explicit rather than silently using the currently active global dataset.

## Design rationale

- Keep SEO/public content server-renderable.
- Keep simple analysis working without an account or external provider.
- Defer cloud persistence, generative AI and heavy ML behind real, documented capabilities instead of placeholder success screens.
- Make the original Flask app remain available during validation and parity testing.
