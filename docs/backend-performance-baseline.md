# Backend performance baseline

Template for before/after measurements. **Do not treat placeholder rows as real data** — fill after running k6 or staging probes.

Environment labels: `local` | `staging` | `production-TBD`

## How to measure

| Signal | Method |
|--------|--------|
| HTTP latency | k6 `http_req_duration` or Prometheus `jobbie_http_request_duration_seconds` |
| Response bytes | k6 `http_req_receiving` + content-length; or `curl -w '%{size_download}'` |
| Supabase round-trips | Sample via debug (count `.from(` / `.rpc(` per request) — no PII in logs |
| Redis | `INFO stats` keyspace hits; app metrics `jobbie_profile_auth_cache_*` |
| Queue | `LLEN bull:background:wait`; `jobbie_bull_queue_waiting` |
| Heap / event loop | `node --expose-gc` / APM; soak with `k6/performance-baseline.js` |

Scripts:

- [`k6/backend-smoke.js`](../k6/backend-smoke.js) — 1 VU smoke
- [`k6/performance-baseline.js`](../k6/performance-baseline.js) — representative flows
- [`backend-ts/scripts/k6/smoke.js`](../backend-ts/scripts/k6/smoke.js) — minimal API smoke

Prometheus: `GET /metrics` (see [observability-runbook.md](./observability-runbook.md)).

## Endpoint matrix (fill after run)

| Flow | Method | p50 | p95 | p99 | bytes | Supabase calls | Notes | Env |
|------|--------|-----|-----|-----|-------|----------------|-------|-----|
| Health | GET /health | TBD | TBD | TBD | TBD | 0 | | |
| Jobs list (anon) | GET /api/jobs | TBD | TBD | TBD | TBD | TBD | | |
| Jobs list (auth) | GET /api/jobs | TBD | TBD | TBD | TBD | TBD | | |
| Search | GET /api/search/jobs | TBD | TBD | TBD | TBD | TBD | | |
| Recommended | GET /api/jobs/recommended | TBD | TBD | TBD | TBD | TBD | | |
| Applicants (10) | GET /api/employer/.../applicants | TBD | TBD | TBD | TBD | TBD | seeded job | |
| Applicants (100) | same | TBD | TBD | TBD | TBD | TBD | | |
| Applicants (1000) | same | TBD | TBD | TBD | TBD | TBD | | |
| Chat rooms (1) | GET /api/chat/rooms | TBD | TBD | TBD | TBD | TBD | | |
| Chat rooms (100) | same | TBD | TBD | TBD | TBD | TBD | | |
| Chat messages | GET /api/chat/rooms/:id/messages | TBD | TBD | TBD | TBD | TBD | | |
| Auth overhead | GET /api/auth/me | TBD | TBD | TBD | TBD | TBD | isolate JWT | |
| Storage finalize | POST /api/storage/uploads/finalize | TBD | TBD | TBD | TBD | TBD | image | |
| Stripe webhook | POST /api/payments/webhook | TBD | TBD | TBD | TBD | TBD | fixture replay | |
| CV database | GET /api/employer/cv-database | TBD | TBD | TBD | TBD | TBD | | |

## Load scenarios

| Scenario | Script | VUs / duration | Purpose |
|----------|--------|----------------|---------|
| Smoke | `k6/backend-smoke.js` | 1 × 2m | CPU watch |
| Baseline flows | `k6/performance-baseline.js` | staged | p95 per flow |
| Sustained | `k6/backend-sustained.js` | 50→100 | throttle-aware |
| Soak | `k6/performance-soak.js` | 10 × 2h | heap / leaks |
| Typesense down | baseline + `TYPESENSE_HOST=` empty | 5 | PG fallback |
| Alert worker | enqueue `job-email-alerts` only | 1 | queue drain |

## After implementation

Copy this table to [backend-performance-implementation-summary.md](./backend-performance-implementation-summary.md) with **baseline** vs **after** columns.
