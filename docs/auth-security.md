# Authentication and security

How JOBBIE authenticates users, protects the API, and where secrets live. For the full production checklist and new-endpoint template, see [SECURITY.md](./SECURITY.md).

## Authentication method

| Layer | Mechanism |
|-------|-----------|
| Identity | **Supabase Auth** — email/password, OAuth, MFA/TOTP |
| API access | **BFF session** — HttpOnly cookies after `POST /api/auth/session` |
| JWT verification | Supabase JWKS (ES256/RS256) in [`jwt-verify.service.ts`](../backend-ts/src/auth/jwt-verify.service.ts); legacy HS256 via `SUPABASE_JWT_SECRET` |

PWA login flow: Supabase PKCE → exchange tokens for API session → subsequent Nest calls use cookies.

### Google Sign-In (OAuth branding)

`signInWithOAuth({ provider: 'google' })` on [`login.vue`](../app-pwa/pages/auth/login.vue) redirects through **Supabase Auth** (`https://<project>.supabase.co/auth/v1/authorize`). Google’s consent screen therefore shows the Supabase callback host unless you change it via dashboard configuration — not in PWA code.

| Tier | Action |
|------|--------|
| **Free** | Google Cloud **brand verification** — consent screen shows **JOBBIE** + logo; `*.supabase.co` may still appear in secondary UI |
| **Pro + Custom Domain** | Supabase custom subdomain (e.g. `auth.jobbie.sk`) — “continue to” shows your subdomain; update `NUXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` and Google redirect URI |

Full checklist (Google Console, Supabase URL config, verification test): [`supabase/AUTH-GOOGLE-OAUTH.md`](../supabase/AUTH-GOOGLE-OAUTH.md).

## Session and token storage

### BFF cookies (Nest API)

Set by [`session-cookie.service.ts`](../backend-ts/src/auth/session/session-cookie.service.ts):

| Cookie | HttpOnly | Purpose |
|--------|----------|---------|
| `jb_at` | Yes | Short-lived access JWT |
| `jb_sid` | Yes | Session id |
| `jb_rt` | Yes | Refresh token handle |
| `jb_csrf` | **No** | CSRF double-submit token |

Flags: `Path=/api`, `SameSite=Lax`, `Secure` in production; optional `SESSION_COOKIE_DOMAIN`.

### Production session checklist (unexpected logout)

| Setting | Notes |
|---------|--------|
| Supabase Auth → JWT expiry | Default 3600s; values near **300s** cause frequent refresh — align with `SESSION_ACCESS_TTL_SECONDS` |
| `SESSION_ACCESS_TTL_SECONDS` | API env; should be ≥ Supabase access JWT lifetime (see `backend-ts/.env.example`) |
| `SESSION_COOKIE_DOMAIN` | Required when PWA and API are sibling hosts (e.g. `app.example.com` + `api.example.com` → `.example.com`) |
| `CORS_ORIGINS` | Must list the exact PWA origin(s); `credentials: true` |
| `NUXT_PUBLIC_API_BASE_URL` | Build-time PWA env; must match the API origin that sets `jb_*` cookies |

Symptoms: stay on the same URL but UI shows guest — usually 401 + stale Bearer before refresh fix; verify Network: `refresh` 200 then retry **200**, or redirect to login with `session_expired`.

**Hard refresh debug (DevTools → Network, preserve log):**

1. `POST /api/auth/session/refresh` — **401** → cookies not reaching the API (`NUXT_PUBLIC_API_BASE_URL`, `SESSION_COOKIE_DOMAIN`, `CORS_ORIGINS`).
2. `refresh` **200** then `GET /api/auth/me` **401** → guard/token mismatch (`SESSION_ACCESS_TTL_SECONDS` vs Supabase JWT expiry).
3. Both **200** but guest UI → PWA bootstrap bug (report with HAR).

**Page refresh:** After BFF bootstrap the PWA clears persisted Supabase keys; reload must call `POST /api/auth/session/refresh` with `credentials: 'include'` (HttpOnly `jb_rt` / `jb_sid`). `jb_csrf` is not visible in `document.cookie` on `/app/*` because cookies use `Path=/api` — cold boot uses `sessionStorage` hint ([`bff-session-hint.ts`](../app-pwa/utils/bff-session-hint.ts)) + auth cache (`shouldRestoreBffOnColdBoot()`). Auth plugin keeps `auth-loading` true until bootstrap finishes; failed restore clears the user only after [`confirmApiSessionDead()`](../app-pwa/utils/session-expiry.ts), then redirects with `session_expired`.

