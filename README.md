# JOBBIE

A platform where **companies** post job offers and **job seekers** can browse, apply, and chat. Backend uses **Supabase** (PostgreSQL, Auth), **TypeScript**, and **Socket.IO** for chat.

- **Backend**: TypeScript (NestJS) — auth (Supabase JWT), jobs, applications, Stripe payments, chat (Socket.IO)
- **Database & Auth**: Supabase (PostgreSQL, RLS, Realtime for chat)
- **Mobile / Web app**: Expo (React Native) — `app-rn/`
- **Payments**: Stripe (subscriptions and job publishing)

## Project structure

```
JOBBIE/
├── app-rn/           # Expo app (React Native + web)
├── backend-ts/       # NestJS API
├── supabase/         # SQL migrations
├── .gitignore
└── README.md
```

## Backend setup (`backend-ts`)

1. **Node 18+**. Install and run:

   ```bash
   cd backend-ts
   npm install
   ```

2. **Environment**: copy `backend-ts/.env.example` to `backend-ts/.env` and set:

   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API)
   - `JWT_JWKS_URI` or Supabase JWT verification (see backend auth module)
   - `STRIPE_*` keys if using payments

3. **Run**:

   ```bash
   npm run start:dev
   ```

   API runs at `http://localhost:3000` (or the port in `main.ts`). Global prefix is usually `api` (e.g. `GET /api/jobs`).

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the SQL in `supabase/migrations/` in order (SQL Editor or `supabase db push`):
   - `20250222000001_initial_schema.sql` — profiles, job_offers, applications, chat_rooms, chat_messages, RLS
   - Later migrations for profiles, job_offers extensions, subscription_plans, etc.
3. In Auth → URL Configuration, set Site URL and redirect URLs for your app.
4. Use the project URL and anon/service keys in `backend-ts/.env` and `app-rn/.env`.

## App setup (`app-rn`)

1. **Node 18+**. Install and run:

   ```bash
   cd app-rn
   npm install
   ```

2. **Environment**: copy `app-rn/.env.example` to `app-rn/.env` and set:

   - `EXPO_PUBLIC_API_BASE_URL` — backend API base (e.g. `http://localhost:3000` for dev)
   - Supabase keys if the app talks to Supabase directly (e.g. auth)

3. **Run**:

   ```bash
   npm start
   ```

   Then choose web, iOS simulator, or Android emulator. For web you may need a reachable API URL (e.g. tunnel or same network).

## Main flows

- **Company**: Register → Post job (with category, compensation, etc.) → Publish (subscription/limits apply) → See applications → Chat with applicants.
- **Job seeker**: Register → Browse and filter jobs → Apply → Chat with company from applications or job detail.
- **Chat**: One room per application; backed by Socket.IO and Supabase.

## License

Private / your choice.
