# Backend performance implementation summary

Implementation of the 25-phase backend performance program (June 2026). Baseline numbers are recorded in [backend-performance-baseline.md](./backend-performance-baseline.md) after k6 runs — do not copy guessed latencies here.

## Delivered

| Phase | Status | Notes |
|-------|--------|-------|
| 1 Baseline | Doc + k6 scripts | `k6/performance-baseline.js`, `k6/performance-soak.js` |
| 2 Applicants RPC | Done | `employer_list_application_rows`; enrich scan capped at 500 for complex sort/filter |
| 3–4 Auth cache | Done | Redis + memory; guard mismatch → 401; invalidate on account delete |
| 6–7 Slim jobs | Done | Card/feed/search selects; list `description` omitted from SQL |
| 8–11 Queues | Done | Shared queue module; batched alerts; digest/reengagement via Bull |
| 12–13 External | Done | `HTTP_TIMEOUT_MS`; MailerLite/RPO `fetchWithTimeout`; deferred webhook notify |
| 14 Storage async | Done | `STORAGE_ASYNC_FINALIZE`; Bull `storage-finalize`; PWA poll |
| 15–18 Cache/search | Done | Feed cache env + evictions metric; catalog single-flight; parallel reindex chunk |
| 19–22 Infra | Done | Chat keyset `cursor`; server timeouts; CV DB cap metric |
| 23–25 Ops | Done | Prometheus histograms/counters; Dockerfile; CI build+test; unit specs |

## Key env vars

See `backend-ts/.env.example` (`BULL_WORKER_CONCURRENCY`, `JOB_ALERT_*`, `PROFILE_AUTH_CACHE_*`, `FEED_CACHE_*`, `STORAGE_ASYNC_FINALIZE`, `REQUIRE_REDIS_IN_PRODUCTION`).

## Verification

```bash
cd backend-ts
npm ci
npm test
npm run build

# Apply migrations (in order):
# 20260627120000_perf_applicant_counts_chat_unread.sql
# 20260628120000_employer_applicants_list_rpc.sql
# 20260628130000_storage_async_finalize.sql
# 20260628140000_chat_messages_keyset_index.sql

curl -s -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:8000/metrics | rg jobbie_
```

## Metrics (low cardinality)

- `jobbie_profile_auth_cache_*`
- `jobbie_applicant_list_duration_seconds{source}`
- `jobbie_bull_job_duration_seconds{job_name}`
- `jobbie_stripe_webhook_duration_seconds{event_type}`
- `jobbie_feed_cache_evictions_total`
- `jobbie_cv_db_shell_scan_capped_total`
- `jobbie_outbound_fetch_*`

## Remaining / follow-up

- Run k6 on staging and fill baseline “after” columns.
- Admin suspend hooks when admin API lives in this repo (invalidate `ProfileAuthCacheService`).
- Production: separate Bull worker process when `REDIS_URL` is set (see [deployment.md](./deployment.md)).
