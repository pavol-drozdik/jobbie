# JOBBIE

A Slovak job marketplace where **companies** post job offers and service listings, and **job seekers** browse, apply, build CVs, receive email alerts, and chat with employers.

## Stack

| Layer | Technology |
|-------|------------|
| **Web / mobile app** | Nuxt 3 PWA ([`app-pwa/`](app-pwa/)), optional Capacitor |
| **API** | NestJS ([`backend-ts/`](backend-ts/)) |
| **Database & auth** | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| **Payments** | Stripe (credit packs and subscriptions) |
| **Search** | Typesense (jobs) |

Full documentation: **[`docs/README.md`](docs/README.md)**

## Project structure

```
JOBBIE/
├── app-pwa/          # Nuxt 3 SPA + PWA (primary UI)
├── backend-ts/       # NestJS API (port 8000)
├── jobbie-admin/     # Desktop admin panel (Electron, local only)
├── supabase/         # SQL migrations
├── docs/             # Technical documentation
├── .cursor/rules/    # Cursor agent rules
└── README.md
```

## Quick start (local)

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply migrations in [`supabase/migrations/`](supabase/migrations/) in timestamp order.
3. Configure Auth redirect URLs for your PWA origin (e.g. `http://localhost:3001/auth/callback` and `http://localhost:3001/auth/reset-password`). Set Site URL to the origin root. See [docs/auth-security.md](docs/auth-security.md).

See [docs/database-schema-conventions.md](docs/database-schema-conventions.md) and [docs/deployment.md](docs/deployment.md).

### 2. Backend API

```bash
cd backend-ts
npm install
cp .env.example .env   # set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.
npm run start:dev
```

API: `http://localhost:8000` (global prefix `/api`).

### 3. PWA

```bash
cd app-pwa
npm install
cp .env.example .env   # set NUXT_PUBLIC_API_BASE_URL, Supabase keys
npm run dev
```

App: `http://localhost:3001` (proxies `/api` to the backend in dev).

## Main flows

- **Company:** Register → create job or firm ad → publish (credits / plan limits) → manage applicants → chat.
- **Job seeker:** Register → browse/search jobs → apply → CV builder → job email alerts → chat.
- **Billing:** Credit packs and subscription plans via Stripe; ledger in Postgres — see [docs/payments-credits.md](docs/payments-credits.md).

## Documentation

| Topic | Doc |
|-------|-----|
| Overview & inventory | [docs/README.md](docs/README.md) |
| Architecture | [docs/architecture.md](docs/architecture.md) |
| Security | [docs/auth-security.md](docs/auth-security.md), [docs/SECURITY.md](docs/SECURITY.md) |
| Deployment | [docs/deployment.md](docs/deployment.md) |
| Changelog | [docs/changelog.md](docs/changelog.md) |

## License

Private / your choice.
