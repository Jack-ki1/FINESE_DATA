# FINESE DATA — web application

This Next.js application is in `frontend/` and pairs with the FastAPI compute service in `backend/`. It provides public pages and a browser-local analytics Studio. The Studio starts empty: it does not preload fabricated or example business data.

## Run locally

Prerequisites: a current Node.js release supported by the pinned Next.js version (Next.js installation docs currently list Node.js 20.9 as a minimum).

```bash
npm ci
npm run dev
```

Then open `http://localhost:3000`.

## Pages

Public: `/`, `/platform`, `/solutions`, `/services`, `/resources`, `/about`, `/contact`, `/privacy`, `/terms`, `/accessibility`.

Studio: `/studio`, `/studio/data`, `/studio/clean`, `/studio/charts`, `/studio/sql`, `/studio/assistant`, `/studio/ml`, `/studio/experiments`, `/studio/export`, `/studio/settings`, `/studio/help`.

## Functional scope in this starter

- Public landing page follows the supplied brand direction and describes only implemented browser-local behavior and the separate Python API.
- CSV import runs in the browser (10 MB, 50,000 data rows, 150-column caps).
- Local profile, missing values, exact duplicates, heuristic quality score and numeric summaries.
- Trim whitespace, remove exact duplicate rows, drop rows with missing values, fill missing cells with `Unknown`.
- Frequency bar chart for one field.
- Explicitly restricted teaching SQL subset (not DuckDB).
- Deterministic local insight helper in Studio; no external AI request is made by browser-local analysis.
- Local experiment notes, theme setting, current dataset CSV export, JSON quality report, and delete-local-workspace control.
- Basic page metadata, robots exclusion for Studio, responsive CSS and reduced-motion support.

## Honest limitations

No full DuckDB-WASM connection, Excel/JSON/Parquet import, multi-chart dashboards, transform undo/redo history, browser-Studio ML integration, durable job worker, authentication, cloud sync, object storage, server-side contact delivery or production database is connected. The optional FastAPI AI endpoint requires explicit consent and a server-side provider key; it sends a prompt and minimized dataset profile, not raw rows. Studio capability pages indicate these boundaries rather than simulating completion.

Read the repository-root `backend.md` for a staged backend architecture, security and privacy boundaries, external services, deployment cautions, data model and required acceptance gates.

## Checks

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

The lockfile is committed. Run these checks after `npm ci`; production deployment still requires reviewing the owner-controlled domain, provider settings, privacy notice and legal terms.

## Brand asset

The source image was provided as a visual reference. The current implementation uses a temporary typed brandmark and CSS/SVG-generated illustrations because the approved original logo/vector was not found in the repository inventory. Replace the temporary brandmark with the owner's exact asset once supplied; do not treat this text/SVG treatment as the final registered logo.
