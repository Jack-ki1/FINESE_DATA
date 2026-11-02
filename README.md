# FINESE DATA — Enterprise Analytics, Machine Learning & Intelligence Platform

FINESE DATA is a dual-tier data analytics, visualization, and machine learning platform. It couples a browser-first, privacy-by-default web application with a decoupled, high-performance Python FastAPI compute engine.

---

## Table of Contents

1. [Executive Summary & Core Philosophy](#1-executive-summary--core-philosophy)
2. [Operating Modes (Mode A, Mode B, Mode C)](#2-operating-modes)
3. [Complete Repository Structure](#3-complete-repository-structure)
4. [File-by-File Technical Directory](#4-file-by-file-technical-directory)
5. [Frontend Architecture (`frontend/`)](#5-frontend-architecture)
6. [API Gateway & Route Handlers (`frontend/app/api/`)](#6-api-gateway--route-handlers)
7. [Backend Compute Engine Architecture (`backend/`)](#7-backend-compute-engine-architecture)
8. [Data Engineering & In-Browser Engine (`frontend/lib/data.ts`)](#8-data-engineering--in-browser-engine)
9. [Machine Learning & MLOps Pipeline (`backend/app/services/ml_service.py`)](#9-machine-learning--mlops-pipeline)
10. [AI Analyst & Privacy Engine](#10-ai-analyst--privacy-engine)
11. [Uniform API Contracts & Error Standards](#11-uniform-api-contracts--error-standards)
12. [Cloud Data Model & Database Architecture](#12-cloud-data-model--database-architecture)
13. [Installation & Setup Guide](#13-installation--setup-guide)
14. [Testing & Quality Assurance](#14-testing--quality-assurance)
15. [Security, Privacy & Threat Mitigations](#15-security-privacy--threat-mitigations)
16. [Deployment & Infrastructure Considerations](#16-deployment--infrastructure-considerations)
17. [Roadmap & Migration Milestones](#17-roadmap--migration-milestones)

---

## 1. Executive Summary & Core Philosophy

FINESE DATA was conceived to solve the disconnect between modern web frontends, privacy requirements, and heavy analytical computation. The platform is engineered according to three foundational pillars:

1. **Honesty by Design**: Unsupported features, planned integrations, and roadmap items are explicitly documented and communicated rather than masked with fake loading animations or synthetic metrics.
2. **Privacy by Default**: In its default configuration, no raw dataset leaves the user's browser. Exploratory analysis, quality assessment, column profiling, transformations, and baseline insights execute locally in client memory.
3. **Decoupled Heavy Compute**: Heavy Python machine learning workflows (scikit-learn, XGBoost, pandas) run on dedicated, bounded compute infrastructure with asynchronous workers rather than straining serverless web functions.

---

## 2. Operating Modes

```
+---------------------------------------------------------------------------------------+
|                                     FINESE DATA                                       |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|  [Mode A: Browser-Local Starter]                                                      |
|   - Zero backend required; works entirely in the client browser.                      |
|   - Deterministic CSV parsing, data profiling, heuristic scoring.                     |
|   - 4 deterministic cleaning transforms, single-column frequency charting.            |
|   - Safe read-only SQL subset, deterministic local insight generator.                 |
|   - LocalStorage persistence; CSV and JSON export via browser Blobs.                  |
|                                                                                       |
|  [Mode B: Optional Cloud Layer]                                                       |
|   - Authenticated workspaces, projects, and metadata synchronization.                 |
|   - Private object storage with short-lived pre-signed upload URLs.                   |
|   - Row-Level Security (RLS) isolating team/workspace data.                          |
|   - Server-side email delivery and audit event logging.                               |
|                                                                                       |
|  [Mode C: Dedicated Python Compute Engine]                                            |
|   - Decoupled FastAPI service for bounded, CPU-intensive workloads.                   |
|   - Supervised classification and regression model training.                          |
|   - Leakage-safe preprocessing pipelines (imputation, scaling, one-hot encoding).     |
|   - Automatic baseline model benchmarking (DummyClassifier / DummyRegressor).         |
|   - Asynchronous background job worker with live polling and graceful cancellation.   |
|   - Deterministic model serialization and experiment tracking.                        |
|                                                                                       |
+---------------------------------------------------------------------------------------+
```

---

## 3. Complete Repository Structure

```text
FINESE_DATA/
├── README.md                      # Unified platform technical manual
├── agy.md                         # Senior engineer implementation & handover log
├── backend.md                     # Backend architectural specification & handover guide
├── backend/                       # Python FastAPI compute service (Mode C)
│   ├── Dockerfile                 # Container specification for compute backend
│   ├── README.md                  # Backend service reference
│   ├── requirements.txt           # Python package dependencies
│   ├── app/                       # Core FastAPI application package
│   │   ├── __init__.py            # Package initializer
│   │   ├── config.py              # Application settings, security constants, and caps
│   │   ├── database.py            # SQLAlchemy database connection and session management
│   │   ├── main.py                # FastAPI app initialization, CORS, and exception routing
│   │   ├── security.py            # Sanitization, formula injection guards, error envelopes
│   │   ├── api/                   # Modular API routers
│   │   │   ├── __init__.py        # Router aggregation
│   │   │   ├── ai.py              # POST /api/ai/insights
│   │   │   ├── contact.py         # POST /api/contact
│   │   │   ├── datasets.py        # CRUD, profile, clean, export for datasets
│   │   │   ├── jobs.py            # Submit, poll, and cancel background jobs
│   │   │   ├── ml.py              # Model training, catalog, and experiments
│   │   │   └── uploads.py         # Init, binary upload, and complete intent workflows
│   │   ├── models/                # SQLAlchemy ORM models
│   │   │   ├── __init__.py        # Model exports
│   │   │   └── schema.py          # 8 core relational database tables
│   │   ├── schemas/               # Pydantic request and response schemas
│   │   │   ├── __init__.py        # Schema exports
│   │   │   ├── ai.py              # AI request/response schemas
│   │   │   ├── common.py          # Uniform error envelopes and success generics
│   │   │   ├── contact.py         # Contact form validation with anti-spam honeypot
│   │   │   ├── datasets.py        # Dataset summary, profile, and cleaning schemas
│   │   │   ├── jobs.py            # Job submission, status, and cancellation schemas
│   │   │   ├── ml.py              # Machine learning training and evaluation schemas
│   │   │   └── uploads.py         # Upload initiation and finalization schemas
│   │   └── services/              # Business logic and domain computation
│   │       ├── __init__.py        # Service exports
│   │       ├── ai_service.py      # Consent-gated insight generator and AI proxy
│   │       ├── dataset_service.py # Safe file ingestion, profiling, and cleaning
│   │       ├── job_runner.py      # Non-blocking async compute job worker
│   │       └── ml_service.py      # Bounded scikit-learn ML training and evaluation
│   ├── artifacts/                 # Local directory for serialized model artifacts (.json, .joblib)
│   ├── data/                      # Persistent storage directory
│   │   ├── finese.db              # SQLite development database
│   │   └── storage/               # Isolated storage for validated dataset files
│   └── tests/                     # Pytest automated test suite (12 tests)
│       ├── __init__.py            # Test package initializer
│       ├── conftest.py            # Test database fixture and test client setup
│       ├── test_api_ai.py         # Tests for consent requirement and insight generation
│       ├── test_api_contact.py    # Tests for contact submission, honeypot, and validation
│       ├── test_api_datasets.py   # Tests for dataset upload, profiling, cleaning, export
│       ├── test_api_jobs.py       # Tests for async job submission, polling, and cancel
│       └── test_api_ml.py         # Tests for classification and regression pipelines
├── docs/                          # Architectural and security documentation
│   ├── architecture.md            # System boundaries, data flow, and runtime boundaries
│   ├── audit.md                   # Legacy Flask repository risk analysis
│   ├── deploy-vercel.md           # Deployment manual, limits, and Vercel terms
│   ├── design-reference.png       # Design reference for marketing page
│   ├── migration-map.md           # Route-by-route migration matrix from Flask to Next.js
│   ├── security.md                # Security checklist, CSV injection, and RLS requirements
│   └── verification-report.md     # Package audit and verification log
└── frontend/                      # Next.js 16 (App Router) + React 19 web application
    ├── README.md                  # Frontend web documentation
    ├── eslint.config.mjs          # ESLint configuration
    ├── next.config.ts             # Next.js configuration with security headers
    ├── package.json               # Frontend dependencies and npm scripts
    ├── tsconfig.json              # TypeScript compiler configuration
    ├── app/                       # Next.js App Router
    │   ├── globals.css            # Responsive styles, design system, theme tokens
    │   ├── layout.tsx             # Root layout with metadata and viewport settings
    │   ├── not-found.tsx          # 404 error page
    │   ├── page.tsx               # High-converting marketing landing page
    │   ├── robots.ts              # SEO crawling rules (disallows /studio)
    │   ├── sitemap.ts             # Dynamic sitemap generator
    │   ├── about/page.tsx         # Company & philosophy page
    │   ├── accessibility/page.tsx # Accessibility standards declaration
    │   ├── contact/page.tsx       # Contact page hosting the interactive form
    │   ├── platform/page.tsx      # Platform capabilities overview
    │   ├── privacy/page.tsx       # Data privacy and storage policy
    │   ├── resources/page.tsx     # Technical guides and educational library
    │   ├── services/page.tsx      # Consulting and analytical services
    │   ├── solutions/page.tsx     # Industry specific solution briefs
    │   ├── terms/page.tsx         # Terms of service and usage limitations
    │   ├── api/                   # Next.js Route Handlers (API Gateway)
    │   │   ├── ai/insights/route.ts       # POST /api/ai/insights
    │   │   ├── contact/route.ts           # POST /api/contact
    │   │   ├── datasets/[id]/route.ts     # GET & DELETE /api/datasets/:id
    │   │   ├── jobs/route.ts              # POST /api/jobs
    │   │   ├── jobs/[id]/route.ts         # GET /api/jobs/:id
    │   │   ├── jobs/[id]/cancel/route.ts  # POST /api/jobs/:id/cancel
    │   │   ├── uploads/complete/route.ts  # POST /api/uploads/complete
    │   │   └── uploads/init/route.ts      # POST /api/uploads/init
    │   └── studio/                # Interactive analytics studio
    │       ├── page.tsx           # Studio root (/studio -> overview)
    │       └── [tool]/page.tsx    # Dynamic tool route (/studio/[tool])
    ├── components/                # React UI components
    │   ├── contact-form.tsx       # Form component with validation and mailto fallback
    │   ├── landing.tsx            # Marketing components, SVG globe, and dashboard mockup
    │   └── studio.tsx             # Interactive Studio application shell and tools
    ├── lib/                       # Core utility and business logic libraries
    │   ├── api-client.ts          # Shared error envelope generator and URL resolver
    │   └── data.ts                # In-browser CSV parser, profiler, cleaner, and query engine
    └── tests/                     # Node.js built-in test runner suite (9 tests)
        ├── api.test.cjs           # Tests for API client and error envelope generation
        └── data.test.cjs          # Tests for CSV parser, formula defense, profiling, SQL subset
```

---

## 4. File-by-File Technical Directory

### Workspace Root
* **`README.md`**: Master documentation containing architecture, directory structure, component explanations, setup guides, API contracts, security mitigations, and verification results.
* **`backend.md`**: The technical architecture specification and handover manual defining operating modes, Vercel serverless limitations, database schemas, API contracts, ML worker lifecycle, and exit criteria.
* **`agy.md`**: Senior developer handover log detailing tasks executed, codebase modernization, architectural improvements, and test suite execution logs.

---

### Backend Service (`backend/`)

#### Configuration & Core Application
* **`backend/Dockerfile`**: Container build definition for production deployment using `python:3.12-slim`, pre-creating storage directories and launching Uvicorn.
* **`backend/README.md`**: Backend-specific developer instructions, running guidelines, and API endpoint catalogue.
* **`backend/requirements.txt`**: Pinned Python dependencies: `fastapi`, `uvicorn`, `pydantic`, `sqlalchemy`, `pandas`, `numpy`, `scikit-learn`, `httpx`, and `pytest`.
* **`backend/app/__init__.py`**: Python package initialization file marking `app` as a Python module.
* **`backend/app/config.py`**: Centralized configuration management using Pydantic Settings. Defines project name, environment, allowed CORS origins, database connection strings, file caps (10 MB, 50,000 rows, 150 columns), execution timeouts (300s), allowed estimator list, and external API keys.
* **`backend/app/database.py`**: Database connectivity using SQLAlchemy. Configures the engine (with `check_same_thread=False` for SQLite), defines the declarative base, exposes the `get_db` generator dependency, and provides `init_db()` for automatic schema generation.
* **`backend/app/main.py`**: The primary FastAPI application instance. Registers lifespan hooks, applies CORS middleware, mounts global error envelope handlers for `APIException` and unhandled exceptions, exposes `/api/health`, and mounts the modular API router under `/api`.
* **`backend/app/security.py`**: Security primitives including `APIException`, `sanitize_filename()` (path traversal and illegal character stripping), `escape_csv_cell()` (CSV formula injection prevention), and asynchronous JSON response exception handlers that output standard error envelopes.

#### API Routers (`backend/app/api/`)
* **`backend/app/api/__init__.py`**: Consolidates and exposes `api_router`, aggregating contact, AI, uploads, datasets, jobs, and ML routers.
* **`backend/app/api/contact.py`**: Route handler for `POST /api/contact`. Performs email format validation, enforces string length limits, evaluates the `website_url` anti-bot honeypot field, and routes inquiries.
* **`backend/app/api/ai.py`**: Route handler for `POST /api/ai/insights`. Gated by explicit user consent, invokes `AIService.generate_insight()` with database session injection.
* **`backend/app/api/uploads.py`**: Handlers for upload intent registration (`POST /api/uploads/init`), binary payload reception (`POST /api/uploads/file/{upload_id}`), upload finalization (`POST /api/uploads/complete`), and direct binary streaming ingestion (`POST /api/uploads/direct`).
* **`backend/app/api/datasets.py`**: Handlers for dataset listing (`GET /api/datasets`), single dataset retrieval (`GET /api/datasets/{id}`), profile calculation (`GET /api/datasets/{id}/profile`), deterministic cleaning (`POST /api/datasets/{id}/clean`), formula-injection-safe CSV export (`GET /api/datasets/{id}/export`), and soft deletion (`DELETE /api/datasets/{id}`).
* **`backend/app/api/jobs.py`**: Asynchronous compute job management. Handlers for submitting jobs (`POST /api/jobs`), checking status and safe results (`GET /api/jobs/{id}`), and cancelling active jobs (`POST /api/jobs/{id}/cancel`).
* **`backend/app/api/ml.py`**: Machine learning endpoints. Exposes allowed estimator metadata (`GET /api/ml/estimators`), executes supervised model training (`POST /api/ml/train`), and lists historical experiment runs (`GET /api/ml/experiments`).

#### Data Models (`backend/app/models/`)
* **`backend/app/models/__init__.py`**: Re-exports all SQLAlchemy database entities.
* **`backend/app/models/schema.py`**: Defines 8 relational tables:
  * `Workspace`: Multi-tenant boundary containing name and owner ID.
  * `Project`: Container for datasets and experiments within a workspace.
  * `Dataset`: Metadata record tracking storage path, row/column counts, columns JSON, checksum, and deletion status.
  * `DatasetVersion`: Tracks lineage and transformation log between dataset revisions.
  * `Job`: Execution record for async tasks tracking progress, parameters, status, results, and safe errors.
  * `Experiment`: MLOps tracking entity logging task type, estimator, target column, hyperparameters, random seed, and metrics.
  * `Artifact`: Record of serialized output models and evaluation reports.
  * `AuditEvent`: Security and activity logging without sensitive dataset values.

#### Schemas (`backend/app/schemas/`)
* **`backend/app/schemas/__init__.py`**: Re-exports all Pydantic request and response schemas.
* **`backend/app/schemas/common.py`**: Defines `ErrorDetail` and `ErrorResponse` (the universal error envelope) along with `SuccessEnvelope`.
* **`backend/app/schemas/contact.py`**: Defines `ContactRequest` (with regex email validation and honeypot field) and `ContactResponse`.
* **`backend/app/schemas/ai.py`**: Defines `AIInsightRequest` (with `user_consent` boolean and token limits) and `AIInsightResponse`.
* **`backend/app/schemas/uploads.py`**: Defines `UploadInitRequest`, `UploadInitResponse`, `UploadCompleteRequest`, and `UploadCompleteResponse`.
* **`backend/app/schemas/datasets.py`**: Defines `ColumnProfile`, `DatasetSummary`, `DatasetProfileResponse`, `DatasetCleanRequest`, and `DatasetCleanResponse`.
* **`backend/app/schemas/jobs.py`**: Defines `JobSubmitRequest`, `JobSubmitResponse`, `JobStatusResponse`, and `JobCancelResponse`.
* **`backend/app/schemas/ml.py`**: Defines `MLTrainRequest` (features, target, task type, estimator, test size, seed) and `MLTrainResponse` (metrics, baseline metrics, feature importances, artifact ID).

#### Business Logic Services (`backend/app/services/`)
* **`backend/app/services/__init__.py`**: Re-exports domain services.
* **`backend/app/services/dataset_service.py`**: File verification and saving with SHA-256 deduplication, safe DataFrame loading with row/column caps, heuristic profiling (types, missing, duplicates, quality score), deterministic cleaning transforms, and version logging.
* **`backend/app/services/ml_service.py`**: The bounded scikit-learn training pipeline. Implements leakage-safe preprocessing (ColumnTransformer with median imputation and scaling on numeric columns; constant imputation and one-hot encoding on categorical columns), deterministic train/test splits, estimator fitting, baseline model comparison (DummyClassifier/DummyRegressor), metric extraction, feature importance computation, and artifact serialization.
* **`backend/app/services/job_runner.py`**: Asynchronous background worker. Consumes jobs from database, updates execution progress, dispatches to `MLService` or `DatasetService`, checks for cancellation requests, and logs safe error envelopes.
* **`backend/app/services/ai_service.py`**: Manages insight generation. Validates explicit user consent, minimizes prompt context to schema and summaries, proxies to OpenAI when configured, and falls back to deterministic, mathematically grounded summaries with verified computational provenance.

#### Backend Tests (`backend/tests/`)
* **`backend/tests/__init__.py`**: Test package initializer.
* **`backend/tests/conftest.py`**: Pytest fixtures for creating and dropping an isolated SQLite test database and initializing the FastAPI `TestClient`.
* **`backend/tests/test_api_contact.py`**: Validates successful contact submissions, verifies that honeypot values trigger a 400 SPAM error, and tests email validation regex.
* **`backend/tests/test_api_datasets.py`**: Validates direct upload, deterministic profiling, quality score ranges, deduplication, missing cell handling, and formula injection escaping on export.
* **`backend/tests/test_api_jobs.py`**: Validates job creation, async background execution, status polling, and graceful job cancellation.
* **`backend/tests/test_api_ml.py`**: Validates end-to-end supervised classification and regression pipelines, leakage-free evaluation, and baseline model comparison.
* **`backend/tests/test_api_ai.py`**: Verifies that requests without user consent are rejected with 400, and verifies deterministic summary generation.

---

### Frontend Web Application (`frontend/`)

#### Configuration & Root Layout
* **`frontend/package.json`**: Pinned frontend dependencies: `next@16.1.0`, `react@19.2.0`, `react-dom@19.2.0`, and TypeScript testing setup.
* **`frontend/tsconfig.json`**: Strict TypeScript configuration with path alias `@/*` mapped to `frontend/*`.
* **`frontend/next.config.ts`**: Next.js App Router configuration. Disables `x-powered-by` header, enables React strict mode, and injects restrictive security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`).
* **`frontend/eslint.config.mjs`**: Next.js and React ESLint rules.
* **`frontend/app/globals.css`**: Complete responsive design system. Includes CSS variables, typography, custom SVG styling for the interactive globe, mockup dashboards, dark mode overrides (`.theme-dark`), and mobile layout rules.
* **`frontend/app/layout.tsx`**: Root HTML layout embedding metadata, OpenGraph tags, responsive viewport configuration, and theme colors.
* **`frontend/app/not-found.tsx`**: Accessible 404 page with navigation recovery.
* **`frontend/app/robots.ts`**: Generates `/robots.txt`, allowing public marketing routes and explicitly disallowing `/studio`.
* **`frontend/app/sitemap.ts`**: Generates `/sitemap.xml` dynamically for public routes based on the configured site origin.

#### Marketing & Information Pages (`frontend/app/`)
* **`frontend/app/page.tsx`**: Renders the complete, responsive landing page using `LandingPage` from `landing.tsx`.
* **`frontend/app/platform/page.tsx`**: Platform capabilities overview (Studio, profiling, visualization, SQL, ML).
* **`frontend/app/solutions/page.tsx`**: Industry applications across finance, healthcare, retail, and agriculture.
* **`frontend/app/services/page.tsx`**: Data engineering, machine learning consulting, and training offerings.
* **`frontend/app/resources/page.tsx`**: Technical guides on data cleaning, baseline modeling, and visualization.
* **`frontend/app/about/page.tsx`**: Company philosophy, principles of honest data, and background.
* **`frontend/app/contact/page.tsx`**: Customer inquiry page hosting the interactive `ContactForm` component.
* **`frontend/app/privacy/page.tsx`**: Data privacy statement detailing browser-local processing and storage.
* **`frontend/app/terms/page.tsx`**: Terms of service and usage limitations.
* **`frontend/app/accessibility/page.tsx`**: WCAG standards and keyboard accessibility statement.

#### API Route Handlers (`frontend/app/api/`)
* **`frontend/app/api/contact/route.ts`**: API Gateway handler for `/api/contact`. Checks anti-spam honeypot, validates input length, and proxies to backend service or falls back to local validation.
* **`frontend/app/api/ai/insights/route.ts`**: API Gateway handler for `/api/ai/insights`. Validates explicit consent and proxies to compute backend.
* **`frontend/app/api/uploads/init/route.ts`**: API Gateway handler for `/api/uploads/init`. Validates file size against the 10 MB limit before issuing upload intents.
* **`frontend/app/api/uploads/complete/route.ts`**: API Gateway handler for `/api/uploads/complete`. Finalizes upload intent with the compute backend.
* **`frontend/app/api/jobs/route.ts`**: API Gateway handler for submitting asynchronous compute jobs.
* **`frontend/app/api/jobs/[id]/route.ts`**: API Gateway handler for querying job status by ID.
* **`frontend/app/api/jobs/[id]/cancel/route.ts`**: API Gateway handler for requesting job cancellation.
* **`frontend/app/api/datasets/[id]/route.ts`**: API Gateway handler for fetching and deleting dataset records.

#### Interactive Studio (`frontend/app/studio/` & `frontend/components/`)
* **`frontend/app/studio/page.tsx`**: Entrypoint for `/studio`, loading `StudioClient` initialized to the `overview` tool.
* **`frontend/app/studio/[tool]/page.tsx`**: Dynamic tool route for `/studio/[tool]`, supporting `data`, `clean`, `charts`, `sql`, `assistant`, `ml`, `experiments`, `export`, `settings`, and `help`. Uses `generateStaticParams` for pre-rendering.
* **`frontend/components/landing.tsx`**: High-performance marketing shell containing `GlobeArtwork` (pure SVG/CSS neural globe), `DashboardMock` (mock workspace visual), navigation, footer, interactive tab explorer, and responsive layout wrappers.
* **`frontend/components/studio.tsx`**: Full client-side Studio application. Implements local dataset state, LocalStorage sync with quota handling, responsive sidebar, breadcrumbs, dark mode toggle, metric cards, dataset preview tables, profiling displays, frequency bar charts, safe SQL workbench, deterministic assistant chat, experiment notebook, and export center.
* **`frontend/components/contact-form.tsx`**: Client form component with validation, honeypot protection, status banners, and mailto draft compilation.

#### Libraries & Test Suites (`frontend/lib/` & `frontend/tests/`)
* **`frontend/lib/api-client.ts`**: Shared API helpers: `createErrorResponse()` for standard error envelopes and `getBackendUrl()` for dynamic backend host resolution.
* **`frontend/lib/data.ts`**: In-browser analytical engine. Contains `parseCSV()` (RFC 4180 parser), `profileDataset()` (types, missing, duplicates, heuristic quality score), `cleanDataset()` (trim, drop duplicates, drop missing, fill missing), `toCSV()` (with formula injection defense), `runSafeQuery()` (restricted read-only SQL subset), and `localInsight()` (deterministic calculated summaries).
* **`frontend/tests/api.test.cjs`**: Node.js automated tests verifying API envelope formatting and backend URL resolution.
* **`frontend/tests/data.test.cjs`**: Node.js automated tests verifying CSV parsing, quoting errors, profiling statistics, deterministic cleaning, SQL subset evaluation, query blocking, and CSV export formula escaping.

---

### Documentation (`docs/`)
* **`docs/architecture.md`**: Architectural boundaries separating `frontend/` and `backend/`, runtime data flow, and legacy isolation requirements.
* **`docs/audit.md`**: Detailed source inventory of the legacy Flask repository, recording architectural flaws (module-global states, unconstrained threads, exposed DuckDB).
* **`docs/deploy-vercel.md`**: Deployment manual for Vercel, detailing Function payload limits (4.5 MB), commercial restrictions on the Hobby tier, and environment variable requirements.
* **`docs/design-reference.png`**: Original design mockup reference image for visual layout alignment.
* **`docs/migration-map.md`**: Matrix mapping legacy Flask routes to Next.js routes and backend services.
* **`docs/security.md`**: Security checklists covering CSV injection, SQL boundaries, consent-gated AI, RLS policies, and safe model deserialization.
* **`docs/verification-report.md`**: Historic test verification results and environment notes.

---

## 5. Frontend Architecture

The frontend is an App Router application built on Next.js 16 and React 19:

* **Rendering Strategy**: Public marketing and documentation pages (`/`, `/platform`, `/solutions`, etc.) are pre-rendered at build time for performance and SEO. The interactive Studio (`/studio`) runs entirely on the client, maintaining state in browser memory and `localStorage`.
* **Design System**: Built with clean, unified vanilla CSS (`globals.css`) without heavyweight CSS-in-JS runtimes. All illustrations, icons, charts, and mockups use inline SVG and native CSS gradients.
* **State Management**: The Studio maintains local dataset state through React hooks, synchronized to `localStorage` under `finese.studio.dataset.v1`. Storage writes are wrapped in `try/catch` blocks to gracefully degrade in private browsing modes or when browser storage quotas are exceeded.

---

## 6. API Gateway & Route Handlers

The Next.js App Router route handlers in `frontend/app/api/` serve as an API Gateway and orchestration layer:

```
[Browser Client]
       │
       ▼
[Next.js API Gateway (frontend/app/api/*)]
       │
       ├─► Validates Request Schema & Rate Limits
       ├─► Checks Anti-Bot Honeypots & Input Lengths
       ├─► Verifies Explicit User Consent (for AI routes)
       │
       ▼
[Python Compute Engine (backend/app/api/*)]
       │
       ├─► High-Performance pandas / NumPy Processing
       ├─► Leakage-Safe scikit-learn ML Pipelines
       ├─► Asynchronous Background Job Execution
       └─► SQLite / PostgreSQL Metadata Persistence
```

Every route handler guarantees a consistent JSON response envelope:
```json
{
  "error": {
    "code": "ERROR_CODE_STRING",
    "message": "Descriptive error message",
    "requestId": "uuidv4-string"
  }
}
```

---

## 7. Backend Compute Engine Architecture

The backend compute engine is a FastAPI service designed for bounded, reproducible, and secure data processing:

* **Framework**: FastAPI with Pydantic v2 validation.
* **Concurrency**: Async endpoint routing combined with background task execution (`asyncio.create_task`) for non-blocking compute jobs.
* **Storage Engine**: Files are saved to an isolated storage directory (`backend/data/storage/`) with SHA-256 content hashing. Metadata is persisted via SQLAlchemy in SQLite (`backend/data/finese.db`) or PostgreSQL.
* **Resource Sandboxing**: Strict limits prevent resource exhaustion:
  * Maximum file size: **10 MB**
  * Maximum dataset dimensions: **50,000 rows × 150 columns**
  * Maximum execution time: **300 seconds**

---

## 8. Data Engineering & In-Browser Engine

The core analytical logic implemented in `frontend/lib/data.ts` and mirrored in `backend/app/services/dataset_service.py` provides deterministic data processing:

### CSV Parsing (`parseCSV`)
* Hand-crafted state machine handling RFC 4180 specifications.
* Manages escaped quotes (`""`), CRLF line endings, and Byte Order Marks (`\uFEFF`).
* Enforces strict validation: rejects unclosed quotes, ragged rows, empty files, or files exceeding row/column caps.

### Heuristic Profiling (`profileDataset`)
* Inspects every cell to compute total nulls, missing percentages, and exact duplicate rows.
* Infers column data types: `Number`, `Datetime`, `Date-like text`, `Categorical`, or `Text`.
* Computes numeric distribution summaries: count, mean, min, and max.
* Produces a transparent, documented quality score:
  $$\text{Quality Score} = \max\left(0, \text{round}\left(100 - 0.7 \times \%_{\text{missing}} - 0.3 \times \%_{\text{duplicates}}\right)\right)$$

### Deterministic Cleaning (`cleanDataset`)
* **Trim**: Strips leading and trailing whitespace from string columns.
* **Drop Duplicates**: Removes exact row matches while preserving original order.
* **Drop Missing**: Drops any row containing null or empty cells.
* **Fill Missing**: Substitutes missing cells with a user-specified string (defaults to `"Unknown"`).

### Safe SQL Subset Engine (`runSafeQuery`)
* Regex-parsed read-only query evaluator operating directly on in-memory tabular data.
* Permitted query patterns:
  * `SELECT * FROM dataset [LIMIT n]`
  * `SELECT col1, col2 FROM dataset [LIMIT n]`
  * `SELECT COUNT(*) FROM dataset`
  * `SELECT col, COUNT(*) AS count FROM dataset GROUP BY col [LIMIT n]`
* Blocks all write operations (`INSERT`, `UPDATE`, `DELETE`, `DROP`), multi-statement injection (`;`), and DuckDB extension loading (`httpfs`, `read_csv`, `copy`).

---

## 9. Machine Learning & MLOps Pipeline

The backend ML engine (`backend/app/services/ml_service.py`) adheres strictly to responsible machine learning principles:

### Leakage-Safe Preprocessing
To prevent data snooping and target leakage, preprocessing transformations are constructed using scikit-learn `Pipeline` and `ColumnTransformer` objects:
* **Numeric Features**: Imputed using median strategy, followed by `StandardScaler`.
* **Categorical Features**: Imputed using constant value `"missing"`, followed by `OneHotEncoder(handle_unknown="ignore")`.
* **Execution Boundary**: Preprocessors are fit **strictly on the training split** (`X_train`), and only transform the test split (`X_test`).

### Deterministic Splits & Estimator Training
* Splits are generated using `train_test_split` with a fixed seed (`random_seed=42`) and stratification where class balance permits.
* Supported estimators:
  * Classification: `LogisticRegression`, `RandomForestClassifier`, `GradientBoostingClassifier`
  * Regression: `LinearRegression`, `Ridge`, `RandomForestRegressor`, `GradientBoostingRegressor`

### Baseline Benchmark Comparison
Every trained model is automatically evaluated against a naive heuristic baseline on the exact same test split:
* **Classification**: `DummyClassifier(strategy="most_frequent")`
* **Regression**: `DummyRegressor(strategy="mean")`

The response includes both model metrics and baseline metrics, proving whether the model has genuine predictive power:
```json
{
  "metrics": {
    "accuracy": 0.875,
    "precision_macro": 0.88,
    "recall_macro": 0.875,
    "f1_macro": 0.874,
    "confusion_matrix": [[4, 1], [0, 5]]
  },
  "baseline_metrics": {
    "accuracy": 0.5,
    "f1_macro": 0.333
  }
}
```

---

## 10. AI Analyst & Privacy Engine

The AI Analyst is designed to assist data exploration without inventing numbers:

1. **Explicit Consent Gate**: The API rejects any request where `user_consent !== true` with HTTP 400 (`CONSENT_REQUIRED`).
2. **Context Minimization**: Never transmits full raw datasets. Only serialized schema names, row counts, missing percentages, and numeric summaries are included in prompts.
3. **Deterministic Grounding**: When no external AI provider key (`OPENAI_API_KEY`) is configured, the engine uses deterministic local calculation to answer questions about data quality, missing cells, column types, and distributions. Every insight includes `computation_verified: true` and provenance metadata.

---

## 11. Uniform API Contracts & Error Standards

### Success Envelope
Endpoints returning data wrap payloads predictably:
```json
{
  "data": { ... },
  "requestId": "b705dc79-e3d8-4f8e-9087-21a473f7a184"
}
```

### Error Envelope
All error responses adhere to the standard schema:
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "A prompt of at least 2 characters is required.",
    "requestId": "2588e367-a8a2-4a0e-b79e-4a6c6e7592cf",
    "details": null
  }
}
```

### Standard Error Codes
* `INVALID_INPUT` (400): Validation failure on request body or parameters.
* `CONSENT_REQUIRED` (400): Missing user consent on data-sharing operations.
* `FILE_TOO_LARGE` (400): File exceeds the 10 MB limit.
* `UNAUTHORIZED` (401): Missing or invalid authentication token.
* `FORBIDDEN` (403): Request exceeds workspace ownership scope.
* `DATASET_NOT_FOUND` / `JOB_NOT_FOUND` (404): Resource missing or deleted.
* `RATE_LIMITED` (429): Quota or rate limit exceeded.
* `BACKEND_UNAVAILABLE` (503): Frontend Gateway unable to connect to Python compute engine.
* `INTERNAL_SERVER_ERROR` (500): Safe fallback error hiding raw server traces.

---

## 12. Cloud Data Model & Database Architecture

The persistence model defined in `backend/app/models/schema.py` comprises 8 tables:

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Workspaces    │───┬──<│    Projects     │───┬──<│    Datasets     │
└─────────────────┘   │   └─────────────────┘   │   └─────────────────┘
                      │                         │            │
                      │                         │            ▼
                      │                         │   ┌─────────────────┐
                      │                         │   │ DatasetVersions │
                      │                         │   └─────────────────┘
                      │                         │
                      ▼                         ▼
             ┌─────────────────┐       ┌─────────────────┐
             │      Jobs       │       │   Experiments   │
             └─────────────────┘       └─────────────────┘
                      │                         │
                      ▼                         ▼
             ┌─────────────────┐       ┌─────────────────┐
             │    Artifacts    │       │   AuditEvents   │
             └─────────────────┘       └─────────────────┘
```

* **`workspaces`**: Tenancy boundary (`id`, `name`, `owner_id`, `created_at`, `updated_at`).
* **`projects`**: Project groupings (`id`, `workspace_id`, `title`, `description`, `is_deleted`).
* **`datasets`**: Ingested datasets (`id`, `workspace_id`, `name`, `storage_path`, `byte_size`, `row_count`, `column_count`, `columns_json`, `checksum`, `is_deleted`).
* **`dataset_versions`**: Lineage and transformation history (`id`, `dataset_id`, `version_number`, `storage_path`, `transformation_log`).
* **`jobs`**: Asynchronous tasks (`id`, `workspace_id`, `job_type`, `status`, `progress`, `parameters_json`, `results_json`, `error_summary`, `started_at`, `completed_at`).
* **`experiments`**: MLOps tracking (`id`, `workspace_id`, `dataset_id`, `name`, `task_type`, `estimator`, `target_column`, `parameters_json`, `metrics_json`, `random_seed`).
* **`artifacts`**: Stored models and outputs (`id`, `job_id`, `name`, `storage_path`, `format`, `byte_size`, `checksum`).
* **`audit_events`**: Immutable audit logs (`id`, `actor_id`, `action`, `resource_type`, `resource_id`, `metadata_json`).

---

## 13. Installation & Setup Guide

### Prerequisites
* **Node.js**: v20.9.0 or higher
* **Python**: v3.11, v3.12, or v3.14
* **Git** and standard build tools

### 1. Backend Setup
```bash
# Clone and enter the repository
cd FINESE_DATA

# Create and activate Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Run backend test suite (12 tests)
PYTHONPATH=. pytest backend/tests/ -v

# Start the FastAPI server
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API is now running on `http://localhost:8000`. Interactive documentation is available at `http://localhost:8000/api/docs`.

### 2. Frontend Setup
```bash
# In a new terminal, navigate to frontend directory
cd frontend

# Copy environment variables template
cp .env.example .env.local

# Run frontend test suite (9 tests)
npm test

# Start Next.js development server
npm run dev
```
The frontend application is now running on `http://localhost:3000`. Access the Studio at `http://localhost:3000/studio`.

---

## 14. Testing & Quality Assurance

The codebase includes automated tests across both frontend and backend suites:

```bash
# Run all frontend tests
cd frontend && npm test

# Run all backend tests
cd .. && PYTHONPATH=. pytest backend/tests/ -v
```

### Complete Test Catalog (21 Tests Passing)

#### Frontend Test Suite (`frontend/tests/`)
1. **API Envelope Formatting**: Verifies `createErrorResponse` generates compliant JSON error envelopes with unique UUIDs.
2. **Backend URL Resolution**: Verifies `getBackendUrl` resolves environment variables and falls back to localhost.
3. **CSV Parsing with Quotes & CRLF**: Tests unquoted values, quoted commas, carriage returns, BOM stripping, and empty cells.
4. **CSV Quoting Rejection**: Verifies that unclosed quotes, missing data rows, and ragged columns throw descriptive errors.
5. **Heuristic Profiling**: Verifies calculation of missing cell counts, duplicate row counts, column means, and quality scores.
6. **Deterministic Cleaning Operations**: Verifies that `trim`, `drop-duplicates`, `drop-missing`, and `fill-missing` produce predictable outputs.
7. **Safe SQL Query Helper**: Tests `SELECT *`, `COUNT(*)`, and grouped aggregations over in-memory datasets.
8. **Adversarial SQL Blocking**: Verifies rejection of writes, subqueries, multi-statement injection (`;`), and file/network loading (`read_csv`, `httpfs`).
9. **CSV Formula Injection Prevention**: Validates that exported CSV cells starting with `=`, `+`, `-`, or `@` are safely prefixed with a single quote.

#### Backend Test Suite (`backend/tests/`)
10. **Contact Submission Valid**: Verifies successful contact submission.
11. **Contact Honeypot Spam Defense**: Verifies that bot submissions filling the hidden honeypot field are rejected with 400 `SPAM_DETECTED`.
12. **Contact Email Validation**: Verifies that malformed email addresses are rejected.
13. **Direct File Ingestion & Profiling**: Tests binary CSV streaming, dimension calculation, and profile metric generation.
14. **Dataset Cleaning & Lineage**: Verifies server-side trimming, deduplication, row dropping, and version recording.
15. **Server-Side Formula Defense**: Confirms exported CSV files escape dangerous leading spreadsheet characters.
16. **Supervised Classification Pipeline**: Trains a Random Forest Classifier with leakage-safe preprocessors and baseline comparison.
17. **Supervised Regression Pipeline**: Trains a Linear Regressor on numeric data, verifying $R^2 > 0.8$ and baseline MSE calculation.
18. **Async Job Submission & Polling**: Tests background worker task execution, progress updates, and safe result retrieval.
19. **Graceful Job Cancellation**: Confirms active jobs can be transitioned to `cancelled` status on demand.
20. **AI Consent Enforcement**: Verifies that insight requests without `user_consent: true` are rejected with HTTP 400.
21. **Deterministic Grounded Insights**: Verifies local calculated summary generation with computational provenance.

---

## 15. Security, Privacy & Threat Mitigations

| Threat Vector | Mitigation Strategy | Implemented In |
|---|---|---|
| **CSV Formula Injection (DDE)** | Values starting with `=`, `+`, `-`, `@`, or `\t` are prefixed with `'` on export, preventing malicious formula execution in spreadsheet software. | `frontend/lib/data.ts`<br>`backend/app/security.py` |
| **SQL Injection** | SQL input is evaluated using a strict whitelist regex parser. Writes, file system commands, and network extensions are blocked. | `frontend/lib/data.ts` |
| **Data Leakage in ML** | Train/test splits occur before any transformation. Imputers, scalers, and encoders are fit **strictly** on the training set. | `backend/app/services/ml_service.py` |
| **Unbounded Serverless Payloads** | Strict 10 MB caps on file uploads prevent serverless memory exhaustion and payload limits. | `frontend/app/api/uploads/init/route.ts`<br>`backend/app/config.py` |
| **Spam & Automated Abuse** | Hidden honeypot fields silently detect and reject bot submissions on contact endpoints. | `frontend/app/api/contact/route.ts`<br>`backend/app/api/contact.py` |
| **Silent Data Exfiltration** | AI endpoints require explicit user opt-in (`user_consent: true`). Prompts receive minimized schemas rather than raw row data. | `frontend/app/api/ai/insights/route.ts`<br>`backend/app/services/ai_service.py` |
| **Path Traversal Attacks** | Uploaded filenames are sanitized by stripping directory traversal sequences (`..`), slashes, and illegal characters. | `backend/app/security.py` |
| **Browser Storage Eviction** | LocalStorage access is wrapped in `try/catch` to gracefully fall back to in-memory state when quotas are exceeded. | `frontend/components/studio.tsx` |

---

## 16. Deployment & Infrastructure Considerations

### Vercel Deployment Notes
* **Hobby Tier Terms**: Vercel's official terms currently restrict the Hobby plan to personal, non-commercial use. Commercial FINESE DATA deployments should use Vercel Pro or an alternative host.
* **Payload Limits**: Vercel Serverless Functions enforce a documented **4.5 MB request/response payload limit**. Full customer datasets should not be proxied through Function bodies; use browser-local mode or direct-to-S3 uploads via pre-signed URLs.
* **Root Directory**: When deploying `frontend/` on Vercel, set the Project Root Directory to `frontend`.

### Compute Engine Deployment (Docker)
The backend compute engine can be containerized using the included `backend/Dockerfile`:
```bash
# Build the backend image
docker build -t finese-backend -f backend/Dockerfile backend/

# Run container on port 8000 with volume mounts
docker run -d -p 8000:8000 \
  -v $(pwd)/backend/data:/app/data \
  -v $(pwd)/backend/artifacts:/app/artifacts \
  --name finese-compute finese-backend
```

---

## 17. Roadmap & Migration Milestones

1. **Milestone 1 (Complete)**: Browser-local Studio starter, Next.js marketing experience, and comprehensive backend architecture handover (`backend.md`).
2. **Milestone 2 (Complete)**: Decoupled project reorganization (`frontend/`, `backend/`), complete FastAPI compute engine implementation, Next.js API Gateway route handlers, and test suites (21 tests).
3. **Milestone 3 (Next)**: DuckDB-WASM integration in a dedicated Web Worker to provide full SQL support (joins, window functions, parquet ingestion) entirely in the browser.
4. **Milestone 4 (Future)**: Managed Supabase / PostgreSQL cloud persistence with Row-Level Security (RLS) policies and pre-signed AWS S3 direct file uploads.
5. **Milestone 5 (Future)**: Distributed task queue (Celery + Redis) for scaling heavy Python ML jobs across worker clusters.

---

## License & Credits

* **Architecture & Development**: Engineered for FINESE DATA (`Jack-ki1/FINESE_2`).
* **Visual Direction**: Built from the custom design specifications in `docs/design-reference.png`.
