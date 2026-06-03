# Repository Inspection

Scope inspected: `backend-ts/`, existing docs, existing GitHub workflows, and the starter ZIP.

1. Node.js version expected:
   - CI currently uses Node `20` in `.github/workflows/backend-ci.yml`.
   - Existing backend Dockerfile uses `node:22-bookworm-slim`.
   - `backend-ts/package.json` has `@types/node` `^20.0.0` and no `engines` field.
   - Deployment bundle uses Node `22` because Node 20 is past support by 2026-06-03 and the existing Dockerfile already builds on Node 22.

2. Package manager: npm.
   - Lockfile: `backend-ts/package-lock.json`.

3. Production build command:
   - `cd backend-ts && npm run build`
   - Script: `nest build`.

4. Production start command:
   - `cd backend-ts && npm run start:prod`
   - Script: `node dist/main`.
   - Container command in this bundle: `node dist/main.js`.

5. NestJS server port:
   - Default `8000`, configurable with `PORT`.
   - Source: `backend-ts/src/main.ts`.

6. Environment validation:
   - Partial only.
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` fail in `SupabaseService`.
   - Production `CORS_ORIGINS` fails fast in `main.ts`.
   - `ConfigModule.forRoot()` has no centralized validate/schema function.

7. Typesense integration:
   - Exists.
   - Files include `backend-ts/src/search/typesense.service.ts`, `backend-ts/src/search/search-indexing.service.ts`, and `backend-ts/src/scripts/backfill-typesense.ts`.
   - Existing reindex command: `npm run search:reindex`.

8. Supabase integration:
   - Exists.
   - Files include `backend-ts/src/supabase/supabase.service.ts` and `backend-ts/src/supabase/supabase.module.ts`.

9. Existing Docker/Compose/CI/deployment docs:
   - Existing backend Dockerfile: `backend-ts/Dockerfile`.
   - Existing CI workflows: `.github/workflows/backend-ci.yml`, `.github/workflows/codeql.yml`, `.github/workflows/pwa-bundle-budget.yml`.
   - Existing deployment docs: `DEPLOYMENT.md`, `docs/deployment.md`.
   - No production Compose file was found in the inspected repository file list.

10. Secrets committed risk:
   - The repository contains committed environment files. Values were not printed.
   - Files and variable names observed:
     - `backend-ts/.env`: `PUBLIC_API_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRODUCT_ID_CREDITS`, `STRIPE_PRICE_ID_CREDITS`, `DEBUG`, `TYPESENSE_PROTOCOL`, `TYPESENSE_HOST`, `TYPESENSE_PORT`, `TYPESENSE_API_KEY`, `TYPESENSE_COLLECTION_JOBS`, `TYPESENSE_COLLECTION_PROFILES`, `TYPESENSE_JOBS_EMBED_MODEL`, `TYPESENSE_JOBS_NUM_TYPOS`, `TYPESENSE_JOBS_DROP_TOKENS_THRESHOLD`, `SEARCH_REINDEX_CONCURRENCY`, `TURNSTILE_SECRET_KEY`, `CHAT_CONTENT_ENCRYPTION_KEY`, `RESEND_API_KEY`, `RESEND_FROM`, `PUBLIC_APP_URL`, `SEARCH_ANALYTICS_SECRET`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `METRICS_BEARER_TOKEN`, `AUDIT_CHAIN_SECRET`, `AUDIT_API_SAMPLE_RATE`, `AUDIT_RETENTION_TELEMETRY_DAYS`, `AUDIT_RETENTION_FINANCIAL_YEARS`, `CORS_ORIGINS`, `SESSION_COOKIE_SECRET`, `SESSION_ACCESS_TTL_SECONDS`, `SESSION_REFRESH_TTL_DAYS`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `MAILERLITE_API_KEY`, `MAILERLITE_GROUP_ID`.
     - `app-pwa/.env`: `NUXT_PUBLIC_API_BASE_URL`, `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY`, `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NUXT_PUBLIC_TURNSTILE_SITE_KEY`, `NUXT_PUBLIC_ENTERPRISE_OAUTH_PROVIDER`, `NUXT_PUBLIC_WEB_VITALS_SAMPLE_RATE`, `NUXT_PUBLIC_AUDIT_CLIENT_EVENTS`, `NUXT_PUBLIC_AUDIT_CLIENT_SAMPLE_RATE`, `NUXT_PUBLIC_SENTRY_DSN`, `NUXT_PUBLIC_SENTRY_ENVIRONMENT`, `NUXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, `NUXT_PUBLIC_POSTHOG_KEY`, `NUXT_PUBLIC_POSTHOG_HOST`, `NUXT_PUBLIC_POSTHOG_DEFAULTS`.
     - `k6/.env`: `BASE_URL`, `FRONTEND_URL`, `API_JWT`, `CHAT_ROOM_ID`, `SAMPLE_JOB_ID`.
     - `jobbie-admin/api/.env`: `ADMIN_API_PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `AUDIT_CHAIN_SECRET`, `SEARCH_ANALYTICS_SECRET`.
     - `jobbie-admin/app/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_API_URL`.

Security note: even if current values are placeholders or test values, committed `.env` files should be removed from Git history where appropriate, and any real keys that ever appeared in them should be rotated.
