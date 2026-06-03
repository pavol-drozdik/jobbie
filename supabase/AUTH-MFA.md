# Supabase MFA (TOTP) for JOBBIE

The PWA enrolls TOTP via `supabase.auth.mfa.enroll()`. GoTrue returns **`MFA enroll is disabled for TOTP`** when enrollment is turned off in project config.

## Hosted project (Supabase Cloud)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → the **same project** as `NUXT_PUBLIC_SUPABASE_URL` in `app-pwa/.env`.
2. **Authentication** → **Configuration** → **Multi-Factor Authentication**.
3. Under **TOTP (App Authenticator)**, open the dropdown. Supabase has **three** modes:

| Dashboard value | `enroll_enabled` | `verify_enabled` | JOBBIE “Zapnúť TOTP” |
|-----------------|------------------|------------------|----------------------|
| **Enabled** | yes | yes | Works (QR + enroll) |
| **Verify Enabled** | **no** | yes | Fails: `MFA enroll is disabled for TOTP` |
| **Disabled** | no | no | Fails |

4. Set TOTP to **Enabled** (not only **Verify Enabled**). **Verify Enabled** is for accounts that already have TOTP — it allows login challenge, not new enrollment.
5. Click **Save changes** on the **TOTP** card (separate from SMS MFA / Enhanced MFA Security).
6. Retry **Zapnúť TOTP** in the app.

## Local Supabase CLI

CLI defaults set `auth.mfa.totp.enroll_enabled = false`. After `supabase init`, merge from [`config.toml.example`](./config.toml.example) into `supabase/config.toml`:

```toml
[auth.mfa.totp]
enroll_enabled = true
verify_enabled = true
```

Then restart Auth:

```bash
supabase stop
supabase start
```

## Verify

From the browser console (logged-in user):

```js
await supabase.auth.mfa.enroll({ factorType: 'totp' })
```

Should return a QR code, not `MFA enroll is disabled for TOTP`.
