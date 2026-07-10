# Admin desktop app

Platform admin tools were removed from the public PWA (`app-pwa`) and main API (`backend-ts`). They live in [`jobbie-admin/`](../jobbie-admin/) as a **local Electron** application.

## UI stack

The desktop shell (`jobbie-admin/app/`) uses **Vue 3 + Vite**, **Tailwind CSS v4**, and **PrimeVue 4** (Aura preset with slate surfaces and JOBBIE green primary accent). Layout: collapsible grouped sidebar, top bar with API health + runbook drawer, wide content area (`max-w-screen-2xl`). Shared primitives: `AdminPageHeader`, PrimeVue `DataTable`, `Message`, `ConfirmDialog` (via `useConfirm()`).

## Why separate

- Admin UI is not linked from the consumer PWA.
- Admin API binds to localhost and expects Bearer JWT, not public BFF cookies.
- Reduces attack surface on the production web deployment.

## Operator requirements

| Requirement | Detail |
|-------------|--------|
| `profiles.app_role` | `admin` |
| Recent login | Suspend/moderation/audit export: JWT `auth_time` / `iat` within **`ADMIN_RECENT_LOGIN_MINUTES`** (admin API default **120**; main `backend-ts` remains 15 min) |
| Env | Copy `jobbie-admin/api/.env` from main `backend-ts/.env` (service role, JWT, audit secret) |

Packaged installs: edit `%APPDATA%\jobbie-admin\.env` (Windows) or `~/Library/Application Support/jobbie-admin/.env` (macOS), or place `.env` next to the executable. See [jobbie-admin/README.md](../jobbie-admin/README.md).

## Distribution

| Platform | Command | Artifact |
|----------|---------|----------|
| macOS | `npm run build:mac` (on a Mac) | `jobbie-admin/release/JOBBIE-Admin-<version>.dmg` |
| macOS unsigned | `npm run build:mac:unsigned` | same (no Developer ID signing) |
| Windows | `npm run build:win` (on Windows) | `jobbie-admin/release/JOBBIE-Admin-<version>-Setup.exe` |
| Windows unsigned | `npm run build:win:unsigned` | same (no Authenticode signing) |

App icons: `jobbie-admin/build/icon.{svg,icns,ico}` (regenerate with `npm run icons:generate`). The Electron packager uses `directories.app: "."` because the Vue UI lives in a subfolder named `app/`.

