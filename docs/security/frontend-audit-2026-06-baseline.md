# Frontend security regression baseline (pre-hardening)

Recorded from codebase inspection on 2026-06-02. Use this checklist to verify behavior before/after the 30-phase hardening work.

## Authentication bootstrap

| Item | Observed behavior (baseline) |
|------|------------------------------|
| Login flow | Supabase `signIn` → `useAuth.syncSession()` → `POST /api/auth/session` with Bearer + body tokens → `persistBffSessionClientState(csrf)` → optional `clearPersistedSupabaseAuth()` when BFF establish succeeds |
| BFF cookie names | `jb_sid` (session id), `jb_at` (access JWT), `jb_refresh`, readable `jb_csrf` — see `backend-ts/src/auth/session/session.constants.ts` |
| Cookie path | HttpOnly session cookies use `Path=/api` (`session-cookie.service.ts`) — **not sent to `/socket.io` handshake** |
| CSRF | Double-submit: readable `jb_csrf` cookie + `X-CSRF-Token` on POST/PATCH/DELETE when BFF active (`csrf.guard.ts`, `useApi.ts`) |
| CSRF mirror | Full CSRF token stored in `sessionStorage` key `jobbie:bff-hint:v1` (`bff-session-hint.ts`) |
| Cold boot | `shouldRestoreBffOnColdBoot()` uses auth cache user id + BFF hint; `shouldPreferBffCookieAuth(false)` only when **no** in-memory bearer |

## Bearer vs cookie (Nest API)

| Item | Observed behavior (baseline) |
|------|------------------------------|
| `useApi` | Sends `Authorization: Bearer` when `resolveApiBearerToken(session)` exists and `shouldPreferBffCookieAuth(hasBearer)` is false — **Bearer wins when present** |
| `useCv` | All CV CRUD via `$fetch` + Bearer only; no cookies, no CSRF |
| `api-binary-fetch` | Bearer when token in memory |
| `bootstrap-auth-me` | Bearer to `/api/auth/me` |
| After BFF establish | `setApiBearerToken` + `session.value` still hold access token; Bearer continues on API calls |

## BFF refresh

| Item | Observed behavior (baseline) |
|------|------------------------------|
| Endpoint | `POST /api/auth/session/refresh` with `credentials: include` |
| Response JSON | `{ ok, access_token, refresh_token, csrf_token }` (`session.service.ts` ~197–203) |
| Frontend | `applyBffSessionRefreshBody` → `setApiBearerToken`, `session.value`, `supabase.auth.setSession` (persists to localStorage when remember-me) |
| Concurrency | **No mutex** — each 401 in `useApi` calls `refreshBffSessionFromApi` independently |
| Backend rotation | Atomic `refresh_token_hash` update; replay revokes session |

## Logout

| Item | Observed behavior (baseline) |
|------|------------------------------|
| Order | `logoutSession()` → audit POST with Bearer → clear memory → `clearCachedAuthSnapshot()` → `supabase.auth.signOut({ scope: 'local' })` |
| Missing | `clearPersistedSupabaseAuth()` **not** called in `signOut` |
| Sockets | Realtime plugin disconnects when bearer null; not explicit in `signOut` |
| Backend | `clearSessionCookies`; no `Clear-Site-Data` header observed |

## Socket.IO

| Item | Observed behavior (baseline) |
|------|------------------------------|
| Client | `io(baseUrl, { auth: { token: 'Bearer …' } })` — no `withCredentials` (`useRealtimeSocket.ts`) |
| Chat REST | `fetch` with Bearer for media-url (`useChatSocket.ts`) |
| Server | Token from `handshake.auth.token` / query / Authorization (`chat.gateway.ts`) — **no cookie parse** |

## Redirect helpers (duplicated)

| Location | Rule |
|----------|------|
| `login.vue`, `callback.vue`, `mfa.vue`, `RegisterSignupWizard.vue` | `startsWith('/') && !startsWith('//')` |
| `platba.vue` | **`startsWith('/')` only** — allows `//evil` |
| `session-expiry.ts` | Similar partial check |
| `AppNotificationBell.vue` | **No validation** — `navigateTo(item.link_path)` |
| Service worker `notificationclick` | External `https:` URLs can `openWindow` |

