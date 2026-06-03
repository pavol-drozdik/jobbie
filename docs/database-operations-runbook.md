# Database operations runbook

Operational procedures for JOBBIE Postgres (Supabase). Application code cannot replace host-level backup configuration.

## Backup policy

| Item | Target |
|------|--------|
| **RPO** (max data loss) | 24 hours on Pro daily backups; lower with PITR |
| **RTO** (time to restore) | 4 hours (staging validation + DNS/config) |
| **Retention** | Match Supabase plan (7–30+ days; enable PITR on production) |

### Enable automatic backups (Supabase Dashboard)

1. Open **Project Settings → Database → Backups**.
2. On production: enable **Point-in-Time Recovery (PITR)** if available on your plan.
3. Confirm backup region matches compliance needs.
4. Note the retention period in your internal ops calendar.

### Encryption

- **At rest**: Supabase encrypts managed Postgres storage by default.
- **Exports**: If you run `pg_dump` or dashboard exports, store files in encrypted object storage (e.g. S3 SSE-KMS) with restricted IAM; delete after drill.

## Quarterly restore drill

Schedule every **3 months**. Owner: whoever maintains Supabase access.

### Steps

1. **Create an isolated target** — new Supabase branch/project or restore snapshot to a **staging** instance (never overwrite production).
2. **Restore** using Supabase backup/PITR UI or `pg_restore` from export.
3. **Smoke queries** (SQL editor or `psql`):

   ```sql
   select count(*) from public.profiles where not is_deleted;
   select id, created_at, reason, delta from public.credit_ledger order by created_at desc limit 5;
   select count(*) from public.audit_events;
   ```

4. **Verify audit chain** (against restored API with staging secrets):

   `POST http://127.0.0.1:3099/api/admin/audit/verify-chain` via desktop admin API (admin JWT + MFA).

5. **Document** — date, backup used, pass/fail, issues filed.

### Failure actions

- If restore fails: open Supabase support ticket; do not delete production until root cause is known.
- If chain verify fails on restore: treat as data integrity incident; compare `audit_chain_state` vs last `audit_events.row_hash`.

## Auth sessions

- Configure **Auth session lifetime** under **Authentication → Settings** in Supabase.
- BFF API sessions: `api_user_sessions` (refresh hash server-side; cookies `jb_at` / `jb_sid`).
- Application device rows: `user_device_sessions` purged by Nest cron (`MAINTENANCE_DEVICE_SESSION_DAYS`, default 90).

## Secret rotation

Rotate on compromise, staff offboarding, or at least annually for production.

| Secret | Where | Effect of rotation |
|--------|--------|-------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → API | Regenerate; update Nest env; old key invalid immediately |
| Supabase JWT secret | Authentication → JWT | All user JWTs invalidated; users re-login |
| `SESSION_COOKIE_SECRET` | Nest `.env` | All BFF sessions invalid; users call `POST /api/auth/session` again |
| `AUDIT_CHAIN_SECRET` | Nest `.env` | Does not rewrite history; new events use new key; document in incident log |
| Stripe webhook secret | Stripe Dashboard | Update Nest; missed events until aligned |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile | Update Nest + PWA site key pair |
| `AUDIT_CHAIN_SECRET` / Sentry DSN | respective dashboards | Update env only |

**Procedure:** stage new values → deploy API/PWA → verify login + webhook + audit chain verify → revoke old keys.

## Environment variables (Nest)

```env
MAINTENANCE_DEVICE_SESSION_DAYS=90
MAINTENANCE_STORAGE_ORPHAN_GRACE_DAYS=7
AUDIT_RETENTION_TELEMETRY_DAYS=90
ENGAGEMENT_RETENTION_DAYS=90
```

## Table size monitoring

Run in Supabase SQL editor before/after engagement retention or dedupe migrations:

```sql
SELECT relname AS table_name,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
       n_live_tup AS est_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 25;
```

Expect `job_impressions` and `search_query_logs` among larger tables when list traffic is high.

## Reclaim disk after `job_impressions` dedupe

1. Apply migration `20260530160000_job_impressions_dedupe_and_unique.sql` and deploy Nest (upsert on `POST /api/jobs/impressions`).
2. Confirm daily retention cron runs (`AuditRetentionService` at 03:00 — purges `job_impressions` and `search_query_logs`).
3. Reclaim dead tuples:

   ```sql
   VACUUM (ANALYZE) public.job_impressions;
   VACUUM (ANALYZE) public.search_query_logs;
   ```

4. If on-disk size remains high after `VACUUM`, schedule `VACUUM FULL` on `job_impressions` during a maintenance window (exclusive lock).

## Related

- [database-schema-conventions.md](./database-schema-conventions.md)
- [DEPLOYMENT.md](../DEPLOYMENT.md)
