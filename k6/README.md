# k6 load tests (JOBBIE)

k6 drives HTTP/WebSocket load and reports latency, errors, and throughput. **It does not measure server RAM/CPU** — run scripts while watching your host (Railway, `docker stats`, etc.) to size resources.

## Prerequisites

Install [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) (v0.49+ recommended for `--env-file`).

## Real URLs and secrets

1. Copy `k6/.env.example` → `k6/.env` (root `.gitignore` already ignores `.env`).
2. Set **`BASE_URL`** to your Nest origin (no trailing slash). You may paste the same value as `NUXT_PUBLIC_API_BASE_URL`; a trailing `/api` is stripped automatically.
3. Set **`FRONTEND_URL`** for `frontend-smoke.js`.
4. For chat scripts, set **`API_JWT`** (Supabase `access_token`) and **`CHAT_ROOM_ID`** (UUID from `/chat/[roomId]`). Use **staging** when sending messages — every iteration **writes** chat rows.

```bash
k6 run --env-file k6/.env k6/backend-smoke.js
k6 run --env-file k6/.env k6/chat-http-stress.js
k6 run --env-file k6/.env k6/chat-socket-stress.js
```

Without `--env-file`, pass vars inline: `-e BASE_URL=https://… -e API_JWT=…`.

## Scripts

| Script | What it hits |
|--------|----------------|
| `backend-smoke.js` | Low VU marketplace + **short** fixed sleeps (quick smoke) |
| `backend-sustained.js` | Staged 50 → 100 VUs, **realistic delays** |
| `backend-flat-75.js` | Flat 75 VUs, 5 min, **realistic delays** |
| `backend-stress.js` | Aggressive ramp to 500 VUs (staging), **realistic delays** |
| `frontend-smoke.js` | `GET /` and `GET /app/find` on `FRONTEND_URL` |
| `chat-http-stress.js` | `GET /api/chat/rooms`, messages, **`POST /api/chat/messages`** |
| `chat-socket-stress.js` | Socket.IO `/socket.io` (join_room, typing, **`message`**) — same persistence as HTTP send |

## Realistic delays

`backend-stress.js`, `backend-sustained.js`, and `backend-flat-75.js` use **random start jitter** (default up to **32s**) and **random think times** between HTTP steps so many VUs stay closer to human pacing and are less likely to hit Nest’s **global** HTTP throttler (default **600 requests/minute per IP**).

Optional env (seconds): `K6_START_JITTER_MAX_SEC`, `K6_THINK_AFTER_DETAIL_MIN_SEC`, `K6_THINK_AFTER_DETAIL_MAX_SEC`, `K6_THINK_AFTER_FEATURED_MIN_SEC`, `K6_THINK_AFTER_FEATURED_MAX_SEC`, `K6_THINK_AFTER_TRENDING_MIN_SEC`, `K6_THINK_AFTER_TRENDING_MAX_SEC`, `K6_THINK_AFTER_SEARCH_MIN_SEC`, `K6_THINK_AFTER_SEARCH_MAX_SEC`, `K6_THINK_END_MIN_SEC`, `K6_THINK_END_MAX_SEC` (see `k6/.env.example`).

Chat scripts: `K6_CHAT_THINK_MIN_SEC` / `K6_CHAT_THINK_MAX_SEC` between iterations (defaults **4–18**s HTTP, **6–22**s socket).

## Environment variables

| Variable | Description |
|----------|-------------|
| `BASE_URL` | Nest API origin (optional `/api` suffix stripped) |
| `FRONTEND_URL` | Nuxt origin |
| `API_JWT` | Bearer token (with or without `Bearer ` prefix) |
| `CHAT_ROOM_ID` | Target room UUID for chat stress (optional for **HTTP** only: defaults to first room from list) |
| `SAMPLE_JOB_ID` | Optional job UUID for `GET /api/jobs/:id` |
| `HIT_THROTTLED_LIST` | Set `1` on `backend-sustained.js` to include `GET /api/jobs?q=…` (200/min throttle) |

See **Realistic delays** for optional `K6_*` variables.

## Throttling

Nest applies a **global** HTTP throttle (default **600 requests/minute per client IP**) on most routes; `/health` and a few others are excluded. Very high VU counts with **short** sleeps can still return **429** from one machine — increase think times via `K6_*` env vars if needed.

`GET /api/jobs` (including `?q=`) also has a **per-route** limit on the list handler. High-VU backend scripts avoid it unless `HIT_THROTTLED_LIST=1`.

## Safety

Prefer **staging** for stress and chat tests. Chat scripts create **real messages** in `chat_messages`. Avoid production unless you accept DB noise and token exposure risk.
