# Supabase passkeys (WebAuthn) for JOBBIE

The PWA registers passkeys via `supabase.auth.registerPasskey()`.

**Sign-in:** `/auth/login` uses WebAuthn **Conditional UI** — passkeys appear in the email field autofill (`autocomplete="username webauthn"`). There is no separate passkey button and no modal account picker on page load. Password and Google sign-in remain unchanged.

## Errors

| Message | Cause |
|---------|--------|
| `Passkeys are disabled` | WebAuthn enrollment off in Dashboard |
| `Credential verification failed` | **RP ID** or **Allowed origins** do not match the browser URL |

## Hosted project (Supabase Cloud)

1. Dashboard → project matching `NUXT_PUBLIC_SUPABASE_URL`.
2. **Authentication** → **Configuration** → **Multi-Factor Authentication** (or **Passkeys**).
3. **WebAuthn / Passkeys** → **Enabled** (not only Verify Enabled).
4. Configure **Relying Party ID** and **Allowed origins** (see below).
5. **Save**.

### Relying Party ID (RP ID)

- Bare domain only: `jobbie.sk`, `localhost`, or `127.0.0.1`.
- No `https://`, no port, no path.
- The page hostname must match or be a **subdomain** of the RP ID (e.g. RP ID `jobbie.sk` works for `https://app.jobbie.sk`).

### Allowed origins

- Full origins, comma-separated: `https://jobbie.sk`, `https://www.jobbie.sk`.
- **Local dev:** exact browser origin including port, e.g. `http://localhost:3001` (JOBBIE PWA dev server).
- Use **either** `localhost` **or** `127.0.0.1` consistently (not both in the same session).

| You open in browser | RP ID | Allowed origins (example) |
|---------------------|-------|---------------------------|
| `http://localhost:3001` | `localhost` | `http://localhost:3001` |
| `http://127.0.0.1:3000` | `127.0.0.1` | `http://127.0.0.1:3000` |
| `https://jobbie.sk` | `jobbie.sk` | `https://jobbie.sk` |

Also set **Authentication → URL configuration → Site URL** to your primary app URL (e.g. `https://jobbie.sk`). Passkeys pre-fill from Site URL but **must** match where users actually open the app.

## Local Supabase CLI

```toml
[auth.mfa.web_authn]
enroll_enabled = true
verify_enabled = true
```

Restart: `supabase stop` && `supabase start`.

## MFA (TOTP) + passkeys

If TOTP is enabled, enrollment may require a fresh **AAL2** session. The PWA prompts for your authenticator code before `registerPasskey` when needed.

## Verify

Browser console (signed in):

```js
await supabase.auth.registerPasskey()
```

Should return passkey metadata, not `Credential verification failed`.

## Related

- Password reset email template (PKCE / `token_hash`): [AUTH-EMAIL-TEMPLATES.md](./AUTH-EMAIL-TEMPLATES.md)
