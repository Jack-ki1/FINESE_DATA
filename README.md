# FINESE DATA — Browser-local data studio

FINESE DATA is a privacy-first, browser-local analytics starter. Import a CSV,
profile its columns, apply safe cleaning transformations, build a frequency
chart, and export — all in your browser. Nothing is uploaded to a server.

## What ships

**FINESE Studio** (`/studio`) is a client-only data workspace:

- **Import**: CSV files (up to 10 MB, 50,000 rows, 150 columns) parsed in the browser.
- **Profile**: column types, missing values, duplicates, numeric summaries and a transparent quality score.
- **Clean**: trim whitespace, remove duplicate rows, handle missing cells.
- **Charts**: bar-frequency view of any column.
- **Query**: a restricted, read-only SQL SELECT subset over the in-memory dataset.
- **Insights**: deterministic local summaries (no AI provider, no data leaves the device).
- **Export**: CSV download and a JSON data-quality report.

Your dataset lives in browser memory and localStorage on this device. It is not
uploaded, and FINESE Studio makes no network requests when you import or analyze
a file. You can verify this in the browser Network tab.

## What does not ship (intentionally)

- Accounts, cloud persistence, shared workspaces or object storage.
- Supervised model training or a Python compute engine.
- Generative AI or an external "AI analyst".
- Excel, Parquet or JSON import.

The FastAPI compute engine that once lived in `backend/` has been archived out of
this repository. It is not connected to any UI and is not part of the shipped
product. Revisit it only when a paying user asks for shared compute.

## Run it

```bash
cd frontend
npm ci
npm run dev        # http://localhost:3000, Studio at /studio
npm run lint
npm run typecheck
npm test
npm run build
```

The backend (optional, not wired to the UI):

```bash
cd ..
PYTHONPATH=. pip install -r backend/requirements.txt
PYTHONPATH=. python3 -m uvicorn backend.app.main:app --port 8000
```

## Privacy

Data stays on your device. No account or AI key is required. Browser localStorage
is not a backup — export important work.

## License

See the repository.
