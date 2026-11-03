# Security notes and release checklist

This is a security-oriented implementation checklist, not a penetration-test report or a claim of production certification.

## Assets and trust boundaries

- Uploaded files and every field value are untrusted. The starter caps CSV size/rows/columns and renders values through React text nodes; continue validating headers, malformed encodings and exports.
- Browser-only operations do not make the browser immune to malicious files or memory exhaustion. Keep explicit file limits and handle parser failure without crashing the whole page.
- The current SQL feature is a restricted SELECT subset with explicit limitations. It is not an acceptable security boundary for exposing arbitrary SQL to a server, nor does it provide full DuckDB semantics.
- Browser-local Studio analysis does not call an external LLM. The separate FastAPI AI endpoint can call OpenAI when configured; it requires consent and sends the prompt plus a minimized profile, not raw rows. Keep this distinction clear in the UI and privacy notice.
- Local storage may contain customer data if users choose to import it. Provide an obvious clear-data control and warn that browser storage can be evicted or inspected by users with access to the device.

## Before enabling cloud accounts or uploads

- Authenticated ownership checks on every project, dataset, job and artifact API.
- Row Level Security tests that explicitly attempt cross-user read/write.
- Private storage buckets, short-lived signed URLs, content-length/type checks, lifecycle expiration and deletion workflow.
- Server-side request validation and consistent safe error envelopes; never return raw stack traces.
- CSRF protections for cookie-authenticated state changes, appropriate CORS and restrictive Content Security Policy.
- Shared rate limiting and usage quotas; in-memory counters are not enough for serverless concurrency.
- No API keys, service-role credentials, prompts containing sensitive data or raw rows in browser bundles/logs.
- Contact delivery, AI proxy, job submission and upload-init endpoints need abuse prevention and audit events without sensitive contents.

## Before enabling the AI proxy

- Display provider and data-sharing disclosure at the point of use.
- User opt-in, prompt/data minimization, input size caps, token budgets, per-user quotas and spend limits.
- Server-only API keys; do not persist BYOK keys in plaintext sessions.
- Validate proposed SQL/tool calls before deterministic execution; ground numeric statements in executed computations.
- Define provider retention, training policy, processing region and user deletion semantics.

## Before enabling Python ML workers

- Durable queue, authenticated job ownership, concurrency/resource budgets, cancellation/retries/timeouts and artifact expiration.
- Fixed train/test split and seed; fit preprocessing only on training splits; leakage and metric tests.
- No unrestricted `N_JOBS=-1` on user-controlled workloads. Cap rows, features, wall time and memory.
- Do not load uploaded pickle/joblib models from untrusted users.

## Release security checklist

- [ ] Dependency audit and secret scan pass.
- [ ] CSV formula-injection regression tests pass.
- [ ] Oversized and malformed file tests pass.
- [ ] Adversarial SQL and multi-statement tests pass.
- [ ] Cross-user access tests pass for every cloud resource.
- [ ] Retention and deletion behavior is tested.
- [ ] Accessibility and security headers reviewed in deployed preview.
- [ ] Public privacy/terms copy matches actual integrations and has owner/legal review.
