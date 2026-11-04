# Security posture and deployment checklist

The code includes useful baseline controls, but this ZIP is not a penetration-tested or compliance-certified product. Complete the following before handling sensitive or regulated datasets.

## Included controls

- PBKDF2-HMAC-SHA256 password hashing with per-user random salts.
- HMAC-signed, expiring session tokens.
- HttpOnly, SameSite=Lax cookies; Secure cookies in production.
- Server-side Studio route guard and authenticated same-origin API proxy.
- Origin checks for state-changing requests through the browser proxy.
- Ownership checks in dataset, job, conversation, experiment and model API operations.
- Private user-scoped local file paths; uploaded file size, extension, row and column limits.
- CSV formula-injection mitigation on data export.
- AI provider sharing disabled unless explicitly enabled in Chat Studio; sample-row sharing is separately opt-in.
- Remote DB connectors disabled by default; exact server-side host allowlist required when enabled.
- Production startup refuses the development JWT secret and requires Celery job mode.

## Required before public production

- Use long random `SECRET_KEY` and strong database passwords; keep them only in deployment secrets.
- Configure HTTPS end-to-end and set `NEXT_PUBLIC_APP_URL` / `FRONTEND_ORIGINS` to the actual origin.
- Add rate limiting and abuse monitoring for registration, login, upload, AI and model-training endpoints.
- Add email verification, password reset, MFA/SSO and session revocation.
- Add Alembic migrations, automated database backups, storage backups and restore drills.
- Use managed object storage with private buckets, signed URLs, encryption, lifecycle expiry and deletion workflows for multi-instance deployments.
- Ensure Postgres users and remote source DB accounts follow least privilege. Connector users must be SELECT-only. Keep egress restricted; allowlisting a hostname is not a substitute for network policy.
- Add job quotas, CPU/RAM/time budgets, worker autoscaling, retry strategy, cancellation guarantees and artifact retention.
- Add audit events, structured redacted logs, alerting, dependency scanning, secret scanning and a penetration test.
- Review AI provider data processing, retention and regional settings. Never include secrets or full raw datasets in prompts by default.
- Review privacy notice, terms, retention and deletion behavior with appropriate counsel for the deployment jurisdiction.

## Known limitations

- This version has no email verification/password reset, MFA, OAuth/SSO, teams or role-based permissions.
- The local filesystem backend is not suitable for a horizontally scaled API without shared object storage.
- SQLAlchemy `create_all` initializes missing tables; an Alembic migration history is not yet included.
- `JOB_EXECUTION_MODE=inline` is only for local development. Production config requires Celery mode.
- The database connector checks query shape and hostname allowlist, but actual read-only permissions must be enforced by the source database account and network policy.
- `joblib` and pickle-based artifacts must be treated as trusted internal files. Never load user-supplied serialized Python model files.
- Accuracy and validity cannot be computed from structural missingness alone. The UI leaves these dimensions unassessed.
