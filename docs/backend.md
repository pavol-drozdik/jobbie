# Backend (backend-ts)

Authoritative business API: **NestJS 10** on Express, global prefix **`/api`**, default port **8000** ([`src/main.ts`](../backend-ts/src/main.ts)).

## Structure

```
backend-ts/src/
├── auth/           # Guards, session BFF, JWT
├── billing/        # Credits RPC, catalog, limits
├── payments/       # Stripe, webhooks, subscription credits
├── jobs/           # Job offers
├── company-ads/    # Company/service ads
├── applications/   # Applications, employer applicants, CV DB
├── chat/           # Rooms, messages, media
├── cv/             # CV CRUD, PDF, photos
├── storage/        # Upload pipeline
├── search/         # Typesense, alerts, BullMQ consumer
├── job-alerts/     # Email job alerts
├── notifications/  # In-app, push, SMS, email crons
├── profiles/       # Profiles, settings-related API
├── audit/          # Audit chain, moderation, reports
├── email/          # SMTP (nodemailer)
├── newsletter/     # MailerLite
├── blog/           # Public marketing blog (read-only API)
├── maintenance/    # Cleanup crons
└── common/         # Shared utilities (e.g. keyset cursor)
```

Module registration: [`app.module.ts`](../backend-ts/src/app.module.ts).

Routes **without** `/api` prefix: `GET /health`, `GET /thanks`, `GET /metrics`, debug endpoints (see `main.ts`).

## Authentication and authorization

### Global guards (order matters via Nest registration)

| Guard | File | Role |
|-------|------|------|
| `ThrottlerGuard` | `@nestjs/throttler` | Rate limits; skips health, webhook, metrics |
| `GlobalAuthGuard` | `auth/global-auth.guard.ts` | Default protected; `@Public()` / `@OptionalAuth()` |
| `SessionAuthGuard` | `auth/session-auth.guard.ts` | JWT from `jb_at` cookie or `Authorization: Bearer` |
| `CsrfGuard` | `auth/csrf.guard.ts` | Mutations with session cookie |
| `AccountStatusGuard` | `auth/account-status.guard.ts` | Blocks suspended/closed accounts |
| `PermissionsGuard` | `auth/permissions.guard.ts` | Scoped employer permissions (`GET /api/auth/scope-check`) |
| `RecentLoginGuard` | `auth/recent-login.guard.ts` | `@RequireRecentLogin()` — 15 min step-up |

JWT verification: [`jwt-verify.service.ts`](../backend-ts/src/auth/jwt-verify.service.ts) (Supabase JWKS).

Session cookies: [`auth/session/session.constants.ts`](../backend-ts/src/auth/session/session.constants.ts) — `jb_at`, `jb_sid`, `jb_rt` (HttpOnly), `jb_csrf` (readable).

Details: [auth-security.md](./auth-security.md).

## API route index

Prefix: `/api/{controller}` unless noted.

| Prefix | Controller area |
|--------|-----------------|
| `auth` | Me, scope-check, captcha, login security |
| `auth/session` | Create, refresh, logout, step-up |
| `profiles` | Profile CRUD, `me/export`, `me/delete` |
| `jobs` | Job offers |
| `company-ads` | Company ads |
| `applications` | Applications |
| `employer` | Jobs hub, applicants list/detail, status (incl. bulk), notes, reply settings, print/export, CV database |
| `chat` | Rooms, messages, media upload, signed URLs |
| `payments` | Checkout, webhook, payment-method setup, subscriptions, invoices |
| `billing` | Config (public), account, ledger |
| `banner-ads` | Banner placements |
| `search` | Job search |
| `job-alerts` | Authenticated alert CRUD |
| `public/job-alerts` | Token-based public alert actions |
| `saved-searches` | Saved searches |
| `saved` | Saved jobs/items |
| `notifications` | In-app notifications, prefs |
| `public/notification-preferences` | Token prefs |
| `reports` | Content reports (user-submitted) |
| `analytics` | Client telemetry ingest |
| `dashboard/*` | Customer/provider analytics (`analytics.controller`) |
| `locations` | SK municipalities (`GET/POST sk-municipalities`); `GET/POST sk-cv-skills` (CV znalosti catalog); `GET sk-companies` (RPO write-through cache); `GET sk-schools` (education institutions — Typesense fuzzy search when configured, else `search_sk_education_institutions` RPC) |
| `subscribe` | Newsletter |
| `blog` | Public blog list + post by slug (`@Public()`, keyset pagination) |
| `storage` | Signed uploads (`uploads/init`, `finalize`) |
| `cv` | CV resources, `POST :cvId/photo` |
| `metrics` | `POST web-vitals` |
| `plans` | Subscription plans listing |

