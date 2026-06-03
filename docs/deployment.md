# Deployment and local development

How to run JOBBIE locally and deploy to production. Portable hosting notes were merged from the root [`DEPLOYMENT.md`](../DEPLOYMENT.md).

Operations: [database-operations-runbook.md](./database-operations-runbook.md). Monitoring: [observability-runbook.md](./observability-runbook.md).

## Local development

### Prerequisites

- Node 18+ (PWA build scripts request large heap — see `app-pwa/package.json`)
- Supabase project (URL + keys)
- Optional: Redis, Typesense, Stripe test keys

### Terminals (typical)

| Service | Directory | Command | URL |
|---------|-----------|---------|-----|
| API | `backend-ts` | `npm install && npm run start:dev` | `http://localhost:8000` |
| PWA | `app-pwa` | `npm install && npm run dev` | `http://localhost:3001` |
| Typesense | (docker/local) | per `.env.example` | port **8108** default |

PWA dev proxies `/api` → `http://localhost:8000` when using default `NUXT_PUBLIC_API_BASE_URL`.

### Environment files

```bash
cp backend-ts/.env.example backend-ts/.env
cp app-pwa/.env.example app-pwa/.env
```

Fill Supabase, Stripe (if testing payments), and other keys — never commit `.env`.

### Database migrations

Apply SQL in [`supabase/migrations/`](../supabase/migrations/) in timestamp order:

- Supabase SQL Editor, or
- `supabase db push` if CLI is configured — **TODO: verify** CLI setup (no `config.toml` in repo).

**Order:** staging → production. See [database-schema-conventions.md](./database-schema-conventions.md).

**Storage lockdown:** Deploy Nest build with `StorageModule` **before** migration `20260622120000_storage_upload_lockdown.sql`.

**Signed direct uploads:** Deploy Nest with `POST /api/storage/uploads/init|finalize` before PWA cutover. Apply `20260623140000_storage_pending_uploads.sql` and `20260623140100_chat_media_mime_expand.sql`. Verify signed `uploadToSignedUrl` against each bucket in staging.

## Build commands

### PWA

```bash
cd app-pwa
npm run build      # production build
npm run generate   # static output for Capacitor
npm run cap:sync   # generate + cap sync
```

Output: `.output/`; Capacitor `webDir`: `.output/public`.

### API

```bash
cd backend-ts
npm install
npx playwright install chromium
npm run build
npm run start:prod   # node dist/main
```

**CV PDF:** Playwright/Chromium (`CvHtmlPdfRenderer`) pre-renders PDFs on CV save into the private `cv-pdfs` bucket (BullMQ job `cv-regenerate-pdf` when `REDIS_URL` is set). Download routes read storage; missing/stale files trigger a synchronous regen. Run `npx playwright install chromium` after `npm install` in `backend-ts` (CI/Docker: same in the API image). Apply migration `20260629120000_cv_pdfs_storage.sql` before deploy.

After changing payment routes, rebuild and restart the API process. A stale server returns `Cannot POST /api/payments/...` (404) even when the route exists in source.

### Search reindex

```bash
cd backend-ts
npm run search:reindex
```

Requires Typesense env vars and running Typesense instance.

## Test commands

```bash
cd backend-ts
npm test
```

**TODO: verify** whether PWA has automated e2e tests (none documented in `app-pwa/package.json` scripts).

## Environment variables

Names only — set values in host secret manager or `.env`.

### PWA (`NUXT_PUBLIC_*`)

| Variable | Purpose |
|----------|---------|
| `NUXT_PUBLIC_API_BASE_URL` | Nest API origin |
| `NUXT_PUBLIC_CDN_URL` | CDN for `_nuxt` assets |
| `NUXT_PUBLIC_MEDIA_CDN_URL` | Image CDN for public photos |
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js |
| `NUXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile widget |
| `NUXT_PUBLIC_WEB_VITALS_SAMPLE_RATE` | RUM sample rate 0–1 |
| `NUXT_PUBLIC_AUDIT_CLIENT_EVENTS` | Enable client audit batches |
| `NUXT_PUBLIC_AUDIT_CLIENT_SAMPLE_RATE` | Audit sample rate |
| `NUXT_PUBLIC_SENTRY_DSN` | Browser Sentry |
| `NUXT_PUBLIC_SENTRY_ENVIRONMENT` | Sentry environment |
| `NUXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Sentry traces |
| `NUXT_PUBLIC_POSTHOG_KEY` | PostHog (consent-gated) |
| `NUXT_PUBLIC_POSTHOG_HOST` | PostHog host |
| `NUXT_PUBLIC_POSTHOG_DEFAULTS` | PostHog config version |
| `NUXT_PUBLIC_GTM_CONTAINER_ID` | Google Tag Manager container (`GTM-…`); GA4/Clarity configured in GTM; consent-gated |

