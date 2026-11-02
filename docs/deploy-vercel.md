# Deployment guide — marketing site and Studio starter

## Prerequisites

- Node.js supported by the pinned Next.js version (the current Next.js installation guide lists 20.9 as a minimum).
- A network-enabled environment to install packages and generate `package-lock.json`.
- A Vercel account or another compatible Next.js host. Before choosing Vercel Hobby, verify whether the actual FINESE DATA use qualifies as personal/non-commercial. The official current Hobby terms restrict the plan to personal, non-commercial use; commercial deployment needs a compliant plan or alternative.

## Local setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The public home page is `/`; the Studio starts at `/studio`. The workspace imports CSV files locally, within the caps displayed in the UI.

## Production checks

```bash
npm run typecheck
npm run lint
npm run build
npm start
```

These checks have not yet been executed in the artifact-generation environment because package-registry requests timed out. Generate and commit a real lockfile in a network-enabled environment before deploying; do not use `npm install` without preserving the resolved versions for production builds.

## Vercel project settings

1. Create a project from the repository.
2. Set the Root Directory to `frontend`.
3. Use the Node.js version supported by the pinned Next.js release.
4. Set `NEXT_PUBLIC_SITE_URL` to the real origin. Until changed, sitemap generation uses a `.example` placeholder.
5. Optionally set `NEXT_PUBLIC_CONTACT_EMAIL` to a real public inbox. The contact form creates a `mailto:` draft; it does not deliver email from a server.
6. Avoid adding data-upload or heavy compute function endpoints until size, duration, auth, storage and abuse limits are reviewed.
7. Confirm each external provider's current quotas, billing terms, use restrictions, retention and region before enabling it.

## Important limitations

- Browser storage is not a backup; export data you need to keep.
- No cloud auth, shared projects, server-side email, AI-provider proxy, external Python worker or full DuckDB-WASM SQL engine is connected.
- The current SQL panel is a safe-intent teaching subset, not a replacement for a purpose-built SQL engine. Do not treat UI filtering as a sufficient security boundary.
- The ML panel does not train a model and displays no invented scores.
- Never store customer datasets in `public/`, `static/` or a serverless local filesystem. Use private object storage and signed URLs only after designing access and deletion controls.
- Function payload and runtime limits can change. Current official docs state a 4.5 MB Function request/response payload limit; avoid proxying complete datasets through API routes.
