# Supabase Auth email templates (JOBBIE)

Branded HTML templates aligned with the **auth / login card** (`pages/auth/login.vue`, `Jobbie design/login.html`): mint page `#f2faf4`, 24px white card with `0 8px 40px` shadow, green gradient header (`155deg, #15803d → #22c55e`), white wordmark (`/jobbielogowhite.svg`), 32px extrabold headings with green accent, 17px muted body, 56px full-width pill CTA.

## Where to configure

**Supabase Dashboard → Authentication → Email Templates**

For each template type, paste the **Subject** and **Body** from the table below. Body HTML lives in [`email-templates/`](./email-templates/).

| Supabase template | File | Subject (sk) |
|-------------------|------|--------------|
| Confirm sign up | [`confirm-signup.html`](./email-templates/confirm-signup.html) | `Potvrďte svoj e-mail — JOBBIE` |
| Invite user | [`invite-user.html`](./email-templates/invite-user.html) | `Pozvánka do JOBBIE` |
| Magic link | [`magic-link.html`](./email-templates/magic-link.html) | `Prihlásenie do JOBBIE` |
| Change email address | [`change-email.html`](./email-templates/change-email.html) | `Potvrďte novú e-mailovú adresu — JOBBIE` |
| Reset password | [`reset-password.html`](./email-templates/reset-password.html) | `Obnovenie hesla — JOBBIE` |
| Reauthentication | [`reauthentication.html`](./email-templates/reauthentication.html) | `Overenie identity — JOBBIE` |

## PKCE and `token_hash` (required)

The PWA uses PKCE (`flowType: 'pkce'`). Default `{{ .ConfirmationURL }}` links require opening the email in the **same browser** where the action was started.

Templates use `token_hash` query params so links work across devices and mail apps:

| Flow | Landing path | `type` |
|------|--------------|--------|
| Signup confirmation | `/auth/callback` | `signup` |
| Invite | `/auth/callback` | `invite` |
| Magic link | `/auth/callback` | `magiclink` |
| Email change | `/auth/callback` | `email_change` |
| Password reset | `/auth/reset-password` | `recovery` |
| Reauthentication | *(OTP code only — `{{ .Token }}` in app)* | — |

[`pages/auth/callback.vue`](../app-pwa/pages/auth/callback.vue) calls `verifyOtp({ token_hash, type })` for callback flows; reset uses [`bootstrap-password-recovery-session.ts`](../app-pwa/utils/bootstrap-password-recovery-session.ts).

## Redirect URLs

Add for **each** environment (Authentication → URL configuration):

- `{origin}/auth/callback`
- `{origin}/auth/reset-password`

Set **Site URL** to the PWA origin (e.g. `https://jobbie.sk` or `http://localhost:3001`).

## Reset password (reference)

PWA passes `redirectTo` from `resetPasswordForEmail`:

```ts
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/auth/reset-password`,
})
```

Template CTA uses `{{ .RedirectTo }}` when the PWA passes `redirectTo`, otherwise `SiteURL`:

```html
{{ or .RedirectTo (printf "%s/auth/reset-password" .SiteURL) }}?token_hash={{ .TokenHash }}&type=recovery
```

## Magic link / OTP

[`magic-link.html`](./email-templates/magic-link.html) includes both the `token_hash` link and `{{ .Token }}` for OTP mode. Reauthentication is code-only ([`reauthentication.html`](./email-templates/reauthentication.html)).

## Testing checklist

1. Paste template + subject into Supabase Dashboard.
2. Trigger each flow (signup, invite, magic link, email change, reset, reauth).
3. Open the email on a **different device** than the browser that started the flow.
4. Confirm landing page establishes a session (callback → home, reset → new-password form).
5. Expired links show a friendly error, not a blank page.

See [docs/auth-security.md](../docs/auth-security.md) for the full auth runbook.