### API (core)

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port (default **8000**) |
| `NODE_ENV` | `production` enables stricter checks |
| `CORS_ORIGINS` | Required in production |
| `SUPABASE_URL` | Supabase API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (secret) |
| `SUPABASE_ANON_KEY` | Anon key for token refresh |
| `SUPABASE_READ_URL` | Optional read replica |
| `SESSION_COOKIE_SECRET` | Documented in `.env.example` |
| `SESSION_COOKIE_DOMAIN` | Parent domain for `jb_*` when API and PWA are on different subdomains (e.g. `.jobbie.sk`); omit only when API and app share one host |
| `SESSION_ACCESS_TTL_SECONDS` | Access cookie TTL; keep ≥ Supabase JWT expiry (Dashboard → Auth) |
| `SESSION_REFRESH_TTL_DAYS` | Refresh session TTL |
| `REDIS_URL` | Feed cache, BullMQ, Socket.IO adapter |
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature |
| `STRIPE_PUBLISHABLE_KEY` | Exposed to clients via config if needed |
| `STRIPE_PRICE_ID_*` | Fallback subscription price IDs |
| `PUBLIC_API_URL` | Stripe redirect base |
| `PUBLIC_APP_URL` | Email links |
| `PUBLIC_APP_ORIGIN` | Deep links / prefs |
| `TURNSTILE_SECRET_KEY` | CAPTCHA verify |
| `SMTP_HOST`, `SMTP_FROM`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | Transactional email ([email-smtp.md](./email-smtp.md)) |
| `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID` | Newsletter |
| `TYPESENSE_*` | Search (protocol, host, port, key, collections, tuning) |
| `CHAT_CONTENT_ENCRYPTION_KEY` | Chat at-rest encryption |
| `VAPID_*` | Web push |
| `TWILIO_*` | SMS |
| `NOTIFICATION_PREFERENCE_TOKEN_SECRET` | Email pref/unsubscribe tokens |
| `AUDIT_CHAIN_SECRET` | Audit HMAC (required in prod) |
| `AUDIT_API_SAMPLE_RATE` | API audit sampling |
| `AUDIT_RETENTION_*` | Audit retention |
| `ENGAGEMENT_RETENTION_DAYS` | `job_impressions` purge + feed “scrolled past” window (default 90) |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE` | API Sentry |
| `METRICS_BEARER_TOKEN` | Protect `GET /metrics` |
| `MAINTENANCE_*` | Cleanup crons |
| `DEBUG_SUPABASE_PROJECT_SECRET` | Debug endpoint guard |

Full list and comments: [`backend-ts/.env.example`](../backend-ts/.env.example).

## Production deployment

### CDN and static assets

- Set `NUXT_PUBLIC_CDN_URL` for hashed `_nuxt` chunks ([`nuxt.config.ts`](../app-pwa/nuxt.config.ts)).
- Optional `NUXT_PUBLIC_MEDIA_CDN_URL` for public job/ad images — not chat signed URLs.
- Mirror cache headers (long cache for `/_nuxt/**`, `/assets/**`) on CDN.

### Security headers

- PWA: CSP, HSTS, `X-Frame-Options` in `nuxt.config.ts` `nitro.routeRules`.
- API: `helmet` in [`main.ts`](../backend-ts/src/main.ts).
- **Also configure CDN/reverse proxy** for HTTPS redirect and same headers on static assets.

### Supabase Postgres

- Use **connection pooler** (port **6543**, transaction mode) for server workloads.
- Optional `SUPABASE_READ_URL` for read-heavy search paths — expect replication lag.

### Redis (`REDIS_URL`)

Enables:

- Feed engagement cache
- BullMQ `background` worker (alerts, reindex chunks)
- Socket.IO Redis adapter (required for multi-instance websockets)

Without Redis, crons still run alerts **inline**.

### Horizontal scaling

- Nest: stateless; JWT/cookie auth needs no sticky sessions for HTTP.
- Socket.IO: use Redis adapter or sticky sessions on load balancer.
- Health check: `GET /health`.

### Docker / sharp

API images need **libvips** for `sharp` image re-encoding. See root DEPLOYMENT notes.

### Production checklist

- [ ] `REDIS_URL` (multi-instance + queues + websockets)
- [ ] `NUXT_PUBLIC_CDN_URL`
- [ ] Supabase pooler URL on API
- [ ] `TYPESENSE_HOST` + `TYPESENSE_API_KEY`
- [ ] `CORS_ORIGINS`, `SESSION_COOKIE_SECRET`, `AUDIT_CHAIN_SECRET`, `METRICS_BEARER_TOKEN`
- [ ] Stripe webhook URL + secrets
- [ ] Monthly Supabase query performance review ([observability-runbook.md](./observability-runbook.md))

## Cron and background jobs

Runs inside the Nest process (`@nestjs/schedule`). See [architecture.md](./architecture.md#background-jobs).

For production at scale, set `REDIS_URL` so heavy alert work uses BullMQ instead of blocking cron ticks.

## Monitoring and logging

| Signal | Endpoint / tool |
|--------|-----------------|
| Health | `GET /health` |
| Prometheus | `GET /metrics` (Bearer `METRICS_BEARER_TOKEN` in prod) |
| Sentry | PWA + API DSN env vars |
| Web Vitals | `POST /api/metrics/web-vitals` |
| PostHog | PWA optional (analytics consent) |
| GTM (GA4 + Clarity) | PWA optional (`NUXT_PUBLIC_GTM_CONTAINER_ID`; tags in GTM container; analytics consent) |

See [observability-runbook.md](./observability-runbook.md).

## SEO / AEO / GEO (production)

Configure on the **public marketing host only** (not staging/preview):

| Variable | Production | Staging / preview |
|----------|------------|-------------------|
| `NUXT_PUBLIC_SITE_URL` | `https://jobbie.sk` (no trailing slash) | empty or staging URL |
| `NUXT_PUBLIC_ALLOW_INDEXING` | `1` | unset / `0` |
| `NUXT_PUBLIC_LEGAL_PUBLISHED` | `1` only after legal review | unset / `0` |

Optional brand/contact overrides: `NUXT_PUBLIC_BRAND_NAME`, `NUXT_PUBLIC_BRAND_ALTERNATE_NAME`, `NUXT_PUBLIC_SUPPORT_EMAIL`, `NUXT_PUBLIC_SUPPORT_PHONE`, `NUXT_PUBLIC_SOCIAL_INSTAGRAM_URL`, `NUXT_PUBLIC_SOCIAL_FACEBOOK_URL`.

**Where policy lives:** `app-pwa/utils/seo-route-policy.ts` drives Nitro `routeRules` (SSR + `X-Robots-Tag`), `usePageSeo` robots meta, and static sitemap paths. Dynamic URLs (jobs, blog, company ads) come from `GET /api/seo/sitemap` (Nest). Nitro serves `/robots.txt` and `/sitemap.xml` when indexing is on.

**AI crawlers:** Allowing indexing exposes public marketing HTML to search and AI crawlers; there is no separate GEO allowlist in code.

**Legal pages:** Terms and privacy stay `noindex` and out of the sitemap until `NUXT_PUBLIC_LEGAL_PUBLISHED=1`. Set that flag only after counsel sign-off.

Validation checklist: [aeo-geo-implementation-summary.md](./aeo-geo-implementation-summary.md).

## Backups

Follow [database-operations-runbook.md](./database-operations-runbook.md) for backup and restore drills.

## How to modify safely

1. New env var → add to `.env.example`, this doc, and [changelog.md](./changelog.md).
2. Infrastructure changes → update [DEPLOYMENT.md](../DEPLOYMENT.md) redirect target (this file) only.
3. Never document secret values in markdown.
