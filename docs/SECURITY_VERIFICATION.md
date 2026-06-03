# Security verification checklist

Run after deploying platform security changes.

## Automated

```sh
./scripts/security-check.sh
```

## Manual

| # | Requirement | How to verify |
|---|-------------|----------------|
| 1 | HTTPS | Production URL uses `https://`; HTTP redirects to HTTPS at CDN |
| 2 | HttpOnly cookies | DevTools → Application → Cookies: `jb_at`, `jb_sid`, `jb_rt` are HttpOnly |
| 3 | SameSite | Cookie flags include `SameSite=Lax` (prod `Secure`) |
| 4 | Security headers | `curl -I https://<pwa>` shows CSP, HSTS, X-Frame-Options |
| 5 | CSP | Browser console: no unexpected CSP blocks on login, Stripe, Turnstile; DM Sans `woff2` loads from `'self'` (`/_nuxt/`), not Google Fonts |
| 6 | Secrets not in repo | `git grep` for `service_role`, `sk_live`, private keys → none in tracked files |
| 7 | Env secrets | API starts with `SESSION_COOKIE_SECRET`, `AUDIT_CHAIN_SECRET` in prod |
| 8 | Admin MFA | Admin without TOTP → blocked from desktop admin API; with MFA → allowed |
| 9 | Step-up | `POST /api/profiles/me/delete` without recent step-up → 403 `step_up_required` |
| 10 | Failed login log | Wrong password → row in `auth_security_events`; 5 failures → lockout |
| 11 | Abuse report | PWA ⋮ → Nahlásiť on `/ponuka/:id` or `/profesionali/:id` → `POST /api/reports` → `content_reports` + audit; queue in admin Moderácia |
| 12 | Account suspend | Admin suspend → user gets 403 on API; sessions revoked |
| 13 | Admin audit | Desktop admin API `GET /api/admin/audit/events` returns data; chain verify passes |
| 14 | CSRF | `POST /api/...` with cookie session but no `X-CSRF-Token` → 403 |

## Database migration

Apply [supabase/migrations/20260622120000_platform_security_enforcement.sql](../supabase/migrations/20260622120000_platform_security_enforcement.sql) before enabling BFF sessions in production.