Server-side session rows: `api_user_sessions` (hashed refresh). Refresh uses `SUPABASE_ANON_KEY` in [`session.service.ts`](../backend-ts/src/auth/session/session.service.ts).

### PWA (Supabase client)

| Storage | Content |
|---------|---------|
| Custom auth storage | Supabase session for Auth + Realtime ([`supabase-auth-storage.ts`](../app-pwa/utils/supabase-auth-storage.ts)) |
| `localStorage` auth cache | Profile snapshot for fast boot ([`auth-cache.ts`](../app-pwa/utils/auth-cache.ts)) |
| `sessionStorage` BFF hint | CSRF token only (not secrets) for mutations after reload ([`bff-session-hint.ts`](../app-pwa/utils/bff-session-hint.ts)) |
| In-memory | Preferred for Realtime access token when avoiding persistence |

**Current production path:** After bootstrap, Nest mutations use **cookies + CSRF**. When `jb_sid` is present on the PWA origin (same-site / `SESSION_COOKIE_DOMAIN`), [`useApi()`](../app-pwa/composables/useApi.ts) omits `Authorization: Bearer` so a stale in-memory JWT cannot override refreshed `jb_at`.

**Supabase Auth UX (MFA, passkeys, `updateUser`):** Persisted Supabase tokens are cleared after BFF bootstrap; [`ensure-supabase-auth-session.ts`](../app-pwa/utils/ensure-supabase-auth-session.ts) and [`bff-session-refresh.ts`](../app-pwa/utils/bff-session-refresh.ts) call `POST /api/auth/session/refresh` (returns user JWTs in JSON) and `setSession` before `mfa.enroll` and similar calls.

**Session expiry:** On 401, `useApi()` refreshes cookies, applies tokens from the refresh body, retries once, then [`session-expiry.ts`](../app-pwa/utils/session-expiry.ts) signs out and redirects to `/auth/login?reason=session_expired` using a snapshot taken before the request (avoids “same page, logged out” when callers clear `user` after `fetchUser` fails).

**API guard:** [`SessionAuthGuard`](../backend-ts/src/auth/session-auth.guard.ts) accepts a valid Bearer **or** valid `jb_at` (expired Bearer does not block a fresh cookie after refresh).

**Do not** persist service role keys or Nest session secrets in the browser.

## Protected routes

### API (default deny)

- [`GlobalAuthGuard`](../backend-ts/src/auth/global-auth.guard.ts) on all routes unless:
  - `@Public()` — e.g. health, billing config, webhooks, token prefs
  - `@OptionalAuth()` — optional JWT for catalog with viewer-specific fields

### PWA

- `definePageMeta({ middleware: ['auth'] })` on private pages.
- Role middleware: `customer-only`, `worker-only`, `provider-only`, `admin`, dashboard variants (`customer_role` / `worker_role` / `provider_role` on `profiles`, not `profiles.role`).

Middleware and guards are **UX only** — backend must enforce the same rules.

## Roles and permissions

| Mechanism | Where |
|-----------|--------|
| `profiles.role` | `company` vs individual — enforced in services/controllers |
| `profiles.app_role` | `admin` — [`jobbie-admin/api`](../jobbie-admin/api) (`AppRoleGuard` + `AdminMfaGuard`) |
| `permission_scopes` | Derived from `app_role` + `extra_permission_scopes`; if `app_role` is still `user`, **`profiles.role = company` maps to employer scopes** for API checks (see `effectiveAppRoleForScopes` in [`scopes.ts`](../backend-ts/src/auth/scopes.ts)) |
| `profiles.account_status` | `active` / `suspended` / `closed` — `AccountStatusGuard` |

UI: [`useCan()`](../app-pwa/composables/useCan.ts) — hide/disable only; never sole authorization.

Scope check API: `GET /api/auth/scope-check`.

## MFA and step-up

**TOTP must be `Enabled` in Supabase Dashboard** (both enroll + verify). **`Verify Enabled` alone** sets `enroll_enabled = false` and breaks **Zapnúť TOTP** (`MFA enroll is disabled for TOTP`) — see [`supabase/AUTH-MFA.md`](../supabase/AUTH-MFA.md).

