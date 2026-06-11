# Google Sign-In branding (Supabase Auth)

Google’s consent screen shows **“Sign in to continue to …”** using the **OAuth callback host** (Supabase Auth), not the PWA marketing origin. JOBBIE’s PWA already sets `redirectTo` to `{origin}/auth/callback` in [`login.vue`](../app-pwa/pages/auth/login.vue) and [`RegisterSignupWizard.vue`](../app-pwa/components/auth/RegisterSignupWizard.vue); that only controls where users land **after** Google approves sign-in.

Use this runbook to replace the raw `*.supabase.co` hostname with verified **JOBBIE** branding (free tier) or, after upgrading Supabase, a custom auth subdomain.

## Outcomes by tier

| Goal | Free tier (Google brand verification) | Pro + [Custom Domain](https://supabase.com/docs/guides/platform/custom-domains) |
|------|--------------------------------------|----------------------------------------------------------------------------------|
| Show **JOBBIE** name + logo on consent screen | Yes | Yes |
| Replace `*.supabase.co` in “continue to” line | No (may appear in expanded details) | Yes → e.g. `auth.jobbie.sk` |
| Show exact apex `jobbie.sk` on Google screen | No | No (subdomain only) |
| App code changes | None | Env + Google redirect URI only |

---

## 1. Google Auth Platform — branding

**Console:** [Google Cloud Console](https://console.cloud.google.com/) → same project as your OAuth client → **Google Auth Platform** → **Branding**.

| Field | Production value |
|-------|------------------|
| App name | `JOBBIE` (or `NUXT_PUBLIC_BRAND_NAME`) |
| User support email | `ahoj@jobbie.sk` (or `NUXT_PUBLIC_SUPPORT_EMAIL`) |
| App logo | Square PNG/JPG (follow Google size guidelines) |
| Application home page | `https://jobbie.sk` |
| Privacy policy | `https://jobbie.sk/ochrana-osobnych-udajov` |
| Terms of service | `https://jobbie.sk/vseobecne-podmienky` |

### Authorized domains

1. **Google Auth Platform → Branding → Authorized domains** → add `jobbie.sk`.
2. Verify ownership in [Google Search Console](https://search.google.com/search-console) (DNS TXT or HTML file on `jobbie.sk`).

Legal pages must be reachable at the URLs above before submitting for verification (`NUXT_PUBLIC_LEGAL_PUBLISHED=1` on production if terms/privacy are gated — see [deployment.md](../docs/deployment.md)).

---

## 2. OAuth client — origins and redirect URIs

**Console:** **Google Auth Platform → Clients** → your **Web application** client (the one whose Client ID + Secret are in Supabase Dashboard → **Authentication** → **Providers** → **Google**).

### Authorized JavaScript origins

| Environment | Origin |
|-------------|--------|
| Production | `https://jobbie.sk` |
| Local dev | `http://localhost:3001` (or your Nuxt dev port) |

Remove localhost origins before submitting for **external** user verification if Google requires a production-only app.

### Authorized redirect URIs

**Required** — Supabase Auth callback (copy exact URL from Supabase Dashboard → **Authentication** → **Providers** → **Google**):

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Example shape: `https://rrhrpozqvcecktcrrrop.supabase.co/auth/v1/callback` — use your project ref, not this placeholder.

**After Supabase Custom Domain** (Pro+), add a second URI (keep the `*.supabase.co` URI until cutover is complete):

```text
https://auth.jobbie.sk/auth/v1/callback
```

Do **not** put `https://jobbie.sk/auth/callback` in Google redirect URIs — that is the PWA PKCE landing page, not Google’s OAuth callback.

### Scopes (Data access)

Ensure these scopes are enabled (Supabase default):

- `openid`
- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`

Avoid adding sensitive/restricted scopes unless required — they trigger longer Google verification.

---

## 3. Supabase Dashboard — URL configuration

**Dashboard:** [Supabase](https://supabase.com/dashboard) → project matching `NUXT_PUBLIC_SUPABASE_URL` → **Authentication** → **URL configuration**.

| Setting | Production |
|---------|------------|
| **Site URL** | `https://jobbie.sk` |
| **Redirect URLs** | See checklist below |

### Redirect URL checklist

Add every origin you use (wildcards are supported where noted):

```text
https://jobbie.sk/auth/callback
https://jobbie.sk/auth/reset-password
http://localhost:3001/auth/callback
http://localhost:3001/auth/reset-password
```

Set **Site URL** to the PWA origin (`https://jobbie.sk`), not `/auth/login`.

### Local development (`localhost:3001`)

The PWA dev server runs on **port 3001** (`nuxt.config.ts`). Without the localhost redirect URLs above, Google OAuth and PKCE return to `/auth/callback` with an invalid redirect and login bootstrap fails.

| Check | Action |
|-------|--------|
| Supabase redirect URLs | `http://localhost:3001/auth/callback` and `http://localhost:3001/auth/reset-password` |
| Google OAuth client | Authorized JavaScript origin: `http://localhost:3001` |
| Nest API | `backend-ts` on port **8000** — PWA proxies `/api` in dev; if API is down you see *Backend API nebeží…* on login |
| Same browser | Open the Google link in the same browser/profile that started sign-in (PKCE code verifier) |

### Google provider credentials

**Authentication** → **Providers** → **Google**:

- Enable Google provider.
- Paste your **Client ID** and **Client Secret** from Google Cloud (not Supabase’s shared credentials).
- Note the **Callback URL** shown on this page — it must match the redirect URI in Google Cloud (section 2).

---

## 4. Brand verification and production test

### Submit for verification

1. **Google Auth Platform → Branding** — complete all fields; status should reach **Ready to publish**.
2. Click **Publish branding** after Google approves (verification can take several business days for external/test users).
3. If the app is in **Testing**, add test users under **Audience** or publish to **Production** when ready.

### Verification checklist (incognito)

1. Open `https://jobbie.sk/auth/login`.
2. Click **Prihlásiť sa cez Google** (or register wizard equivalent).
3. Confirm the consent screen shows **JOBBIE** and your logo as the primary label (not the Supabase project id string).
4. Complete sign-in → land on `https://jobbie.sk/auth/callback` → redirect to home or `?redirect=` target.
5. Repeat password reset flow if needed: email link should use `https://jobbie.sk/auth/reset-password` (see [AUTH-EMAIL-TEMPLATES.md](./AUTH-EMAIL-TEMPLATES.md)).

---

## 5. Optional — Supabase Custom Domain (Pro / Enterprise)

When you upgrade, add a subdomain (apex `jobbie.sk` is not supported):

1. **Dashboard → Project Settings → Custom Domains** — e.g. `auth.jobbie.sk` (DNS CNAME per Supabase wizard).
2. Add `https://auth.jobbie.sk/auth/v1/callback` to Google OAuth redirect URIs.
3. Update env (both can work during migration; prefer custom domain in frontend):

   | Variable | Value |
   |----------|--------|
   | `NUXT_PUBLIC_SUPABASE_URL` | `https://auth.jobbie.sk` |
   | `SUPABASE_URL` (API) | `https://auth.jobbie.sk` |

4. Rebuild/redeploy PWA and API. CSP in [`platform-csp.ts`](../app-pwa/utils/platform-csp.ts) picks up the new origin from `NUXT_PUBLIC_SUPABASE_URL`.
5. Retest Google sign-in — “continue to” should show `auth.jobbie.sk`.

---

## References

- [Supabase — Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google — Manage OAuth app branding](https://support.google.com/cloud/answer/15549049)
- [Supabase — Custom domains](https://supabase.com/docs/guides/platform/custom-domains)
- JOBBIE session and URL config: [auth-security.md](../docs/auth-security.md)
