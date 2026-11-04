# FINESE DATA V2

**A Python-powered data science workspace with a Next.js interface.**

FINESE DATA V2 is a self-hosted analytics studio: you upload a dataset, and the
platform profiles it, lets you clean it with reproducible operations, build
charts and pivot tables from it, train and inspect machine-learning models on
it, and export the results. There is also an optional AI assistant that explains
the *deterministic* statistics the platform computed — it never invents numbers.

This document explains the whole project: what every screen does, how the
pieces fit together, what each file is for, how data flows end to end, and what
the limits of the current implementation are.

> **Status:** this is a working V2 foundation. Section 20 lists exactly what is
> *not* implemented, so nothing here over-promises.

---

## Table of contents

1. [What this project is](#1-what-this-project-is)
2. [Feature tour](#2-feature-tour)
3. [Technology stack and languages](#3-technology-stack-and-languages)
4. [Repository layout](#4-repository-layout)
5. [Architecture and request flow](#5-architecture-and-request-flow)
6. [Getting started](#6-getting-started)
7. [Configuration reference](#7-configuration-reference)
8. [Backend in detail](#8-backend-in-detail)
9. [Frontend in detail](#9-frontend-in-detail)
10. [The six Studio sections](#10-the-six-studio-sections)
    - 10.1 [Upload & Connect](#101-upload--connect)
    - 10.2 [Overview](#102-overview)
    - 10.3 [Cleaning Studio](#103-cleaning-studio)
    - 10.4 [Plot Studio](#104-plot-studio)
    - 10.5 [Model Studio](#105-model-studio)
    - 10.6 [Export Center](#106-export-center)
    - 10.7 [Settings](#107-settings)
11. [Project settings model](#11-project-settings-model)
12. [AI providers and models](#12-ai-providers-and-models)
13. [Data model and storage](#13-data-model-and-storage)
14. [Security model](#14-security-model)
15. [Statistic and algorithm reference](#15-statistic-and-algorithm-reference)
16. [Design system and layout](#16-design-system-and-layout)
17. [Testing](#17-testing)
18. [Common workflows](#18-common-workflows)
19. [Troubleshooting](#19-troubleshooting)
20. [Scope, caveats and roadmap](#20-scope-caveats-and-roadmap)
21. [Glossary](#21-glossary)

---

## 1. What this project is

### The problem it solves

Analysts usually bounce between a notebook, a spreadsheet, a BI tool and a
model-training script. Each hop loses context: the cleaning you did in pandas is
not reproducible in the dashboard, the chart in the BI tool does not know which
rows were dropped, and neither knows what the model was trained on.

FINESE DATA V2 keeps one source of truth — a versioned dataset stored on the
server — and gives every capability (profiling, cleaning, plotting, modelling)
an explicit, tunable interface over it.

### Design principles

| Principle | What it means in the code |
|---|---|
| **Deterministic first** | Every number on screen (KPI, chart, metric) is computed by pandas/scikit-learn on the server. The AI layer only *explains* those numbers. |
| **User control** | Every operation exposes its parameters. Thresholds, bins, aggregations, folds and test sizes are inputs, not constants — and the chosen defaults persist per workspace in Settings. |
| **Reproducibility** | Cleaning writes an immutable CSV *version* per action; a "recipe" replays several steps as one transaction. Models store their full configuration and artifact. |
| **Honest metrics** | Quality scores are explicitly heuristic. Accuracy/consistency/timeliness show `n/a` rather than an invented number. |
| **Privacy by default** | The assistant runs locally unless you opt in to an external provider per request. |

### Two processes, one product

```
┌──────────────────────────┐        HTTP/JSON        ┌────────────────────────┐
│  Next.js 15 (TypeScript) │ ──────────────────────▶ │  FastAPI (Python)      │
│  UI, auth cookies, proxy │ ◀────────────────────── │  pandas / sklearn / ML │
└──────────────────────────┘                         └───────────┬────────────┘
                                                                 │
                                                ┌────────────────┴───────────────┐
                                                │ SQLite/Postgres + CSV artifacts│
                                                └────────────────────────────────┘
```

The browser never talks to the Python API directly. It calls Next.js route
handlers, which attach the session token server-side and forward the request.

---

## 2. Feature tour

### Public site and accounts
- Marketing homepage, sign-up and sign-in.
- Sessions stored in an `HttpOnly`, `SameSite` cookie — the bearer token is never
  exposed to browser JavaScript.
- Server-side route guard on `/studio`.

### Studio (seven sidebar areas, six of them data-facing)

| Area | Purpose | Highlights |
|---|---|---|
| **Upload** | Bring data in | File drop (8 formats), sample datasets, database connector preview/import |
| **Overview** | Understand data | Single KPI row, data snapshot, column summary, quality dashboard, five expandable analysis sections |
| **Cleaning** | Fix data | 23 tunable operations, dry-run preview, batch recipe, custom steps, version history |
| **Plot Studio** | Visualise | 16 chart types, dashboard builder, multi-field pivots, plot assistant |
| **Model Studio** | Predict | Training, leaderboard, auto-sweep, run comparison, five diagnostic tabs, live inference |
| **Export** | Deliver | CSV/XLSX/JSON/Parquet data, HTML/PDF/PPTX reports, JSON profile, model artifacts |
| **Settings** | Configure | Project preferences, per-section tuning, section visibility, AI provider/model |

### Cross-cutting
- Toast notifications, inline error alerts and a training progress indicator.
- A floating assistant widget available on every screen, using the AI model
  chosen in Settings.

---

## 3. Technology stack and languages

### Languages

| Language | Where | Rough share |
|---|---|---|
| **TypeScript / TSX** | `frontend/` (UI + route handlers) | ~55% of new code |
| **Python 3.11+** | `backend/` (API, statistics, ML) | ~40% |
| **CSS** | `frontend/app/globals.css` | ~5% |
| **JavaScript (CommonJS)** | `frontend/tests/contracts.test.cjs` | tests only |
| **SQL** | through SQLAlchemy / SQLite readers | no hand-written schema files |

### Backend

| Package | Role |
|---|---|
| `fastapi`, `uvicorn` | HTTP API |
| `pydantic` v2 | Request/response validation |
| `SQLAlchemy` 2 | ORM, persistence |
| `pandas`, `numpy` | Profiling, cleaning, aggregation, chart data |
| `scikit-learn` | Preprocessing pipelines, models, metrics, CV, learning curves |
| `joblib` | Model artifact serialisation |
| `httpx` | Outbound calls to AI providers |
| `reportlab`, `python-pptx` | PDF and PowerPoint reports |
| `celery`, `redis` | Optional durable job queue (Docker Compose) |
| `torch` | Optional tabular MLP (`requirements-ml.txt`) |

### Frontend

| Package | Role |
|---|---|
| `next` 15 (App Router) | Routing, server components, route handlers, build |
| `react` 19 | UI |
| `lucide-react` | Icon set |
| `typescript` 5 | Type safety |
| `eslint-config-next` | Lint rules (including React Compiler checks) |

There is **no charting library**. All charts are hand-written SVG components in
`frontend/components/charts.tsx` — no extra runtime dependency, full control
over tooltips, scaling and theming.

### Why this split

Python owns everything numeric: pandas does the profiling, scikit-learn does the
modelling, and all heavy work stays server-side so the browser only ever
receives ready-to-render numbers. TypeScript owns interaction: forms, state,
layout and the API proxy.

---

## 4. Repository layout

```
FINESE_DATA_V2/
├── README.md                     ← this document
├── LICENSE
├── docker-compose.yml            ← Postgres + Redis + API + worker + web
├── .env.example                  ← every supported environment variable
│
├── backend/                      ← Python API (FastAPI)
│   ├── Dockerfile
│   ├── requirements.txt          ← core dependencies
│   ├── requirements-ml.txt       ← optional PyTorch extras
│   ├── .env.example
│   ├── app/
│   │   ├── main.py               ← all HTTP routes (~450 lines)
│   │   ├── config.py             ← settings object, env parsing
│   │   ├── database.py           ← engine, session, init_db + light migrations
│   │   ├── models.py             ← SQLAlchemy tables
│   │   ├── schemas.py            ← Pydantic request models
│   │   ├── security.py           ← hashing, token issue/verify, filename safety
│   │   └── services/
│   │       ├── datasets.py       ← file reading, profiling, CleaningEngine
│   │       ├── insights.py       ← overview statistics (descriptive, missing,
│   │       │                        outliers, association, distributions)
│   │       ├── plots.py          ← plot spec → chart data; pivot tables
│   │       ├── ml.py             ← MLService.train + estimator registry
│   │       ├── modeling.py       ← diagnostics, leaderboard, compare, learning
│   │       ├── ai.py             ← AIService: local answers + provider calls
│   │       ├── ai_catalog.py     ← provider/model catalogue + defaults
│   │       ├── project_settings.py ← per-workspace settings merge/validate
│   │       └── jobs.py           ← background training job runner
│   ├── tests/
│   │   ├── conftest.py           ← isolated temp DB + client fixture
│   │   └── test_platform.py      ← 8 end-to-end API tests
│   └── artifacts/                ← saved .joblib models (gitignored)
│
├── frontend/                     ← Next.js application
│   ├── package.json
│   ├── tsconfig.json             ← `@/*` → `frontend/*`
│   ├── next.config.ts
│   ├── eslint.config.mjs
│   ├── tests/contracts.test.cjs  ← node:test contract checks
│   ├── app/
│   │   ├── layout.tsx            ← root layout, fonts, metadata
│   │   ├── page.tsx              ← marketing homepage
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── globals.css           ← the entire design system
│   │   ├── icon.svg
│   │   ├── studio/
│   │   │   ├── layout.tsx        ← server-side auth guard
│   │   │   └── page.tsx          ← renders <StudioClient/>
│   │   └── api/
│   │       ├── auth/{login,logout,me,register}/route.ts
│   │       └── proxy/[...path]/route.ts  ← authenticated reverse proxy
│   ├── components/
│   │   ├── studio-client.tsx     ← shell: sidebar, topbar, state, widget
│   │   ├── studio-types.tsx      ← shared types + SettingsProvider
│   │   ├── records-sections.tsx  ← Upload + Export sections
│   │   ├── overview-section.tsx  ← Overview (KPIs, snapshot, 5 analyses)
│   │   ├── cleaning-section.tsx  ← Cleaning Studio
│   │   ├── plot-studio-section.tsx ← plots, pivots, dashboard
│   │   ├── model-section.tsx     ← Model Studio
│   │   ├── settings-section.tsx  ← Settings
│   │   ├── charts.tsx            ← SVG chart library
│   │   └── ui.tsx                ← panels, toggles, sliders, tabs, tables
│   └── lib/
│       ├── api.ts                ← `api()` fetch helper + upload + download
│       └── catalog.ts            ← static option lists
│
└── data/                         ← local SQLite DB + uploaded files (gitignored)
```

### File-by-file responsibilities

| File | Responsibility |
|---|---|
| `backend/app/main.py` | Every endpoint, ownership checks, export/report generation |
| `backend/app/config.py` | Paths, limits, provider keys, CORS origins |
| `backend/app/database.py` | Engine, `get_db`, `init_db` + additive migrations |
| `backend/app/models.py` | `User`, `Workspace`, `Dataset`, `DatasetVersion`, `Experiment`, `Conversation`, `Job` |
| `backend/app/services/datasets.py` | `read_file`, `profile`, `preview`, `correlate`, `CleaningEngine` |
| `backend/app/services/insights.py` | Pure functions behind Overview charts |
| `backend/app/services/plots.py` | Declarative plot specs and pivot specs |
| `backend/app/services/ml.py` | Training pipeline and estimator availability |
| `backend/app/services/modeling.py` | Post-training diagnostics and rankings |
| `backend/app/services/ai.py` | Local answers, consent gate, provider transports |
| `frontend/components/studio-client.tsx` | Orchestrates all state and networking |
| `frontend/components/*-section.tsx` | One file per Studio area |
| `frontend/components/charts.tsx` | `BarChart`, `LineChart`, `ScatterChart`, `Heatmap`, … |
| `frontend/app/api/proxy/[...path]/route.ts` | Injects the bearer token, blocks cross-origin writes |

---

## 5. Architecture and request flow

### Layers

1. **Presentation** — React components. No business logic beyond formatting and
   local form state.
2. **Transport** — `frontend/app/api/proxy/[...path]/route.ts`. Validates origin,
   reads the `finese_session` cookie, forwards the request with an `Authorization`
   header, and returns the upstream body unchanged.
3. **API** — FastAPI routes. Resolve the current user, verify ownership, call a
   service.
4. **Domain services** — pure-ish functions over DataFrames. They have no
   knowledge of HTTP.
5. **Persistence** — SQLAlchemy models plus CSV snapshots and `.joblib` artifacts
   on disk.

### A read request (Overview)

```
Browser                Next.js                    FastAPI                 Disk
  │  GET /api/proxy/api/datasets/:id/analysis
  ├──────────────────▶ proxy route
  │                    cookie → Bearer …           get_current_user
  │                    ────────────────────────▶  own_dataset()
  │                                               read_file()  ──────────▶ version_N.csv
  │                                               InsightsService.overview()
  │  JSON ◀──────────────────────────────────────  (pure pandas)
```

### A write request (Cleaning)

```
POST /api/datasets/:id/clean  {operation, columns, options, dry_run}
  ├─ dry_run  → CleaningEngine.preview()      ← returns before/after, saves NOTHING
  └─ commit   → CleaningEngine.apply()
                 ├─ write version_{n}.csv      (new immutable snapshot)
                 ├─ UPDATE datasets SET storage_path = version_n.csv
                 └─ INSERT dataset_versions(version=n, action, details)
```

Undo simply points `datasets.storage_path` back at the previous version file, so
nothing is ever destroyed and history stays inspectable.

### A long-running request (Training)

```
POST /api/jobs ──▶ Job(status="queued") ──▶ (inline task | Celery worker)
UI polls GET /api/jobs/:id every second, drawing a progress bar
  completed → { result: {experiment_id, metrics, details…} }
  failed    → { error }
  GET /api/experiments/:id → same result + pre-computed `charts`
```

---

## 6. Getting started

### Prerequisites

- Python **3.11+**
- Node.js **20+**
- No database server needed for local development (SQLite).

### 1. Backend

```bash
cd FINESE_DATA_V2
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

# optional deep learning extra
pip install -r backend/requirements-ml.txt

cp .env.example .env                 # then set SECRET_KEY
uvicorn backend.app.main:app --reload --port 8000
```

The API creates its tables on startup (`init_db`) and applies additive column
migrations for older databases.

### 2. Frontend

```bash
cd frontend
npm install
# .env.local
echo "BACKEND_URL=http://127.0.0.1:8000" > .env.local
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.local
npm run dev
```

Open <http://localhost:3000>, create an account, and load a sample dataset.

### 3. Docker Compose (Postgres + Redis + Celery)

```bash
docker compose up --build
```

This runs the API, a Celery worker for durable training jobs, Postgres, Redis and
the web app. See `docker-compose.yml` for ports and volumes.

### 4. Production build

```bash
cd frontend && npm run build && npm start
```

---

## 7. Configuration reference

### Backend environment

| Variable | Default | Notes |
|---|---|---|
| `SECRET_KEY` | *(required)* | Signs auth tokens. Use ≥32 random characters. |
| `DATABASE_URL` | `sqlite:///./data/finese.db` | Postgres URL supported |
| `STORAGE_DIR` | `./data/storage` | Dataset CSV versions |
| `ARTIFACTS_DIR` | `./backend/artifacts` | `.joblib` models |
| `MAX_ROWS` | 250 000 | Upload row cap |
| `MAX_COLUMNS` | 500 | Upload column cap |
| `MAX_UPLOAD_MB` | 50 | Upload size cap |
| `JOB_EXECUTION_MODE` | `inline` | `inline` or `celery` |
| `FRONTEND_ORIGINS` | localhost origins | CORS allow-list |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | — / `gpt-4o-mini` | |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | — / `claude-3-5-haiku-latest` | |
| `GOOGLE_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY`, `TOGETHER_API_KEY`, `FIREWORKS_API_KEY`, `PERPLEXITY_API_KEY`, `XAI_API_KEY`, `CEREBRAS_API_KEY`, `MOONSHOT_API_KEY`, `NVIDIA_API_KEY` | — | Enable the matching provider |
| `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_BASE_URL` | — | Azure deployments |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434/v1` | Self-hosted models |
| `CUSTOM_AI_API_KEY`, `CUSTOM_AI_BASE_URL` | — | Any OpenAI-compatible gateway |

Provider keys are read **server-side only** and never sent to the browser; the
Settings screen merely shows whether each one is configured.

### Frontend environment

| Variable | Purpose |
|---|---|
| `BACKEND_URL` | Where the proxy forwards to (default `http://127.0.0.1:8000`) |
| `NEXT_PUBLIC_APP_URL` | Allowed origin for state-changing proxied requests |

---

## 8. Backend in detail

### 8.1 `main.py` — endpoint map

**Auth**
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account + workspace, return token |
| POST | `/api/auth/login` | Verify password, return token |
| GET | `/api/auth/me` | Current user + workspace |

**Datasets**
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/datasets/upload` | Multipart upload → profile |
| POST | `/api/datasets/sample?kind=` | `sales` · `customers` · `churn` |
| GET | `/api/datasets` | List summaries |
| GET | `/api/datasets/{id}` | Summary + profile + preview |
| GET | `/api/datasets/{id}/profile` | Full profile |
| GET | `/api/datasets/{id}/preview?limit=` | First/last N rows |
| GET | `/api/datasets/{id}/analysis` | Overview analysis (tunable method/bins) |
| DELETE | `/api/datasets/{id}` | Soft delete |

**Cleaning**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/cleaning/catalog` | 23 operations with parameter specs |
| POST | `/api/datasets/{id}/clean` | Apply (or `dry_run`) one operation |
| POST | `/api/datasets/{id}/clean/preview` | Dry-run alias |
| POST | `/api/datasets/{id}/clean/recipe` | Apply an ordered step list |
| GET | `/api/datasets/{id}/versions` | Version lineage |
| POST | `/api/datasets/{id}/undo` | Restore previous version |

**Visualisation**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/plots/catalog` | Chart types and aggregations |
| POST | `/api/datasets/{id}/plot` | Plot spec → labels + series |
| POST | `/api/datasets/{id}/pivot` | Pivot spec → one table per aggregation |
| POST | `/api/datasets/{id}/aggregate` | Simple grouped aggregation |

**Machine learning**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/ml/estimators` | Available algorithms by task |
| POST | `/api/jobs` | Queue training |
| GET | `/api/jobs/{id}` | Poll job |
| POST | `/api/ml/sweep` | Train several estimators and rank them |
| GET | `/api/experiments` | List runs |
| GET | `/api/experiments/summary` | Leaderboard + timeline + task counts |
| GET | `/api/experiments/{id}` | Full run + pre-computed charts |
| GET | `/api/experiments/{id}/learning-curve` | Recompute learning curve |
| POST | `/api/experiments/compare` | Side-by-side metrics |
| DELETE | `/api/experiments/{id}` | Delete run + artifact |
| POST | `/api/models/{id}/deploy` | Mark as deployed |
| POST | `/api/models/{id}/predict` | Inference |
| GET | `/api/models/{id}/download` | Download `.joblib` |
| GET | `/api/datasets/{id}/modeling-eda?target=` | Class balance, missingness, correlation |

**AI, settings, export**
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/chat` | Assistant (local or provider) |
| GET | `/api/conversations` | History |
| GET | `/api/settings` | Settings + AI catalogue |
| PATCH | `/api/settings` | Deep-merge a patch |
| POST | `/api/settings/reset` | Restore defaults |
| GET | `/api/ai/catalog` | Providers and models |
| GET | `/api/datasets/{id}/export?format=` | csv · json · xlsx · parquet |
| GET | `/api/datasets/{id}/report?format=` | html · json · pdf · pptx |
| POST | `/api/connectors/preview` · `/import` | Database connectors |

### 8.2 `datasets.py` — reading and profiling

`read_file` dispatches on extension. Every upload is capped by row and column
limits; duplicates in header names are uniquified (`name_2`, `name_3`).

`profile()` computes, per column: inferred kind (`numeric`, `categorical`,
`datetime`, `date-like`, `boolean`, `text`), missing counts and percentages,
unique counts, numeric summaries (mean/median/std/min/max/quartiles/IQR
outliers) and a 5–12 bucket distribution. Dataset level: missing totals,
exact-duplicate rows, memory footprint, a heuristic quality score, dimension
scores and plain-language recommendations.

`CleaningEngine` holds the operation table. Each entry declares its category,
how many columns it needs (`single`, `multi`, `multi_required`, `subset`, `none`)
and a typed parameter list that the UI renders directly. `apply()` is pure — it
returns `(frame, affected_count, detail)` and never writes. `preview()` wraps it
and reports before/after shapes and sample rows.

### 8.3 `insights.py` — Overview statistics

Five public functions, each queryable with thresholds:

| Function | Returns |
|---|---|
| `descriptive()` | Per-column stats, histogram bins, box-plot fences, skew, kurtosis |
| `missing_map()` | Down-sampled NULL grid (≤240 rows), per-column share, common gap patterns |
| `outliers()` | IQR or z-score flags, fences, flagged values per column |
| `association()` | Pearson/Spearman matrix, strongest pairs, pair scatters, Cramér's V for categoricals, normalised mutual information for mixed pairs |
| `distributions()` | Histograms and category frequencies |

`InsightsService.overview()` bundles them into one response so the Overview
screen needs a single round-trip.

### 8.4 `plots.py` — declarative charts

A plot spec is a plain JSON object:

```json
{
  "type": "grouped_bar",
  "x": "contract", "y": "monthly_charges", "series": "churn",
  "aggregation": "mean", "limit": 20, "sort": "value_desc",
  "filters": [{"column": "tenure_months", "operator": "gte", "value": "12"}]
}
```

`PlotService.build()` validates the spec, applies filters, aggregates and returns
a uniform response: `labels`, `series_data[{name, values|points}]`, `meta`,
`table` and, for specialised types, `boxes`, `heatmap` or `kpi`. Because the
shape is uniform, the same response drives rendering, downloads and CSV export.

`pivot()` produces one table per (aggregation, value) pair with row labels,
flattened column labels, column totals and a grand total.

### 8.5 `ml.py` and `modeling.py`

`MLService.train()` builds a scikit-learn `Pipeline`:

```
ColumnTransformer(
  numeric  → SimpleImputer → StandardScaler
  category → SimpleImputer(most_frequent) → OneHotEncoder(handle_unknown="ignore")
) → estimator
```

It fits on the training split, evaluates on the holdout, cross-validates, runs an
optional `GridSearchCV`, extracts feature importance (tree `feature_importances_`
or mean absolute `coef_`), computes diagnostics, and saves the fitted pipeline.

`modeling.py` then derives chart-ready series: ROC/PR curves, calibration bins,
probability histogram, per-class precision/recall, confusion pairs, residuals,
predicted-vs-actual points, learning curves, and a composite ranking score
(classification `0.6·F1 + 0.4·accuracy`; regression `R²`).

Diagnostics are computed **once at training time** and stored, so opening a run
in Model Studio is instant.

### 8.6 `ai.py`

`AIService.respond()` follows a strict order:

1. Load the dataset (ownership-checked) and compute its profile.
2. Build a deterministic local answer (`local_answer`) from keyword intent.
3. If external sharing is enabled, resolve provider/model through
   `ai_catalog.resolve()` and call the right transport.
4. Persist the conversation turn.

Transports: Anthropic Messages, Gemini `generateContent`, and OpenAI-compatible
`/chat/completions` (used by most providers). Unconfigured providers return
`503` instead of silently falling back, so the user knows why.

---

## 9. Frontend in detail

### 9.1 App Router structure

| Path | Type | Purpose |
|---|---|---|
| `/` | Server component | Marketing page |
| `/signup`, `/login` | Client components | Auth forms |
| `/studio` | Server component | Renders `<StudioClient/>` |
| `/studio` layout | Server component | Redirects to `/login` when the cookie is missing or invalid |
| `/api/auth/*` | Route handlers | Set/clear the session cookie |
| `/api/proxy/[...path]` | Route handler | Authenticated reverse proxy |

### 9.2 Component graph

```
StudioClient (studio-types: SettingsProvider)
└── StudioShell
    ├── Sidebar (nav filtered by settings.sections)
    ├── Topbar (dataset selector, refresh, avatar)
    ├── <section by active view>
    │   ├── records-sections  → UploadSection | ExportSection
    │   ├── overview-section  → OverviewSection
    │   ├── cleaning-section  → CleaningSection + PreviewPanel
    │   ├── plot-studio-section → PlotStudioSection + PlotCard + RenderPlot
    │   ├── model-section     → ModelSection + ComparisonView
    │   └── settings-section  → SettingsSection
    ├── Assistant widget (floating)
    └── Toast / training progress
```

### 9.3 State ownership

`StudioShell` owns cross-section state: user, dataset list, active dataset,
profile, preview, analysis, experiments, cleaning options, plot specs and the
assistant conversation. Each section owns only its own form state. This keeps
"what dataset am I looking at?" in exactly one place.

`SettingsProvider` wraps everything and exposes `settings`, `catalog`,
`update(patch)` and `reset()`. Updates are applied optimistically and reconciled
with the server response.

### 9.4 `charts.tsx` — the SVG library

| Component | Used for |
|---|---|
| `BarChart` | Bars incl. horizontal, grouped, stacked |
| `LineChart` | Line/area, smooth curves, markers |
| `ScatterChart` | Scatter, bubble (third dimension as radius) |
| `Histogram` | Distribution bins |
| `Heatmap` | Correlation matrices, cross-tabs |
| `BoxPlot` | Five-number summaries with outliers |
| `PieChart` | Pie and donut |
| `Treemap` | Proportional area |
| `Funnel`, `ConfusionMatrix`, `GaugeRing`, `Sparkline` | Specialised |
| `ChartFrame`, `MetricBarList`, `StatTile`, `EmptyChart`, `Legend` | Layout helpers |

All are responsive via `viewBox`, produce value tooltips on hover, and derive
colours from six named palettes (`ocean`, `sunset`, `forest`, `violet`, `mono`,
`candy`).

### 9.5 `ui.tsx` — primitives

`PageTitle`, `Panel`, `Field`, `Toggle`, `Slider`, `ChipPicker`, `ParamField`,
`Segmented`, `Tabs`, `Accordion`, `DataTable`. `ParamField` renders a control
from a server-declared parameter spec, which is why new cleaning parameters need
no frontend code.

### 9.6 Styling

A single stylesheet, `app/globals.css`, organised into blocks: design tokens,
base elements, auth pages, marketing page, Studio shell, panels, tables, charts,
and per-section blocks. Layout relies on CSS grid (`kpi-row`, `chart-grid`,
`plot-workspace`, `two-column`) with breakpoints at 1100 px, 900 px and 720 px.

---

## 10. The six Studio sections

### 10.1 Upload & Connect

- **Drop zone** accepting CSV, TSV, XLSX, XLS, JSON, JSONL/NDJSON, Parquet,
  SQLite/DB.
- **Sample datasets** (sales, customers, churn) to explore immediately.
- **Database connectors**: enter a connection URL and query, preview the result,
  then import as a dataset. Disabled unless explicitly permitted server-side.

### 10.2 Overview

Layout, top to bottom:

1. **KPI row** — ROWS, COLUMNS, MISSING, DUPLICATES, MEMORY on one line (the
   selection and order are configurable in Settings).
2. **Data Snapshot** — first or last rows, column count tunable.
3. **Column Summary** — searchable, filterable by type, with min/max range and
   outlier counts.
4. **Data Quality Dashboard** — health gauge, five dimension cards, outlier
   ranking, and recommendation signals.
5. **Exploratory analysis** — five collapsible sections:

| Section | Contains |
|---|---|
| 🔍 Completeness | Missing share by column, cell donut, row completeness, column-gap distribution, affected-column table, NULL-highlighted preview |
| 🟨 Missing Heatmap | NULL grid (orderable by column/density), null-density ranking, top missing patterns, gap concentration |
| 📉 Outliers | Flagged counts, risk share, fence overview, tail box plot per column, at-risk table — with method and threshold controls |
| 🌡️ Correlation | Pearson/Spearman heatmap, strongest pairs, pair scatter, categorical association |
| 📈 Distributions | Histogram + selector, skew profile, five-number summary, category balance, share donut, statistics table |

### 10.3 Cleaning Studio

- KPI strip: rows, missing, duplicates, health, version count.
- **Operations tab** — 23 operations grouped by category:
  Text (trim, case/spacing normalisation, trim long text), Missing (drop, impute
  with 7 strategies, optional group-aware imputation), Duplicates (keep
  first/last), Types (numeric conversion with separators/currency),
  Date/Time (parsing), Outliers (IQR/z-score/quantile × remove/clip/null,
  value clipping), Transform (find & replace, regex extract, split, merge,
  scaling), Filter (8 operators), Structure (drop/rename columns, row id,
  remove empty/constant columns), Categorical (fuzzy standardisation with
  similarity threshold), Validation (schema limits).
- **Preview** shows affected rows, shape change, added/removed columns and a
  before/after table — without saving.
- **Recipe tab** — ordered, reorderable, enable/disable steps plus a custom step
  builder (filter, aggregate preview, read-only SQL) run as one transaction.
- **Tuned defaults** persist strategy, constant, keep-rule, thresholds.
- **Version history** with restore; undo and redo.

### 10.4 Plot Studio

- **Plots tab** — visual type picker (16 types), axis/series/size selectors,
  aggregation, sort, limits, bins and multiple filters. *Plot* renders instantly;
  *Add another plot* stacks unlimited plots; each card can be edited, rebuilt,
  pinned to the dashboard or removed.
- **Pivots tab** — multi row/column/value fields and several aggregations,
  producing totals plus a treemap and bar view.
- **Dashboard tab** — pinned widgets laid out in 1–4 columns.
- **Plot assistant** — natural language → suggested plot spec, always editable.

### 10.5 Model Studio

- **Training configuration**: task (classification, regression, clustering,
  anomaly, deep-learning variants), algorithm, target, features, CV folds, test
  size, seed, tuning toggle.
- **Dataset readiness**: rows/missing/numeric/categorical tiles, class balance,
  missingness by feature, feature correlation.
- **Leaderboard**: best score per algorithm, score timeline, runs per task, sortable table.
- **Auto-sweep**: trains several estimators with identical folds and seed.
- **Run detail** in five tabs: Overview, Performance, Errors, Explainability,
  Data & inference (with a JSON inference box calling the deployed model).
- **Compare**: metric-by-metric charts and a joined table for up to four runs.

### 10.6 Export Center

Data exports (CSV with formula-injection escaping, XLSX, JSON, Parquet), reports
(HTML, PDF, PowerPoint, JSON profile) and model artifacts with deploy/download.

### 10.7 Settings

| Tab | Controls |
|---|---|
| AI & Assistant | Provider grid (18), model grid (58), custom model name/base URL, temperature, max tokens, context sharing, sample rows, response style |
| Project | Theme, density, accent, language, date/number format, timezone, behaviour toggles, section visibility |
| Overview | KPI selection/order, snapshot sizes, bins, outlier method/threshold, correlation method, auto-expanded section |
| Cleaning | Imputation strategy, constant, duplicate keep, thresholds, version cap, auto-preview |
| Plots | Palette, default type/aggregation, limits, bins, dashboard columns, grid/legend/smoothing |
| Models | Default task/algorithm, CV folds, test size, seed, sweep candidates and algorithms |

Settings are validated and clamped server-side, so a bad value can never break
the pipeline.

---

## 11. Project settings model

Stored as JSON on the workspace (`workspaces.settings_json`).

```python
DEFAULT_PROJECT_SETTINGS = {
  "theme": "light", "density": "comfortable", "accent": "#0ea5e9",
  "auto_save": True, "confirm_destructive": True, "animate_charts": True,
  "sections": {"upload": True, "overview": True, "cleaning": True,
               "chat": True, "models": True, "export": True, "settings": True},
  "overview": { "kpi_row": ["rows","columns","missing","duplicates","memory"], … },
  "cleaning": { "default_strategy": "median", "outlier_threshold": 1.5, … },
  "plots":    { "palette": "ocean", "default_type": "bar", … },
  "models":   { "cv_folds": 5, "test_size": 0.2, "random_seed": 42, … },
  "ai":       { "provider": "auto", "model": "gpt-4o-mini", "temperature": 0.2, … },
}
```

Rules:
- `PATCH /api/settings` performs a **deep merge**; unknown keys are ignored.
- Types are coerced (string → number, string → list for `kpi_row`).
- Every numeric field is clamped to a safe range after merging.
- `POST /api/settings/reset` clears stored JSON and returns defaults.

---

## 12. AI providers and models

| Provider | Transport |
|---|---|
| OpenAI, OpenRouter, Groq, DeepSeek, Mistral, Together, Fireworks, Perplexity, xAI, Cerebras, Moonshot, NVIDIA, Ollama, Azure, custom | OpenAI-compatible `/chat/completions` |
| Anthropic | Messages API |
| Google Gemini | `generateContent` |
| Local | `finese-insight-v1` deterministic engine |

Selection: `provider: "auto"` picks the first configured key in order
(openai → anthropic → google → openrouter → groq → deepseek); with none configured it
falls back to the local engine and says so.

The catalogue is declarative (`ai_catalog.MODELS`) — adding a model is one tuple
`(provider, id, label, context, tier)`.

**What is sent:** the column profile (names, types, missing %, summary stats) and,
only if you enable it, eight sample rows. The system prompt instructs the model
to treat data values as untrusted and never to invent statistics.

---

## 13. Data model and storage

| Table | Key fields |
|---|---|
| `users` | `id`, `email` (unique), `password_hash`, `full_name` |
| `workspaces` | `id`, `owner_id`, `name`, `settings_json` |
| `datasets` | `id`, `owner_id`, `workspace_id`, `name`, `format`, `storage_path`, `row_count`, `column_count`, `columns_json`, `byte_size`, `checksum`, `is_deleted` |
| `dataset_versions` | `dataset_id`, `version`, `storage_path`, `action`, `details_json` |
| `experiments` | `id`, `owner_id`, `dataset_id`, `name`, `task_type`, `estimator`, `target_column`, `metrics_json`, `parameters_json`, `model_path`, `status` |
| `conversations` | `id`, `owner_id`, `dataset_id`, `title`, `messages_json` |
| `jobs` | `id`, `owner_id`, `status`, `progress`, `request_json`, `result_json`, `error` |

On disk:

```
data/storage/<user_id>/<dataset_id>/version_1.csv
data/storage/<user_id>/<dataset_id>/version_2.csv   ← never overwritten
backend/artifacts/<user_id>/<experiment_id>.joblib
```

---

## 14. Security model

- **Passwords**: hashed (never stored plainly); minimum length enforced.
- **Sessions**: signed, expiring tokens in an `HttpOnly`, `SameSite` cookie. The
  browser cannot read the token.
- **CSRF**: state-changing proxied requests require an allowed `Origin`.
- **Ownership**: every dataset, experiment, job and conversation query is scoped
  to `owner_id`; cross-user access returns 404.
- **Upload safety**: extension allow-list, size/row/column caps, header
  sanitisation.
- **Export safety**: CSV cells that start with `= + - @` are prefixed with `'` to
  prevent spreadsheet formula injection.
- **AI consent**: external calls happen only when `share_data_with_ai` is true.
- **Connectors**: remote database access is disabled by default and requires a
  server-side host allow-list. Credentials are never stored.

---

## 15. Statistic and algorithm reference

| Concept | Implementation |
|---|---|
| Inferred type | dtype, cardinality ratio, regex date match on a 50-row sample |
| Quality score | `0.65 × completeness + 0.35 × uniqueness` (×100) |
| Missing patterns | Sorted set of empty column names per row, top 8 |
| IQR outliers | Fence at `Q1 − 1.5·IQR` / `Q3 + 1.5·IQR` |
| Z-score outliers | `|x − μ| > t·σ` |
| Outlier removal modes | `remove` · `clip` · `null` |
| Pearson / Spearman | `pandas.corr(method=…)` |
| Cramér's V | `√(χ² / (n·min(r−1, c−1)))` on category crosstabs |
| Mixed association | Normalised mutual information between quantile bins and categories |
| Preprocessing | Median/mean/mode impute; standard or min-max scaling; one-hot encoding |
| Classification metrics | accuracy, macro precision/recall/F1, confusion matrix, ROC-AUC, average precision, calibration, per-class stats |
| Regression metrics | MAE, RMSE, R², residuals, predicted-vs-actual |
| Clustering / anomaly | silhouette / anomaly rate |
| Baselines | `DummyClassifier(most_frequent)`, `DummyRegressor(mean)` |
| Cross-validation | `StratifiedKFold` (classification) / `KFold`, shuffled |
| Tuning | `GridSearchCV` |
| Learning curve | `learning_curve` over 10–100% of training data |
| Composite ranking | classification `0.6·F1 + 0.4·accuracy`; regression `max(0, min(100, 100·R²))` |

**Available algorithms**
- Classification: logistic regression, random forest, extra trees, gradient
  boosting, k-NN, SVM.
- Regression: linear, ridge, random forest, extra trees, gradient boosting, k-NN, SVR.
- Clustering: k-means. Anomaly: isolation forest.
- Deep learning: tabular MLP (`torch_mlp`, optional dependency).

---

## 16. Design system and layout

### Colour semantics

| Colour | Meaning |
|---|---|
| Indigo `#6366f1` | Overview |
| Sky `#0ea5e9` | Upload, informational |
| Emerald `#10b981` | Cleaning, success |
| Amber `#f59e0b` | Plot Studio, warnings |
| Red `#ef4444` | Model Studio, errors |
| Violet `#8b5cf6` | Export, explainability |
| Slate `#64748b` | Settings, meta |

Panels use a subtle gradient (`white → colour at ~4%`) with a 2 px tinted
border, so each section is identifiable without reading a label.

### Layout rules

- Sidebar collapses to icons; below ~900 px it becomes an overlay drawer.
- KPIs always share one row, wrapping only under 1100 px / 640 px.
- Chart grids are 2–3 columns that collapse to one on narrow screens.
- Typography: Manrope for headings, DM Sans for body, DM Mono for numbers and
  codes, so figures align visually.

---

## 17. Testing

### Backend (`pytest`)

```bash
.venv/bin/python -m pytest backend/tests -q
```

`conftest.py` creates a temporary SQLite database and storage directory per run,
so tests never touch your data. The eight tests cover registration/login, profile
and cleaning round-trips, cross-user isolation, model artifact creation, chat
ownership and local mode, async job completion, the Anthropic consent gate, and
HTML/PDF/PowerPoint report generation.

### Frontend

```bash
cd frontend
node tests/contracts.test.cjs     # contract checks
npx tsc --noEmit                  # types
npx eslint . --ignore-pattern .next
npm run build                     # production build
```

Contract tests assert structural invariants: the homepage links, the six sidebar
areas (including the Plot Studio rename), the session cookie flags, the server
guard and the proxy origin check.

---

## 18. Common workflows

### Profile and clean a new dataset
1. **Upload** → drop a CSV (or pick a sample).
2. **Overview** → check the KPI row and quality dashboard; open Completeness and
   Missing Heatmap to find where the gaps are.
3. **Cleaning** → open an operation, tune its parameters, press **Preview**.
4. Happy with the before/after? Press **Apply**, or add it to a **Recipe** and run
   the whole sequence at once.
5. Not happy? **Undo** (or restore any earlier version).

### Build a chart and pin it
1. **Plot Studio → Plots**, choose a type from the icon grid.
2. Pick X, Y, optional split, aggregation and filters.
3. Press **Plot**; press **Add another plot** for a second view.
4. Press the grid icon on a card to pin it to **Dashboard**.

### Train and evaluate a model
1. **Model Studio**, choose task and algorithm.
2. Check **Dataset readiness** first — class balance and missingness.
3. **Train model** (watch the progress bar), or **Auto-sweep** to compare
   algorithms.
4. Open the run, review **Performance** and **Explainability** tabs.
5. **Deploy**, then use **Data & inference** to send a JSON row.

### Choose an AI model
1. **Settings → AI & Assistant**.
2. Select a provider (the badge shows whether its key is configured).
3. Select a model, set temperature and token limits.
4. Ask the floating assistant or the Plot Studio assistant.

---

## 19. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `503 The FINESE DATA compute service is unavailable` | The Python API is not running or `BACKEND_URL` is wrong. |
| Every request redirects to `/login` | Session cookie expired — sign in again. |
| Provider says *key missing* | Set the provider's env var and restart the API. |
| Upload rejected (413/422) | File exceeds row/column/size caps, or is empty. |
| `Unsupported format` | Extension not in the allow-list. |
| Cleaning leaves no rows | The operation would empty the dataset; it is refused and nothing is saved. |
| Training fails immediately | Check the target column, that features are selected, and that the target is present. |
| Charts empty | The chosen columns are incompatible (e.g. text measure with a `sum` aggregation). |
| Settings not taking effect | Reload; the UI applies optimistically and reconciles with the server. |
| Learning curve missing | Only available for supervised models. |

Logs: API → stdout (or `/tmp/finese-api.log` when started with `nohup`); Next.js
→ the terminal running `next dev/start`.

---

## 20. Scope, caveats and roadmap

### Honest limitations

- The quality score measures **completeness and uniqueness only**. Accuracy,
  consistency and timeliness are reported as `n/a` unless domain rules exist.
- Deep learning is a **tabular MLP** — no CNN/RNN/Transformer fine-tuning.
- Hyper-parameter tuning is `GridSearchCV`; Optuna is not wired in.
- "Deploy" registers a model and exposes an authenticated prediction endpoint; it
  does not provision public cloud inference.
- The AI assistant explains computed statistics; it does not execute generated
  Python or SQL on your data.
- The pivot engine covers count/sum/mean/median/min/max/nunique/std, not the full
  feature set of a commercial BI tool.
- No schema-migration framework, backups, email verification, password reset,
  OAuth/SSO, teams/roles, or billing.
- `JOB_EXECUTION_MODE=inline` is for development; use Celery + Redis for durable
  dispatch.

### Possible next steps

- Real connector support behind an allow-list with read-only credentials.
- SHAP-based explanations alongside the current importance charts.
- Scheduled/automatic retraining and drift monitoring.
- File-format breadth (Avro, Delta, compressed archives).

---

## 21. Glossary

| Term | Meaning |
|---|---|
| **Profile** | Dataset-level statistics and per-column summaries |
| **Analysis** | The Overview exploration bundle (missing, outliers, correlation, distributions) |
| **Version** | An immutable CSV snapshot written by a cleaning action |
| **Recipe** | An ordered list of cleaning steps applied as one transaction |
| **Plot spec** | A JSON description of a chart (type, axes, aggregation, filters) |
| **Pivot spec** | Rows, columns, values and aggregations for a cross-tabulation |
| **Experiment** | A registered training run with metrics and a saved artifact |
| **Sweep** | Training several estimators with identical settings and ranking them |
| **Diagnostics** | Chart-ready series computed at training time (ROC, calibration, residuals…) |
| **Leaderboard** | Experiments ranked by composite score |
| **Provider** | An AI vendor/endpoint (OpenAI, Anthropic, Ollama…) |
| **Local engine** | The deterministic, no-network answer mode of the assistant |
| **Project settings** | Per-workspace JSON of defaults, visibility and AI choice |

---

## License

See `LICENSE` in the repository root.