**Share with a friend (Mac):** build the DMG on macOS, send the single `.dmg`, drag to Applications, then right-click → Open once if Gatekeeper blocks an unsigned build. Full steps: [jobbie-admin/README.md](../jobbie-admin/README.md#share-with-a-friend-mac).

**Share with a friend (Windows):** build the NSIS installer on Windows, send `JOBBIE-Admin-<version>-Setup.exe`, run the wizard, then **More info → Run anyway** if SmartScreen blocks an unsigned build. Configure `%APPDATA%\jobbie-admin\.env` after install. Full steps: [jobbie-admin/README.md](../jobbie-admin/README.md#share-with-a-friend-windows).

**Code signing (optional):** Apple **Developer ID Application** + notarization (Mac) or Windows **Authenticode** (`.pfx` + `CSC_LINK` / `CSC_KEY_PASSWORD` for electron-builder) reduces OS warnings for wider distribution.

## Endpoints (admin API only)

| Method | Path |
|--------|------|
| GET | `/health` (`ok`, `version`, `recentLoginMinutes`) |
| GET | `/api/admin/overview` |
| GET | `/api/admin/infrastructure` |
| GET | `/api/admin/infrastructure/:envId/history?range=1h\|24h\|2w\|1m` |
| GET | `/api/admin/infrastructure/:envId/backends` |
| POST | `/api/admin/infrastructure/:envId/backends/scale-up` (super_admin, recent login) |
| POST | `/api/admin/infrastructure/:envId/backends/scale-down` (super_admin, recent login) |
| POST | `/api/admin/infrastructure/:envId/backends/:containerName/restart` (super_admin, recent login) |
| GET | `/api/admin/analytics/summary` |
| GET | `/api/admin/analytics/external` |
| GET | `/api/admin/analytics/external/test` |
| GET | `/api/admin/audit/events` (`subject_id`, `event_type` prefix with trailing `.`) |
| GET | `/api/admin/audit/event-types` |
| GET | `/api/admin/audit/export` |
| POST | `/api/admin/audit/verify-chain` |
| GET | `/api/admin/moderation/reports/count` |
| GET | `/api/admin/moderation/reports/open` (enriched previews + `public_url`) |
| POST | `/api/admin/moderation/reports/:id/claim` |
| POST | `/api/admin/moderation/reports/:id/dismiss` (`resolution_code`, `note`; audit `moderation.report.dismissed`) |
| POST | `/api/admin/moderation/reports/:id/hide` (`job_offer`, `company_profile`, `company_ad`, `banner_ad`; audit `moderation.report.content_hidden`) |
| GET | `/api/admin/users/search` |
| GET | `/api/admin/users/:id` |
| GET | `/api/admin/users/:id/billing` |
| POST | `/api/admin/users/:id/grant-credits` (`amount` ≤ 500, `reason`; audit `admin.credits.granted`) |
| POST | `/api/admin/users/:id/export-data` (ZIP; audit `admin.user.data_exported`) |
| POST | `/api/admin/users/:id/close-account` (`confirm_phrase`: `ZMAZAT UCET`; audit `admin.user.account_closed`) |
| POST | `/api/admin/users/:id/suspend` |
| POST | `/api/admin/users/:id/unsuspend` |
| GET | `/api/admin/applications` (`job_id` or `user_id`) |
| GET | `/api/admin/chat/rooms` (`user_id`) |
| POST | `/api/admin/jobs/:id/unpublish` (audit `admin.job.unpublished`) |
| POST | `/api/admin/company-ads/:id/unpublish` (audit `admin.company_ad.unpublished`) |
| GET | `/api/admin/notifications/broadcast/count` (`audience`) |
| POST | `/api/admin/notifications/broadcast` (`audience`: `all` \| `company` \| `individual`) |
| GET | `/api/admin/jobs/:id` |
| GET | `/api/admin/company-ads/:id` |
| GET | `/api/admin/consent/cookie-log` |
| GET | `/api/admin/contract-withdrawals` (`status`, `q`, `from`, `to`, cursor) |
| PATCH | `/api/admin/contract-withdrawals/:id` (`status`: `pending` \| `approved` \| `rejected`; recent login; audit `contract.withdrawal.status_updated`) |
| GET | `/api/admin/blog` |
| GET | `/api/admin/blog/:id` |
| POST | `/api/admin/blog` |
| PATCH | `/api/admin/blog/:id` |
| POST | `/api/admin/blog/:id/publish` |
| POST | `/api/admin/blog/:id/unpublish` |
| DELETE | `/api/admin/blog/:id` |
| POST | `/api/admin/storage/uploads/init` |
| POST | `/api/admin/storage/uploads/:uploadId/finalize` |

User-facing content reports remain on the main API: `POST /api/reports`. Public blog reads: `GET /api/blog`, `GET /api/blog/:slug` on the main API.

### Analytics summary

`GET /api/admin/analytics/summary?from=&to=&cohort_weeks=&search_days=` returns funnel, MRR/ARR, cohorts, API latency (sampled `api_request_logs`), search KPIs (`search_query_logs`), daily timeseries, marketplace snapshot, users breakdown, and revenue-in-period metrics. Requires migration `20260530120000_admin_analytics_extended.sql` (and earlier `20260503160000_admin_analytics_rpcs.sql`). Search data does **not** require `SEARCH_ANALYTICS_SECRET` in admin `.env` (service_role RPCs). That secret is only for optional `GET /search/analytics/summary` on the public API.

**Prehľad** (`/overview`): open reports count, signups/jobs KPIs (today + 7d), failed Stripe webhooks (7d), last five **your** audit events, quick links.

**Infra** (`/infrastructure`): staging and production VPS — API health latency, host CPU load / RAM / disk (SSH), Docker container stats, optional Nest Prometheus gauges (`GET /metrics` with bearer), **CPU/RAM history charts** (1 h / 24 h / 2 weeks / 1 month). History merges **VPS JSONL** (systemd sampler on each server, read over SSH) with a **local session cache** while the admin API runs. Response includes `history_source`: `vps` | `local` | `mixed`. **Nest inštancie** panel lists each `backend` replica (docker stats) with **super_admin** controls to add/remove one replica or restart a single container (SSH → `scale_backend.sh` / `restart_backend_instance.sh`; audited). Requires `VPS_STAGING_*` and `VPS_PRODUCTION_*` in `jobbie-admin/api/.env` (SSH host/user/key from GitHub deploy secrets; `METRICS_BEARER_TOKEN` from each VPS `.env.backend`). Throttled to 6 requests/min. Auto-refresh 60s in UI.

**Infra metrics history (VPS sampler):** On each staging/production VPS, enable `jobbie-infra-metrics.timer` (see [`websupport-vps-deployment/README-DEPLOYMENT.md`](../websupport-vps-deployment/README-DEPLOYMENT.md#jobbie-admin-infra-history-sampler-optional)) so `/var/lib/jobbie/infra-metrics.jsonl` is appended every 5 minutes. The admin API reads it via SSH (`VPS_*_INFRA_HISTORY_PATH`, default `/var/lib/jobbie/infra-metrics.jsonl`). Without the sampler, charts only cover the current admin session (`history_source: local`). Electron sends SIGTERM on quit so the local JSON cache can flush (~500 ms).

**Podpora** (`/support`): UUID hub; job/ad detail with unpublish + public URL; user detail with billing, applications, chat rooms, grant credits, GDPR export, account close.

**Odstúpenie od zmluvy** (`/contract-withdrawals`): list of consumer withdrawal requests from `/odstupenie-od-zmluvy`; filters by status/date/search; per-row status dropdown (pending / approved / rejected) with step-up on PATCH.

**Analytics UI:** presets 7 / 30 / 90 days and **Vlastné** (custom `from`/`to`, max 366 days); saved presets in `localStorage`; KPI grid shows % change vs prior equal-length period; **Export CSV** from current summary; **Web & marketing** uses `GET /api/admin/analytics/external` (PostHog, GA4, Microsoft Clarity, Google Search Console — each optional via `jobbie-admin/api/.env`; **Test pripojenia** → `GET /api/admin/analytics/external/test`). Set `PWA_PUBLIC_URL` (or `JOBBIE_PUBLIC_URL`) for moderation deep links.

**Moderácia** (`/moderation`): oldest-first content-reports queue; `>24h` escalated styling; `resolution_code` on dismiss/hide; optional claim; enriched previews + support links; sidebar badge from `reports/count` (nav hidden on 403). **Skryť obsah** hides the reported entity only (e.g. public profile off) — it does **not** ban login. **Pozastaviť účet** on `company_profile` reports calls `POST /api/admin/users/:id/suspend` (same as Účty). List/count endpoints do **not** require step-up; claim/dismiss/hide POSTs use `@RequireRecentLogin()`.

**Admin roles** (`profiles.app_role` must be `admin` to sign in): `profiles.admin_role` `analyst` (overview/analytics/audit only), `moderator` (+moderation/support/users), `super_admin` (all). Null `admin_role` + `app_role=admin` → super_admin.

**Účty:** search by email/name/UUID; detail with credits and last sign-in; suspend/unsuspend; **Zobraziť v audite** (`/audit?user_id=`).

**Notifications:** audience `all` / `company` / `individual`; recipient count before send.

### Audit log (desktop UI)

**Audit log** screen: filters (7/30/90d, event type, actor UUID, limit 50–200), detailed table (subject, IP, payload preview; click row for full JSON), **Export CSV** / **Export JSONL** (downloads via Bearer auth; same filters as list), **Načítať ďalšie** (cursor pagination), **Overiť reťazec** (HMAC chain for selected period). List items include `actor_label` from `profiles`. Export CSV columns: id, timestamps, actor, subject, session/device, payload, row_hash. Requires recent login (`@RequireRecentLogin` on audit routes).

Blog cover images use the public `blog-covers` bucket; inline article images use `blog-content`. Both use signed upload init/finalize on admin API only (`purpose`: `blog_cover` | `blog_content`); PWA reads public URLs after server-side HTML sanitization.

### Step-up window (`ADMIN_RECENT_LOGIN_MINUTES`)

Mutation routes (moderation claim/dismiss/hide, user suspend, audit export, …) use `@RequireRecentLogin()` + `BearerRecentLoginGuard` (JWT `auth_time` or `iat`, not BFF cookies). Moderation **GET** queue/count and **Prehľad** work without a fresh step-up. Re-login if sensitive actions return 403. The desktop API does **not** share `backend-ts`’s 15-minute `api_user_sessions.last_step_up_at` window.

| Setting | Default | Notes |
|---------|---------|--------|
| `ADMIN_RECENT_LOGIN_MINUTES` | `120` | Exposed on `GET /health` as `recentLoginMinutes` for `AdminMfaBanner` |
| Solo operator | `120`–`480` | Longer window is acceptable on localhost-only admin |
| Stricter | `15` | Match main API step-up if desired |

Set in `jobbie-admin/api/.env` or packaged operator `.env`; restart API/Electron after change.

## Runbook

See [jobbie-admin/README.md](../jobbie-admin/README.md).

If the UI shows **Admin API unreachable** / `Failed to fetch`, the Nest process on `127.0.0.1:3099` is not up or not ready yet — see [Troubleshooting (Admin API / Failed to fetch)](../jobbie-admin/README.md#troubleshooting-admin-api--failed-to-fetch) in the admin README.
