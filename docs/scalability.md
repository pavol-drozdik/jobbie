# Scalability & scale-readiness

Companion to [`.cursor/rules/scalability.mdc`](../.cursor/rules/scalability.mdc). Use this for architecture decisions and PR review.

## Environment (production)

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | Feed engagement cache, BullMQ `background` queue, Socket.IO adapter |
| `NUXT_PUBLIC_CDN_URL` | Hashed `_nuxt` static assets |
| `NUXT_PUBLIC_MEDIA_CDN_URL` | Optional transform/CDN prefix for public Supabase images |
| `TYPESENSE_HOST` + `TYPESENSE_API_KEY` | Job search and alert matching |
| Supabase pooler (port **6543**) | Server-side Postgres connections |
| `SUPABASE_READ_URL` | Optional read replica for search hydration |

See [DEPLOYMENT.md](../DEPLOYMENT.md) for hosting and horizontal scaling.

## Patterns

### List endpoints

1. Apply filters in SQL (Supabase query or RPC).
2. Paginate with `.range(offset, offset + limit - 1)` or keyset cursor.
3. Return slim DTO; detail route returns full aggregate.
4. Batch-load related rows (owners, profiles) with `.in('id', ids)`.

Reference implementations:

- Keyset: `backend-ts/src/billing/credits.service.ts`
- Search cursor: `backend-ts/src/search/search.service.ts`
- Company ads list: `backend-ts/src/company-ads/company-ads.controller.ts`

### Catalog cache

- Backend: `CatalogCacheService` (Redis TTL, `Cache-Control` fallback)
- PWA: `useCatalogBilling()`, `useCreditPacks()`, `usePlans()` — session `useState`, single fetch

### Background jobs

Queue name: **`background`** (`backend-ts/src/search/background-jobs.consumer.ts`)

| Job | Producer |
|-----|----------|
| `search-alerts` | Search alerts cron |
| `job-email-alerts` | Job email alerts cron |
| `typesense-reindex-chunk` | Maintenance / ops (chunked reindex) |

Without `REDIS_URL`, crons run handlers inline.

### Object storage

| Bucket | Access | Upload path |
|--------|--------|-------------|
| `job-photos` | Public | PWA direct or shared `uploadPublicImage` |
| `profile-avatars` | Public | PWA direct |
| `chat-media` | Private | `POST /api/chat/rooms/:id/media` only |

### Search indexing

| Domain | Status |
|--------|--------|
| Job offers | **Live** — Typesense + `search-indexing.service.ts`; backfill: `npm run backfill-typesense` in `backend-ts` |
| SK education institutions (CV school picker) | **Live** — Typesense collection `sk_schools` (env `TYPESENSE_COLLECTION_SCHOOLS`); backfill: `npm run search:reindex -- --schools-only` in `backend-ts`; Postgres RPC fallback when Typesense unset |
| Company ads | **SQL list first** — Typesense collection `company_ads` planned; env `TYPESENSE_COMPANY_ADS_ENABLED` when added |
| CV employer DB | **SQL pagination first** — Typesense or `search_cvs_employer` RPC later; no PII in index |

## Anti-patterns (do not add)

- `const { data } = await query` without `.range()` on public catalogs, then `.slice(offset, limit)` in Node
- `select('*')` on list endpoints
- `for (const row of list) { await db... }` without batching
- New filter column without an index migration
- Granting credits or fulfilling Stripe from a queue consumer
- Duplicating billing credit costs only in PWA without server `GET /api/billing/config`

## PR checklist (new list endpoint)

- [ ] SQL/RPC pagination with max limit 100
- [ ] Slim list DTO vs detail DTO
- [ ] Explicit `select` columns
- [ ] Related entities loaded in batch (no N+1)
- [ ] Migration index for new predicates
- [ ] PWA: debounced filters + `AppAsyncListState` or equivalent loading/error/empty
- [ ] Documented in this file if exception (e.g. admin export)

## Observability

- **Slow queries**: Supabase Dashboard → Query performance; monthly review — [observability-runbook.md](./observability-runbook.md)
- **HTTP**: Prometheus `GET /metrics` (not sampled); `jobbie_outbound_fetch_duration_seconds` for Typesense/Turnstile/Twilio
- **Load smoke**: `k6 run -e BASE_URL=... backend-ts/scripts/k6/smoke.js` (staging)
- **CI**: `.github/workflows/backend-ci.yml` — `npm test` + `npm run build` on `backend-ts` and `app-pwa` changes
- **Product search**: `search_query_logs`, admin analytics RPCs

## PWA bundle analysis

- From `app-pwa/`: `npm run build:analyze` writes `stats/bundle-stats.html` (set `ANALYZE=1` via `scripts/build-analyze.mjs`).
- Use after large dependency or route changes to compare shared vendor chunks.

## Related docs

- [database-schema-conventions.md](./database-schema-conventions.md) — indexes, pagination
- [database-operations-runbook.md](./database-operations-runbook.md) — backups
- [DEPLOYMENT.md](../DEPLOYMENT.md) — CDN, Redis, Socket.IO scaling
