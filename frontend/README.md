# FINESE DATA — web starter

This is the new browser-first web experience, kept in `modern-web/` alongside the original Flask analytics application at the repository root. It follows the provided FINESE DATA orange/navy brand reference and provides public marketing pages plus an interactive local Studio shell.

## Run locally

Prerequisites: a current Node.js release supported by the pinned Next.js version (Next.js installation docs currently list Node.js 20.9 as a minimum).

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Pages

Public: `/`, `/platform`, `/solutions`, `/services`, `/resources`, `/about`, `/contact`, `/privacy`, `/terms`, `/accessibility`.

Studio: `/studio`, `/studio/data`, `/studio/clean`, `/studio/charts`, `/studio/sql`, `/studio/assistant`, `/studio/ml`, `/studio/experiments`, `/studio/export`, `/studio/settings`, `/studio/help`.

## Functional scope in this starter

- Public landing page closely follows the supplied long-page design direction: dark technical hero, orange accents, analytics workspace mockup, feature cards, dark capability grid, local assistant preview, orange statement banner, workflow steps, industries, resources and footer.
- CSV import runs in the browser (10 MB, 50,000 data rows, 150-column caps).
- Local profile, missing values, exact duplicates, heuristic quality score and numeric summaries.
- Trim whitespace, remove exact duplicate rows, drop rows with missing values, fill missing cells with `Unknown`.
- Frequency bar chart for one field.
- Explicitly restricted teaching SQL subset (not DuckDB).
- Deterministic local insight helper; no external AI requests.
- Local experiment notes, theme setting, current dataset CSV export, JSON quality report, and delete-local-workspace control.
- Basic page metadata, robots exclusion for Studio, responsive CSS and reduced-motion support.

## Honest limitations

No full DuckDB-WASM connection, Excel/JSON/Parquet import, multi-chart dashboards, transform undo/redo history, generative AI proxy, ML training, Python worker, authentication, cloud sync, object storage, server-side contact delivery or production database is connected. Studio capability pages indicate these boundaries rather than simulating completion.

Read the repository-root `backend.md` for a staged backend architecture, security and privacy boundaries, external services, deployment cautions, data model and required acceptance gates.

## Checks

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```

`npm install` / `npm ci`, lint, typecheck and Next build were not successfully completed in the generation environment because package registry access timed out. Regenerate and commit `package-lock.json` from a network-enabled environment before expecting reproducible CI/deployment. The `tests/data.test.cjs` file covers parser, profile, cleaning, query safety and CSV formula escaping once dependencies are installed.

## Brand asset

The source image was provided as a visual reference. The current implementation uses a temporary typed brandmark and CSS/SVG-generated illustrations because the approved original logo/vector was not found in the repository inventory. Replace the temporary brandmark with the owner's exact asset once supplied; do not treat this text/SVG treatment as the final registered logo.