## Checkout / payments UI

| Item | Observed behavior (baseline) |
|------|------------------------------|
| Fulfilment | Server `POST /api/payments/confirm-*` (correct) |
| `nastavenia/kredity.vue` | Success flash if `success=1` or any `payment_intent=pi_*` **without** confirm API |
| Stripe query cleanup | Deleted after processing in checkout composables, not immediately on mount |

## CSP and headers (`nuxt.config.ts`)

| Header | Baseline value |
|--------|----------------|
| CSP script-src | `'self' 'unsafe-inline'` + Stripe, Turnstile, GTM, Clarity |
| CSP img-src | `'self' data: blob: https:` (wildcard https) |
| Missing | `object-src`, `frame-ancestors`, `upgrade-insecure-requests`, `worker-src`, report-only, nonces |
| HSTS | `max-age=31536000; includeSubDomains` (no preload) |
| Private routes | No `Cache-Control: private, no-store` on `/nastavenia/**`, `/chat/**`, etc. |

## Auth cache (`auth-cache.ts`)

| Field | Baseline |
|-------|----------|
| TTL | 7 days |
| PII | email, credits, company_name, roles in `localStorage` key `jobbie:auth:user-cache:v1` |

## Analytics

| Tool | Baseline |
|------|----------|
| PostHog identify | Includes `email`, `role`, `app_role` (`posthog-client.ts`) |
| Checkout events | May include `payment_intent_id` |
| GTM unload | `unloadGtm()` sets flag only; script remains (`gtm-client.ts`) |
| Audit / web-vitals | Not consent-gated |

## Dependencies (`package.json`)

| Package | Baseline |
|---------|----------|
| vue | `"latest"` |
| vue-router | `"latest"` |
| Lockfile | Present (`package-lock.json`) |

## Manual verification checklist (reproducible)

Run with Nest API on `:8000`, PWA on `:3001`, DevTools → Network (Preserve log).

### Login / session

1. Log in with password → note `POST /api/auth/session` Set-Cookie headers (`jb_sid`, `jb_at`, `jb_refresh`, `jb_csrf`).
2. Subsequent `GET /api/profiles/me` → check for `Cookie` and whether `Authorization: Bearer` is present (**baseline: often both**).
3. Mutating request → confirm `X-CSRF-Token` header.

### Refresh

4. Force 401 (expire `jb_at` in Application → Cookies) → trigger API call → count `POST /api/auth/session/refresh` requests under parallel load (**baseline: may be >1**).
5. Inspect refresh response body for `refresh_token` (**baseline: present**).
6. Inspect `localStorage` for `sb-*` keys after refresh with remember-me (**baseline: may update**).

### Logout

7. Sign out → inspect `localStorage` (`sb-*`, `jobbie:auth:user-cache:v1`), `sessionStorage` (`jobbie:bff-hint:v1`), cookies on API origin.
8. Repeat logout with Network offline (**baseline: partial cleanup possible**).

### Socket.IO

9. Open chat → WS handshake → inspect auth payload (**baseline: Bearer in auth object**).
10. Check Request Cookies on socket.io (**baseline: likely empty** due to `Path=/api`).

### Navigation safety

11. Visit `/platba?return=//evil.example` → complete or cancel checkout → observe navigation target.
12. Trigger notification with crafted `link_path` (staging/admin) or mock API response.
13. Push notification with `url: https://evil.example` → click (**baseline: may open external**).

### Links

14. Employer CV detail with `linkedin_url=javascript:alert(1)` if backend allows → click link behavior.

### Payments UI

15. Open `/nastavenia/kredity?payment_intent=pi_fake` without paying → observe flash message (**baseline: success text**).
16. Real credit purchase → confirm balance only after API confirm.

### Headers

17. `curl -I https://<host>/nastavenia/kredity` → Cache-Control.
18. `curl -I https://<host>/` → Content-Security-Policy.

### Analytics

19. Accept cookies → PostHog identify in network payload.
20. Deny analytics → verify GTM script still in DOM (**baseline: may remain**).

### Capacitor

21. Inspect `.output/public/index.html` for CSP meta (**baseline: absent**).

---

## Post-hardening

After implementation, re-run this checklist and fill a “after” column in `docs/security/frontend-implementation-summary.md`.
