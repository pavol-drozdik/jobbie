# Database schema conventions

Human-readable companion to `.cursor/rules/database-engineering.mdc` and `.cursor/rules/supabase-rls.mdc`.

Overview and table domains: [database.md](./database.md). Doc hub: [README.md](./README.md).

## Migrations

- Filename: `YYYYMMDDHHMMSS_short_description.sql`
- Run in timestamp order on staging before production.
- Comment each table: **public catalog**, **user-owned**, or **service-only** (Nest `service_role` only).

## Structured fields

Prefer typed columns for anything used in filters, sorts, or alerts:

| Domain | Examples |
|--------|----------|
| Jobs | `category`, `city`, `salary_min`/`salary_max`, `work_modes[]`, `is_active`, `expires_at` |
| Company ads | `status`, `region`, `city`, `price_min`/`price_max` |
| Alerts | `job_email_alerts` columns + `criteria_hash`; avoid new logic on `saved_searches.query_json` |

Use JSONB only for opaque blobs (gallery items, notification preferences), not sole copy of filter criteria.

## Credits

- **Ledger**: `credit_ledger` (append-only history) + `credit_lots` (FIFO inventory).
- **RPCs**: `grant_credits`, `spend_credits`, `expire_due_credit_lots`.
- **Never** update `profiles.credits` from application code outside RPCs.
- **Publish**: draft row → charge → activate (`is_draft = false`, `is_active = true`).

## Indexes & uniqueness

- Btree on equality/range filters; GIN on `text[]` overlap.
- Partial unique indexes on Stripe IDs where nullable: `payment_intent_id`, `stripe_subscription_id`.
- Business dedupe: `cv_contact_unlocks (company_id, cv_id)`, `job_email_alerts (user_id, criteria_hash)`.
- **Scalability list indexes** (see `20260621153000_scalability_indexes.sql`):
  - `idx_company_ads_active_list` — active public catalog, `created_at desc`
  - `idx_company_ads_price_range` — active ads, `price_min` / `price_max`
  - `idx_cvs_employer_visible_updated` — employer CV database browse
  - `idx_applications_job_created` — applicants per job, paginated

## RLS & grants

- Enable RLS on every new table.
- Service-only: `using (false)` policies; `grant` only to `service_role`.
- Public read: prefer **`job_offers_public`** / **`company_ads_public`** views.

## API pagination

- Keyset cursor `(created_at, id)` for large tables (credit ledger, admin audit).
- Max page size: 100.

## Related docs

- [Database operations runbook](./database-operations-runbook.md) — backups and restore drills
- [DEPLOYMENT.md](../DEPLOYMENT.md) — hosting
