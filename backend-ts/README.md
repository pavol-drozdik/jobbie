# JOBBIE API (NestJS)

TypeScript/NestJS rewrite of the JOBBIE backend. Same API surface as the Python FastAPI app.

## Setup

1. Copy `.env.example` to `.env` and set:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_JOB_POST`
2. Install and run:
   - `npm install`
   - `npm run start:dev` (development) or `npm run build` then `npm run start:prod`

## Endpoints

- `GET /health` — health check
- `GET /api/auth/me` — current user (Bearer JWT, Supabase JWKS)
- `GET|PATCH /api/profiles/me`
- `GET /api/plans`, `GET /api/plans/me`
- `GET|POST /api/jobs`, `GET|PATCH /api/jobs/:id`, `POST /api/jobs/:id/activate`
- `GET|POST /api/applications`, `GET /api/applications/:id`
- `POST /api/chat/rooms?application_id=`, `GET /api/chat/rooms`, `POST /api/chat/messages`, `GET /api/chat/rooms/:room_id/messages`
- `POST /api/payments/checkout-session`, `POST /api/payments/checkout-subscription`, `POST /api/payments/webhook` (raw body for Stripe signature)

CORS allows all origins. Point your Flutter app at the same base URL and paths as before.
