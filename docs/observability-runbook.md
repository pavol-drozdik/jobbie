# Observability runbook (JOBBIE)

## Error tracking (Sentry)

- Configure `SENTRY_DSN` / `SENTRY_ENVIRONMENT` / `SENTRY_TRACES_SAMPLE_RATE` on the API (`backend-ts`).
- Configure `NUXT_PUBLIC_SENTRY_*` in the PWA for client errors.
- In Sentry, create alert rules for **error rate spikes** (e.g. compared to 14-day baseline).

## Product analytics (PostHog)

### Role split (PWA vs admin)

| Surface | Tool | Purpose |
|---------|------|---------|
| **app-pwa** (browser) | **PostHog** (EU) | Product funnels, custom events, optional triggered replay |
| **app-pwa** (browser) | **Google Tag Manager** (GA4 + Clarity in container) | Traffic and UX analytics when user accepts analytics cookies |
| **app-pwa** | **Sentry** | Errors and stack traces (not gated by cookie banner) |
| **jobbie-admin** | PostHog / GA4 / Clarity **Data APIs** | Operator KPI dashboards (`GET /api/admin/analytics/external`) |

Browser tags use `NUXT_PUBLIC_*` env vars; admin export uses separate credentials (`GA4_PROPERTY_ID`, `CLARITY_API_TOKEN`, etc.) in `jobbie-admin/api/.env`.

Admin compares sources in **Web & marketing**; treat PostHog vs GA user counts as trends, not 1:1 totals.

### PWA configuration

- Env: `NUXT_PUBLIC_POSTHOG_KEY`, optional `NUXT_PUBLIC_POSTHOG_HOST` (default `https://eu.i.posthog.com`).
- Env: `NUXT_PUBLIC_GTM_CONTAINER_ID` (`GTM-…`) — empty = off. Configure GA4 and Microsoft Clarity tags inside the GTM container (not in app env).
- SDK: [`app-pwa/utils/posthog-client.ts`](../app-pwa/utils/posthog-client.ts) — autocapture off, manual `$pageview`, `advanced_disable_flags: true` until the first flag ships.
- GTM: [`app-pwa/utils/gtm-client.ts`](../app-pwa/utils/gtm-client.ts) — bootstrap `gtm.js` on every page when `NUXT_PUBLIC_GTM_CONTAINER_ID` is set; SPA `page_view` via `dataLayer` only after analytics consent; gtag Consent Mode defaults in [`utils/analytics-consent.ts`](../app-pwa/utils/analytics-consent.ts).
- **GTM container:** Enable Consent Mode; tie GA4/Clarity tags to `analytics_storage` granted. Use a GA4 Configuration tag with **Send a page view event when this configuration loads** off — the app pushes `page_view` on route changes after consent. Prefer **All Pages** / consent triggers over **Window Loaded** for Clarity (container loads before accept).
- **Cookie consent:** [`plugins/0.consent.client.ts`](../app-pwa/plugins/0.consent.client.ts) + [`utils/analytics-consent.ts`](../app-pwa/utils/analytics-consent.ts) — PostHog loads only when the user accepts **analytics**; GTM shell loads earlier but tags stay gated; `_ga*`, `ph_*`, `_clck`, `_clsk` cleared and Clarity/GA scripts removed on withdraw.
- Custom events: `checkout_started`, `credits_purchased`, `subscription_purchased`, `job_applied`, `registration_enter_app` via `useAnalytics()`.

### PostHog project settings (cloud)

Applied on project **Default project** (EU): autocapture/heatmaps/web vitals/performance/console capture **off**; session replay **on** with **event triggers** only (`checkout_started`, `job_applied`, `credits_purchased`, `subscription_purchased`), min duration 5s, input masking; test-account filter default **on**.

### Free tier and billing caps (manual)