| Feature | Implementation |
|---------|----------------|
| User MFA | Supabase TOTP — [`pages/auth/mfa.vue`](../app-pwa/pages/auth/mfa.vue) |
| Admin routes | Desktop admin API (`jobbie-admin/api`) — `AdminMfaGuard` requires JWT claim `aal === 'aal2'` |
| Sensitive mutations | `@RequireRecentLogin()` — `api_user_sessions.last_step_up_at` within **15 minutes** |

Step-up endpoint: `POST /api/auth/session/step-up`. Fresh login (`POST /api/auth/session`) sets `last_step_up_at` for all users; step-up with `aal1` is allowed only when the account has no verified TOTP factor.

PWA: `useBillingStepUp().ensureRecentLoginForBilling()` before credit/subscription checkout.

Sensitive areas: billing changes, account delete, admin moderation, passkey management (see cursor rules).

## CSRF, CORS, and security headers

| Control | Location |
|---------|----------|
| CSRF | [`CsrfGuard`](../backend-ts/src/auth/csrf.guard.ts) — `jb_csrf` vs `X-CSRF-Token` on unsafe methods |
| CORS | `CORS_ORIGINS` — required in production ([`main.ts`](../backend-ts/src/main.ts)); allowlist only (never `*` or reflective `origin: true`). Regression tests in [`http-cors.util.spec.ts`](../backend-ts/src/common/http-cors.util.spec.ts). |
| API headers | `helmet` in `main.ts` |
| PWA CSP / HSTS / XFO / XSS | `platform-csp.ts` + Nitro `csp-nonce` + `security-headers` middleware (nonce + `strict-dynamic` in production; CSP on HTML only) |

### CORS verification (production / staging)

If a scanner reports `Access-Control-Allow-Origin: *`, identify the response URL:

1. **Nest API** — `OPTIONS` or `GET` with `Origin: https://evil.example` on `/api/*` must not return `*` or echo the evil origin. Confirm `CORS_ORIGINS` lists exact PWA origins (`https://jobbie.sk`, `https://www.jobbie.sk`). `GET /health` and `GET /api/seo/*` bypass CORS only when there is no `Origin` header (probes, Nitro sitemap/feed fetches); browser health probes from the PWA use the normal allowlist.
2. **PWA (Nitro)** — HTML and feeds should not send credentialed CORS headers; cross-origin reads are not intended.
3. **Supabase** — Dashboard → Project Settings → API: restrict **Additional Allowed Origins** to PWA origins (not `*`).
4. **CDN / reverse proxy** — ensure no `add_header Access-Control-Allow-Origin *` on app or API routes.

## Password reset

- Forgot-password on [`pages/auth/login.vue`](../app-pwa/pages/auth/login.vue): **Zabudol som heslo** opens an email-only step when the field is empty; after submit, a confirmation view with an optional **Open mailbox** button (known providers via `email-webmail-url.ts`). Calls `resetPasswordForEmail` with `redirectTo` → `{PWA_ORIGIN}/auth/reset-password` and optional `captchaToken` when Turnstile is configured.
- [`pages/auth/reset-password.vue`](../app-pwa/pages/auth/reset-password.vue) bootstraps recovery via [`bootstrap-password-recovery-session.ts`](../app-pwa/utils/bootstrap-password-recovery-session.ts): `verifyOtp({ type: 'recovery', token_hash })` (primary), auto-detect poll, then PKCE `code` exchange (same-browser fallback). Then `updateUser({ password })`, `POST /api/auth/sessions/revoke-all`, and local `signOut()`.
- `POST /api/auth/sessions/revoke-all` — same global logout after password change in settings (JWT + audit `auth.sessions.revoked_all`).
- OAuth and legacy links may still use [`pages/auth/callback.vue`](../app-pwa/pages/auth/callback.vue) with `?redirect=/auth/reset-password`.
- `PASSWORD_RECOVERY` in [`plugins/1.auth.client.ts`](../app-pwa/plugins/1.auth.client.ts) navigates to the reset page when Supabase fires that event.

### Supabase Auth email templates (PKCE)

The PWA uses PKCE. Default `{{ .ConfirmationURL }}` links fail when the email is opened outside the browser that started the flow. Branded HTML templates use `token_hash` + `type` query params (signup, invite, magic link, email change → `/auth/callback`; reset → `/auth/reset-password`).

