# PWA frontend security implementation summary (2026-06)

Baseline: [frontend-audit-2026-06-baseline.md](./frontend-audit-2026-06-baseline.md).  
Plan: 30 phases (safe navigation → supply chain). Deploy **backend first**, then PWA (cookie path `/` for `jb_at`, refresh body, sockets).

## Phase matrix

| Phase | Area | Status | Key files |
|-------|------|--------|-----------|
| 1 | Baseline doc | Done | `docs/security/frontend-audit-2026-06-baseline.md` |
| 2 | Safe navigation | Done | `app-pwa/utils/safe-navigation.ts`, `.spec.ts` |
| 3 | External links | Done | CV modal, company ad contact, `sanitize-blog-html.ts`, backend `sanitize-external-url.util.ts` |
| 4 | Notifications + SW | Done | `AppNotificationBell.vue`, `sw.ts`, backend `notifications.service.ts`, `push-notification.service.ts` |
| 5 | Checkout / fake success | Done | `stripe-return-query.ts`, `kredity.vue`, `useCheckoutCredits.ts`, `useCheckoutSubscription.ts` |
| 6 | Cookie-only Nest API | Done | `bff-csrf-state.ts`, `useApi.ts`, `useAuth.ts`, `useCv.ts`, `api-binary-fetch.ts`, `session-auth.guard.ts` |
| 7 | Socket cookie auth | Done | `useRealtimeSocket.ts`, `session-cookie.service.ts`, `socket-auth.util.ts`, gateways |
| 8 | Refresh token exposure | Done | `bff-session-refresh.ts`, `session.service.ts` (no tokens in JSON) |
| 9 | Single-flight refresh | Done | `bff-refresh-single-flight.ts`, wired in API/session-expiry/auth plugin |
| 10 | Logout hardening | Done | `useAuth.ts` try/finally, `Clear-Site-Data` on backend logout |
| 11 | CSRF not in sessionStorage | Done | `bff-session-hint.ts` v2, CSRF from `jb_csrf` cookie only |
| 12 | Auth cache PII | Done | `auth-cache.ts` v2 (`id`, `appRole` only, 1h TTL) |
| 13–14 | Rich text + safe errors | Done | `rich-text-plain-length.ts`, TipTap load sanitize, `safe-user-messages.ts`, `AppHttpErrorPage.vue` |
| 15 | Pin dependencies | Done | `vue@^3.5.30`, `vue-router@^4.6.4`, `engines.node`, `audit:prod` |
| 16–17 | Route cache + headers | Done | `nuxt.config.ts` private `Cache-Control`, CSP/HSTS/COOP/CORP |
| 18 | CSP report-only | Done | Nitro report-only header + `POST /api/csp-report` |
| 19 | Capacitor CSP | Done | `NUXT_PUBLIC_CAPACITOR_BUILD=1` meta CSP, `capacitor.config.ts` `cleartext: false` |
| 20–22 | Analytics | Done | PostHog no email; GTM unload clears script/dataLayer; consent on audit + web-vitals |
| 23–24 | Uploads | Done | Removed CV `data_url` photo from PWA; chat `validateStorageUploadMetadata` |
| 25–29 | Account + OAuth + rel | Done | Delete step-up via `useBillingStepUp`; OAuth `code` stripped; `rel` on `target="_blank"` |
| 30 | Supply chain | Done | `.github/dependabot.yml` (existing); Turnstile `crossOrigin` on script load |

## Redirect / navigation coverage

| Surface | Mechanism |
|---------|-----------|
| Login, MFA, callback, register | `resolveSafeInternalPath` on `redirect` query |
| Platba return | Safe `return` query |
| Session expiry | `session-expiry.ts` stores safe path only |
| Notifications (in-app) | `AppNotificationBell` + backend `link_path` sanitize |
| Service worker push click | Same-origin + internal path only |
| Backend push payload | `sanitizeInternalLinkPath` on `url` |

## Auth / BFF

- **Nest calls:** When `hasActiveBffSession()`, cookies + `X-CSRF-Token`; no Bearer (except session bootstrap, step-up body, explicit `options.token`, public token routes).
- **Refresh:** `POST /api/auth/session/refresh` returns `{ ok, csrf_token }` only; no routine `supabase.auth.setSession`.
- **Sockets:** `withCredentials: true`; `jb_at` cookie `Path=/` on API host; gateway reads cookie before Bearer.
- **Guard:** With `jb_sid` + cookie, subject from cookie JWT (Bearer ignored unless conflicting `sub`).

## Verification commands

```bash
# PWA unit tests (safe-navigation, bff single-flight, …)
cd app-pwa && npm run test

# Production dependency audit
cd app-pwa && npm run audit:prod

# Manual smoke (staging)
# 1. Login → Network: Nest requests use cookies, no Authorization on /api/* (except /api/auth/session POST).
# 2. Open redirect: /auth/login?redirect=//evil → lands on / after login.
# 3. Credits return: /nastavenia/kredity?payment_intent=pi_fake → no success toast without confirm API.
# 4. Logout → cookies cleared; chat socket disconnects.
# 5. CSP report-only: check browser console / backend dev log for [csp-report] (non-prod).
```

## Deferred (per plan)

- **Enforcing CSP with nonces** — off by default; set `NUXT_CSP_NONCE_ENFORCE=1` only after report-only is clean (middleware skips dev and localhost API).
- **`useIsAuthenticated()`** rollout — composable added; migrate remaining `session.value?.access_token` checks incrementally.
- **Turnstile SRI** — Cloudflare `api.js` has no stable SRI hash; script uses pinned URL + `crossOrigin`.

## Deployment order

1. **backend-ts:** cookie path, refresh response, `Clear-Site-Data`, URL validation, CSP report, socket cookie auth.
2. **app-pwa:** immediately after (users may need one re-login for `jb_at` path change).