Webhook: `POST /api/payments/webhook` — raw body, signature verified, throttler skipped.

## Validation

- Global `ValidationPipe` with `whitelist: true` (strips unknown properties).
- Request bodies: DTO classes with `class-validator` decorators per module (`*.dto.ts`).
- File uploads: `ParseFilePipe` + policy constants from [`storage/upload-policy.ts`](../backend-ts/src/storage/upload-policy.ts).

## Business logic organization

- **Controllers** — thin: auth decorators, DTO binding, HTTP status.
- **Services** — ownership checks, Supabase queries via `SupabaseService` (service role).
- **Public catalog** — redacted mappers only:
  - Jobs: `jobs/public-response.mapper.ts` → `toPublicJobResponse`
  - Company ads: `company-ads/public-response.mapper.ts`
- **Credits** — only through [`billing/credits.service.ts`](../backend-ts/src/billing/credits.service.ts) → Postgres RPCs.
- **HTML** — `sanitizeRichTextHtml` before persist (server-side).

Never return full DB rows to anonymous callers; never trust client pack prices or credit amounts.

## Background jobs

See [architecture.md](./architecture.md#background-jobs) for cron table and BullMQ job names.

Enqueue condition: `REDIS_URL` set → BullMQ `background` queue; else inline in cron handlers.

## Email, SMS, and newsletter

| Channel | Service | Env vars |
|---------|---------|----------|
| Email | [`email/email.service.ts`](../backend-ts/src/email/email.service.ts) (SMTP) | `SMTP_HOST`, `SMTP_FROM`, optional `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS`; [email-smtp.md](./email-smtp.md) |
| SMS | [`notifications/twilio-sms.service.ts`](../backend-ts/src/notifications/twilio-sms.service.ts) | `TWILIO_*` (optional) |
| Newsletter | [`newsletter/newsletter.service.ts`](../backend-ts/src/newsletter/newsletter.service.ts) | `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID` |
| Push | [`notifications/push-notification.service.ts`](../backend-ts/src/notifications/push-notification.service.ts) | `VAPID_*` |

Preference/unsubscribe links: `NOTIFICATION_PREFERENCE_TOKEN_SECRET`, `PUBLIC_APP_ORIGIN`.

## Error handling

- Nest `HttpException` subclasses for 4xx/5xx with safe messages (no email enumeration on auth).
- [`filters/sentry-global.filter.ts`](../backend-ts/src/filters/sentry-global.filter.ts) — Sentry when `SENTRY_DSN` set.
- Billing insufficient credits: `ForbiddenException` with shared message from `billing-errors.ts`.

## Realtime

- Socket.IO via [`realtime`](../backend-ts/src/realtime/) module; Redis adapter when `REDIS_URL` set ([`common/redis-io.adapter.ts`](../backend-ts/src/common/redis-io.adapter.ts)).
- Chat may encrypt message bodies at rest when `CHAT_CONTENT_ENCRYPTION_KEY` is configured.

## How to modify safely

1. Follow [SECURITY.md](./SECURITY.md#adding-a-new-protected-endpoint).
2. Credit spend: stable `refType` + `refId`; call `reverseSpendByRef` if a later step fails.
3. New upload route: `StorageUploadService` + `@Throttle()` — see [uploads.md](./uploads.md).
4. New migration for schema; never update `profiles.credits` from TypeScript except via RPC wrappers.
5. Add Jest specs when changing public vs owner response mappers.
6. Update [changelog.md](./changelog.md) and relevant docs.

## Tests

```bash
cd backend-ts
npm test
```

Jest specs exist for billing config, public mappers, and other units — TODO: verify coverage targets; no requirement to document unverified e2e suites.
