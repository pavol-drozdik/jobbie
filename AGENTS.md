# JOBBIE — agent guide

Quick pointers for AI assistants and contributors.

## Documentation

- **Hub:** [docs/README.md](docs/README.md) — architecture, frontend, backend, database, features, deployment
- **On code changes:** update the relevant `docs/*.md` file(s) and add an entry to [docs/changelog.md](docs/changelog.md) (see `.cursor/rules/documentation.mdc`)
- **Security detail:** [docs/SECURITY.md](docs/SECURITY.md) (checklist); summary in [docs/auth-security.md](docs/auth-security.md)

## Database & security

- **Migrations**: `supabase/migrations/` (timestamp order)
- **Cursor rules**: `.cursor/rules/security-platform.mdc` (always on), `security-privacy-gdpr.mdc`, `database-engineering.mdc`, `supabase-rls.mdc`, `backend-api-security.mdc`, `security-backend.mdc`, `security-auth.mdc`, `scalability.mdc`
- **Docs**: [docs/README.md](docs/README.md) (hub), [docs/SECURITY.md](docs/SECURITY.md), [docs/GDPR-PRIVACY.md](docs/GDPR-PRIVACY.md), [docs/database-schema-conventions.md](docs/database-schema-conventions.md), [docs/database-operations-runbook.md](docs/database-operations-runbook.md), [docs/scalability.md](docs/scalability.md)
- **BFF sessions**: PWA → `POST /api/auth/session` after Supabase login; API auth via HttpOnly cookies + CSRF (see SECURITY.md)

## Scalability

- **Rule**: `.cursor/rules/scalability.mdc` — pagination, slim list APIs, indexes, cache, queues
- **Doc**: [docs/scalability.md](docs/scalability.md) — env vars, search roadmap, PR checklist
- **Redis** (`REDIS_URL`): feed cache, BullMQ `background` queue, Socket.IO adapter when multi-instance
- **Jobs search**: Typesense; company ads / CV full-text search are SQL-first until indexed (see doc)

## Admin (desktop)

- Local operator panel: [`jobbie-admin/`](jobbie-admin/) — Electron + Vue + Nest on `127.0.0.1:3099` (not in public PWA/API)
- Docs: [docs/admin-desktop.md](docs/admin-desktop.md)

## Backend

- Nest API: `backend-ts/` — uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS; enforce auth in controllers)
- Credits: `CreditsService` + RPCs `grant_credits` / `spend_credits` / `expire_due_credit_lots` / `reverse_spend_for_ref`
- Billing catalog: DB `credit_packs` + `subscription_plans`; spend costs in `billing.config.ts`; public config via `BillingCatalogService`
- Stripe: webhook claim table + `fulfillCreditsIfNeeded`; never trust client pack prices
- Crons: billing expiration, subscription monthly credits (free), job listing expiry, maintenance (`MaintenanceModule`)
- Cursor rule for billing changes: `.cursor/rules/security-billing.mdc`

## File uploads

- **Rule:** `.cursor/rules/security-storage.mdc`
- **Backend:** `backend-ts/src/storage/` — `file-type` sniff, `sharp` re-encode, `StorageUploadService`
- **PWA:** `useStorageUpload()` — init/finalize via Nest + `uploadToSignedUrl` only; never raw `supabase.storage.upload` or service role key

## Do not

- Commit `.env` or service role keys
- Upload files from PWA directly to Supabase Storage (use Nest storage endpoints)
- Update `profiles.credits` directly from app code
- Grant `anon` DML on ledger, audit, or Stripe tables
- Activate jobs/ads as public without charging credits first (use draft → charge → activate; reverse on failure)