Full subjects, HTML files, and dashboard checklist: [`supabase/AUTH-EMAIL-TEMPLATES.md`](../supabase/AUTH-EMAIL-TEMPLATES.md).

### Supabase Auth URL configuration

Add every environment origin to **Redirect URLs** (Authentication → URL configuration), for example:

**Production (`https://jobbie.sk`):**

- `https://jobbie.sk/auth/callback`
- `https://jobbie.sk/auth/reset-password`

**Local dev:**

- `http://localhost:3001/auth/callback`
- `http://localhost:3001/auth/reset-password`

Set **Site URL** to the PWA origin (production: `https://jobbie.sk`; local: e.g. `http://localhost:3001`), not only `/auth/login`.

Google OAuth uses a separate callback on Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`) — configure that in Google Cloud, not in this redirect list. See [`supabase/AUTH-GOOGLE-OAUTH.md`](../supabase/AUTH-GOOGLE-OAUTH.md).

If **Confirm email** is enabled in the Supabase project, users cannot `signInWithPassword` until the address is confirmed; the PWA shows a dedicated message (`loginEmailNotConfirmed`).

## Failed login and abuse

- `POST /api/auth/security/login-attempt` + `login_attempt_counters`
- Cloudflare Turnstile when `TURNSTILE_SECRET_KEY` / `NUXT_PUBLIC_TURNSTILE_SITE_KEY` configured — shared [`useTurnstileWidget`](../app-pwa/composables/useTurnstileWidget.ts) + [`AuthTurnstileWidget`](../app-pwa/components/auth/AuthTurnstileWidget.vue)
- **Login:** progressive widget (after failed attempt or when `login-status` returns `captcha_required`); `captchaToken` passed to Nest `login-status` / `login-attempt` and Supabase `signInWithPassword` when present
- **Register:** widget on wizard step 4; Nest `POST /api/auth/captcha/verify` then Supabase `signUp` with `captchaToken`
- **Forgot password:** widget on email step when keys configured; `resetPasswordForEmail` with `captchaToken`
- **Supabase Dashboard:** Authentication → Settings → Security → enable CAPTCHA (Turnstile) with the same secret as `TURNSTILE_SECRET_KEY` when enforcing server-side
- Generic error messages — no email enumeration (except safe cases such as unconfirmed email)
- `POST /api/reports` → `content_reports` + audit
- Global `@nestjs/throttler` (webhook and health excluded)

## Sensitive actions (summary)

| Action | Controls |
|--------|----------|
| Grant/spend credits | RPC only via `CreditsService`; Stripe webhook signature |
| Account delete | `POST /api/profiles/me/delete` + recent login |
| Data export | `GET /api/profiles/me/export` + throttle + audit |
| Admin suspend | Service role + audit |
| Storage upload | Auth + ownership + MIME sniff + throttle |

## Known security gaps and planned work

| Item | Status |
|------|--------|
| Malware scan on uploads | ClamAV via `CLAMAV_HOST`; production fail-closed when unset (see SECURITY.md) |
| Bearer fallback in PWA | Transition path; prefer cookies. Session routes use `jb_at` cookie when Bearer absent. |
| Login lockout reset | Only via `POST /api/auth/session` after JWT verify — not client `login-attempt` success |
| Chat E2EE | Optional encryption at rest with `CHAT_CONTENT_ENCRYPTION_KEY`; not full E2EE E2E |
| Passkeys | Supabase experimental in PWA plugin — TODO: verify production rollout |

## Recommended practices (already largely implemented)

- BFF HttpOnly cookies for API auth
- CSRF on mutations
- Short-lived access cookie (`SESSION_ACCESS_TTL_SECONDS`)
- MFA for admin (`aal2`)
- Step-up for high-risk mutations

For adding endpoints, use the template in [SECURITY.md](./SECURITY.md#adding-a-new-protected-endpoint).

## How to modify safely

1. Do not add `@Public()` without rate limits and response redaction review.
2. New PII in API responses → update [GDPR-PRIVACY.md](./GDPR-PRIVACY.md) and export service.
3. Session/cookie changes → update PWA `useApi` / `useBffSession` and this doc.
4. Log security-relevant changes in [changelog.md](./changelog.md).
