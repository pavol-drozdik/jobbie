# JOBBIE API (NestJS)

TypeScript/NestJS rewrite of the JOBBIE backend. Same API surface as the Python FastAPI app.

## Setup

1. Copy `.env.example` to `.env` and set:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_JOB_POST`
   - **Job email alerts** (`GET|POST|PATCH|DELETE /api/job-alerts`, cron every 15m): `SMTP_HOST` + `SMTP_FROM` (omit to skip sending), `PUBLIC_APP_URL` (links in digest emails), and Typesense configured the same as job search so matches can be resolved.
   - **Typesense** (optional for local dev): set `TYPESENSE_HOST` + `TYPESENSE_API_KEY` only when a server is running. If unset, job search uses the Postgres fallback and alert preview returns `found: 0`. To run locally (API key must match `.env`):

     ```bash
     docker run --rm -p 8108:8108 -v typesense-data:/data typesense/typesense:27.1 \
       --data-dir /data --api-key=xyz --enable-cors
     ```

     Then index jobs: `npm run search:reindex` from `backend-ts`. For CV school autocomplete: `npm run search:reindex -- --schools-only` (collection `sk_schools`; without it, `GET /api/locations/sk-schools` uses Postgres).
   - **`REDIS_URL`** (recommended in production): BullMQ queue `background`, feed cache, Socket.IO adapter. Job names: `search-alerts`, `job-email-alerts`, `typesense-reindex-chunk` (payload `{ offset, limit }`). Without Redis, crons run inline.
   - **Performance RPCs** (apply migration `20260627120000_perf_applicant_counts_chat_unread.sql`): `employer_application_status_counts`, `chat_unread_counts_for_viewer`.
   - **Load smoke** (optional, requires [k6](https://k6.io/)): `k6 run -e BASE_URL=http://localhost:8000 scripts/k6/smoke.js`
2. Install and run:
   - `npm install`
   - `npm run start:dev` (development) or `npm run build` then `npm run start:prod`

After adding or changing Nest payment routes (e.g. `create-payment-intent-subscription`), **rebuild and restart** the API process. A stale server returns `Cannot POST /api/payments/...` (404) even when the route exists in source.

## Endpoints

- `GET /health` — health check
- `GET /api/auth/me` — current user (Bearer JWT, Supabase JWKS)
- `GET|PATCH /api/profiles/me`
- `GET /api/plans`, `GET /api/plans/me`
- `GET|POST /api/jobs`, `GET|PATCH /api/jobs/:id`, `POST /api/jobs/:id/activate`
- `GET|POST /api/applications`, `GET /api/applications/:id`
- `GET|POST|PATCH|DELETE /api/job-alerts` — per-user job email alert criteria (job seekers); dispatch uses SMTP + Typesense when configured
- `POST /api/chat/rooms?application_id=`, `GET /api/chat/rooms`, `POST /api/chat/messages`, `GET /api/chat/rooms/:room_id/messages`
- `POST /api/payments/checkout-session`, `POST /api/payments/activate-free-plan`, `POST /api/payments/create-payment-intent-credits`, `POST /api/payments/create-payment-intent-subscription`, `POST /api/payments/confirm-credits`, `POST /api/payments/confirm-subscription`, `POST /api/payments/webhook` (raw body for Stripe signature). Deprecated: `POST /api/payments/checkout-subscription`.

## Stripe subscriptions and webhooks

- **Webhook events** must include `invoice.paid` (in addition to subscription lifecycle events you already use), so paid plans receive `subscription_plans.monthly_credits` each billing cycle. See comments in `.env.example`.
- **Database**: `credit_packs.stripe_price_id` and `subscription_plans.stripe_price_id` must be Stripe **Price** ids (`price_...`) per environment. Paid plan slugs: `start`, `plus`, `pro` (499 / 999 / 1999 cents monthly). SQL template: [`supabase/scripts/stripe-catalog-price-ids.sql.template`](../supabase/scripts/stripe-catalog-price-ids.sql.template). Optional env fallbacks when DB columns are empty: `STRIPE_PRICE_ID_SUBSCRIPTION_START`, `_PLUS`, `_PRO` (legacy `basic`/`standard`/`premium` names still work). See [docs/payments-credits.md](../docs/payments-credits.md).
- **Free tier**: users on slug `zadarmo` receive `monthly_credits` on the **1st of each month** (UTC) via the Nest cron in `subscription-monthly-credits.cron.ts`.

CORS allows all origins. Point your Flutter app at the same base URL and paths as before.
