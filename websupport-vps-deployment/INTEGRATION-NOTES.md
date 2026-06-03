# Integration Notes For Main Backend

These notes are not applied automatically because this task requested all changes in a separate folder from the main codebase.

## Environment Validation

The backend has partial validation but no centralized `ConfigModule` schema. Add a `validate` function to `backend-ts/src/app.module.ts` or a separate `backend-ts/src/config/env.validation.ts`.

Minimum production-required variables:

```text
NODE_ENV
PORT
CORS_ORIGINS
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ANON_KEY
PUBLIC_API_URL
PUBLIC_APP_URL
TYPESENSE_HOST
TYPESENSE_API_KEY
CHAT_CONTENT_ENCRYPTION_KEY
METRICS_BEARER_TOKEN
AUDIT_CHAIN_SECRET
NOTIFICATION_PREFERENCE_TOKEN_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

Optional variables should be accepted as empty strings but validated when present: SMTP, MailerLite, Twilio, Sentry, Redis, ClamAV, and optional Typesense tuning.

Do not print values on failure. Print only variable names and expected shape.

## Typesense Reindex

Existing command:

```bash
cd backend-ts
npm run search:reindex
```

Production container command:

```bash
node dist/scripts/backfill-typesense.js
```

Current limitation: `src/scripts/backfill-typesense.ts` fetches IDs in pages but stores all IDs before indexing. For large production tables, change it to process each fetched page immediately.

Expected behavior for the safer version:

- Read `job_offers`, `profiles`, and `sk_education_institutions` in pages.
- Index each page before fetching the next page.
- Keep the existing schema/upsert behavior in `TypesenseService` and `SearchIndexingService`.
- Do not delete/recreate collections unless an explicit destructive flag such as `--recreate-collections` is passed.
- Log counts and page offsets only, never private user content.
- Exit non-zero if any records fail.

No table/field guessing is needed because the backend already defines the collection names and transformations.