Monthly free allowances (reset each cycle): **1M product analytics events**, **5K session recordings**, **1M feature-flag requests** ([PostHog pricing FAQ](https://posthog.com/faq)).

**Operator action (required once):** In PostHog → **Organization settings → Billing** ([`/organization/billing`](/organization/billing)), set **billing limits** (hard caps) at the free-tier ceilings for **Product analytics** and **Session replay** so ingestion stops instead of accruing overage.

### Funnels and flags

- Build funnels in PostHog for signup → purchase → apply using the custom events above.
- When shipping the first feature flag, set `advanced_disable_flags: false` in `posthog-client.ts` and create the flag in PostHog.

## API metrics (Prometheus)

- Scrape `GET /metrics` (root path, **not** under `/api`).
- Optional: set `METRICS_BEARER_TOKEN` and scrape with `Authorization: Bearer <token>`.
- Histogram `jobbie_http_request_duration_seconds` and counter `jobbie_http_requests_total` cover all non-health routes.
- **Note:** Rows in `api_request_logs` remain **sampled** (see `AUDIT_API_SAMPLE_RATE`); Prometheus metrics are **not** sampled.

## DB slow queries (Supabase)

- Use Supabase Dashboard → **Database** → **Query performance** / **Logs**, or enable **`pg_stat_statements`** on self-hosted Postgres.
- Tune indexes from the slowest queries; application code does not ship slow-query logging.
- **Cadence**: review top queries monthly after deploys that add list filters or new endpoints.
- **Workflow**: new filter column in API → add btree/GIN index in the same migration ([docs/scalability.md](./scalability.md)).
- Indexes for catalog lists: `idx_company_ads_active_list`, `idx_cvs_employer_visible_updated`, `idx_applications_job_created` (`20260621153000_scalability_indexes.sql`).

## Operator Discord alerts (production VPS)

Free-tier stack for bugs, moderation reports, server load, and API health. **Full replication guide:** [`websupport-vps-deployment/OPS-DISCORD-ALERTING.md`](../websupport-vps-deployment/OPS-DISCORD-ALERTING.md).

| Source | Mechanism | Discord channel |
|--------|-----------|-----------------|
| Sentry (`backend-ts`, `app-pwa`) | Cloudflare Worker ← Sentry Internal Integration | `#bugs-prod` |
| `content_reports` INSERT | Supabase Edge Function `discord-content-report` | `#moderation` |
| CPU / RAM / disk ≥ 95% | Netdata `health.d/jobbie.conf` | `#ops-alerts` |
| API `/health` | Netdata `go.d` httpcheck → local Caddy (`127.0.0.1` + `Host` header) | `#ops-alerts` |

Notes:

- Sentry **Developer** plan has no native Discord; use the Worker bridge (not legacy Webhooks plugin).
- Do not probe `https://api…/health` from the same VPS through Cloudflare for Netdata — cached 200 hides backend outages. Templates: `websupport-vps-deployment/ops/netdata/`.
- After `systemctl restart netdata`, wait ~90 s and run `netdatacli reload-health`.

## Uptime

- **On-VPS:** Netdata httpcheck (see operator Discord alerts above).
- **External (optional):** UptimeRobot or similar on `GET /health` — add Cloudflare cache bypass for `/health` if proxied.
- Optionally monitor `GET /metrics` if protected (`METRICS_BEARER_TOKEN`).

## Admin KPIs

- Desktop: JOBBIE Admin app (`jobbie-admin/`) → **Analytics** (KPI cards, funnel, growth/cohort charts, revenue, marketplace, users, search quality, API latency table).
- Local API: `GET http://127.0.0.1:3099/api/admin/analytics/summary` (Bearer JWT + `app_role = admin` + AAL2). Query: `from`, `to` (ISO), `cohort_weeks`, `search_days`.
- DB: `admin_analytics_*` and `search_analytics_*` RPCs (`service_role` only). Apply `20260503160000_admin_analytics_rpcs.sql` and `20260530120000_admin_analytics_extended.sql`.
- Search KPIs populate after users run job search on the PWA (rows in `search_query_logs`). Admin does not use `SEARCH_ANALYTICS_SECRET`.
- API latency in admin is from **sampled** `api_request_logs`; use Prometheus `jobbie_http_request_duration_seconds` for unsampled HTTP SLOs in production.
