# JOBBIE documentation

JOBBIE is a Slovak job marketplace where **companies** publish job offers and service/company ads, and **individuals** browse, apply, build CVs, receive email alerts, and chat with employers.

## Documentation map

| Doc | Topics |
|-----|--------|
| [architecture.md](./architecture.md) | System diagram, modules, data flows, background jobs |
| [frontend.md](./frontend.md) | Nuxt PWA structure, routing, API client, state |
| [backend.md](./backend.md) | NestJS API, guards, controllers, crons |
| [database.md](./database.md) | Postgres schema, RLS, credit RPCs |
| [auth-security.md](./auth-security.md) | Sessions, roles, CSRF, MFA |
| [payments-credits.md](./payments-credits.md) | Plans, packs, ledger, Stripe |
| [features.md](./features.md) | Product features → routes → modules |
| [uploads.md](./uploads.md) | Storage pipeline and limits |
| [notifications.md](./notifications.md) | In-app, email, push, alerts |
| [deployment.md](./deployment.md) | Local dev, env vars, production |
| [admin-desktop.md](./admin-desktop.md) | Local Electron admin panel (`jobbie-admin/`) |
| [changelog.md](./changelog.md) | Important codebase changes |

### Specialized runbooks (existing)

| Doc | Use when |
|-----|----------|
| [SECURITY.md](./SECURITY.md) | Security checklist, new endpoint template, BFF flow |
| [GDPR-PRIVACY.md](./GDPR-PRIVACY.md) | CV visibility, export/delete, consent |
| [database-schema-conventions.md](./database-schema-conventions.md) | Migrations, indexes, credit RPC rules |
| [database-operations-runbook.md](./database-operations-runbook.md) | Backups, secret rotation |
| [scalability.md](./scalability.md) | Pagination, Redis, Typesense, list APIs |
| [observability-runbook.md](./observability-runbook.md) | Sentry, Prometheus, query review |
| [email-smtp.md](./email-smtp.md) | Transactional SMTP (job alerts, digests) |
| [stripe-invoice-emails.md](./stripe-invoice-emails.md) | Stripe billing emails |
| [SECURITY_VERIFICATION.md](./SECURITY_VERIFICATION.md) | Security verification checklist |
| [SETTINGS_QA_CHECKLIST.md](./SETTINGS_QA_CHECKLIST.md) | Settings QA |
| [../supabase/AUTH-GOOGLE-OAUTH.md](../supabase/AUTH-GOOGLE-OAUTH.md) | Google Sign-In consent screen branding (free tier + Custom Domain) |
| [firmy-testing.md](./firmy-testing.md) | Company ads testing |
| [profile-deferred.md](./profile-deferred.md) | Deferred profile features |

## User roles

Roles are stored on `profiles` and enforced in the Nest API (not only in the UI).

| Concept | Field / guard | Typical use |
|---------|---------------|---------------|
| Account type | `profiles.role` — `company` or individual | Company vs job seeker flows |
| Worker | `profiles.worker_role` | Worker-only pages (`middleware/worker-only.ts`) |
| Customer / provider | `customer_role`, `provider_role` | Dashboard routes |
| Platform admin | `profiles.app_role` = `admin` | Desktop app [`jobbie-admin/`](../jobbie-admin/), `AdminMfaGuard` on local admin API |
| Permission scopes | `permission_scopes` (company users) | Fine-grained employer actions |

UI hints: [`app-pwa/composables/useCan.ts`](../app-pwa/composables/useCan.ts) — **never** rely on these alone; backend must enforce access.

## Product areas

| Area | Doc |
|------|-----|
| Job posts & search | [features.md](./features.md), [payments-credits.md](./payments-credits.md) |
| Company / service ads | [features.md](./features.md) |
| CV builder & employer database | [features.md](./features.md), [GDPR-PRIVACY.md](./GDPR-PRIVACY.md) |
| Job email alerts | [features.md](./features.md), [notifications.md](./notifications.md) |
| Chat & applications | [features.md](./features.md) |
| Billing & subscriptions | [payments-credits.md](./payments-credits.md) |
| Settings & account | [features.md](./features.md), [GDPR-PRIVACY.md](./GDPR-PRIVACY.md) |

## Codebase inventory

| Folder | Purpose |
|--------|---------|
| [`app-pwa/`](../app-pwa/) | Nuxt 3 SPA + PWA (primary UI), Capacitor shell |
| [`backend-ts/`](../backend-ts/) | NestJS REST API, Socket.IO, crons, BullMQ |
| [`supabase/migrations/`](../supabase/migrations/) | Postgres schema, RLS, RPCs (apply in timestamp order) |
| [`docs/`](./) | Documentation |
| [`.cursor/rules/`](../.cursor/rules/) | Cursor rules (security, DB, billing, scalability) |
| [`Jobbie design/`](../Jobbie%20design/) | Static HTML prototypes — **not** the production app |
| [`scripts/`](../scripts/) | Repo scripts (e.g. security checks) — TODO: verify contents |

### Important config files

| File | Role |
|------|------|
| [`app-pwa/nuxt.config.ts`](../app-pwa/nuxt.config.ts) | Nuxt, PWA, CSP, dev proxy, runtime config |
| [`app-pwa/capacitor.config.ts`](../app-pwa/capacitor.config.ts) | Native wrapper (`webDir: .output/public`) |
| [`backend-ts/src/main.ts`](../backend-ts/src/main.ts) | Nest bootstrap, port, helmet, global prefix `api` |
| [`backend-ts/src/billing/billing.config.ts`](../backend-ts/src/billing/billing.config.ts) | Credit costs and marketing pack/plan specs |

## External services

| Service | Used for |
|---------|----------|
| Supabase | Postgres, Auth, Storage, Realtime |
| Stripe | Credit packs, subscriptions, webhooks |
| Typesense | Job search (primary) |
| Redis (optional) | Feed cache, BullMQ, Socket.IO adapter |
| SMTP (`SMTP_*` env) | Transactional / alert email ([email-smtp.md](./email-smtp.md)) |
| Twilio | SMS (optional) |
| MailerLite | Newsletter sync |
| Cloudflare Turnstile | CAPTCHA on failed login |
| Sentry | Error reporting (PWA + API) |
| PostHog | Product analytics (PWA, optional) |

## Environment variables

Names only — never commit values. Full grouped lists: [deployment.md](./deployment.md).

- **PWA:** `NUXT_PUBLIC_*` — see [`app-pwa/.env.example`](../app-pwa/.env.example)
- **API:** `SUPABASE_*`, `STRIPE_*`, `REDIS_URL`, `TYPESENSE_*`, etc. — see [`backend-ts/.env.example`](../backend-ts/.env.example)

## npm scripts

### `app-pwa`

| Script | Command |
|--------|---------|
| `dev` | Nuxt dev server (port **3001**) |
| `build` | Production build |
| `generate` | Static generate (Capacitor) |
| `cap:sync` | `nuxt generate` + Capacitor sync |

### `backend-ts`

| Script | Command |
|--------|---------|
| `start:dev` | Nest watch mode |
| `build` | Compile to `dist/` |
| `test` | Jest unit tests |
| `search:reindex` | Typesense backfill |

## Keeping docs updated

When you change code, update the relevant `docs/*.md` file and add an entry to [changelog.md](./changelog.md). See [AGENTS.md](../AGENTS.md) and `.cursor/rules/documentation.mdc`.
