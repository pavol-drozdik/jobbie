# Transactional email (SMTP)

JOBBIE sends product email (job alerts, saved-search alerts, notification digests, employer applicant auto-replies) through a single Nest service: [`EmailService`](../backend-ts/src/email/email.service.ts) using **nodemailer** and your SMTP server.

Billing invoice PDFs are **not** sent this way — they use [Stripe Dashboard settings](./stripe-invoice-emails.md). Auth messages (signup, password reset, email confirm) use **Supabase Auth** SMTP settings in the Supabase project — **separate** from Nest `SMTP_*` below. Newsletter signups sync to **MailerLite** when `MAILERLITE_API_KEY` is set.

## Supabase Auth SMTP (password reset, signup confirm)

Configure in **Supabase Dashboard → Project → Authentication → [Emails](https://supabase.com/dashboard/project/_/auth/templates)** → **SMTP settings** (enable custom SMTP).

| Field | Notes |
|-------|--------|
| Host / port | Same relay as production mail (e.g. Websupport `smtp.m1.websupport.sk`, port `587` STARTTLS or `465` SSL). |
| Username | Usually the **full mailbox address** (`noreply@jobbie.sk`), not a short name. |
| Password | Mailbox password; re-enter after any hosting panel change. |
| Sender email | Must be an address the SMTP account is allowed to send as (often identical to username). |
| Sender name | e.g. `JOBBIE` |

**Redirect URLs** (Authentication → URL configuration): `{origin}/auth/reset-password`, `{origin}/auth/callback`. **Site URL** = PWA origin (`https://jobbie.sk` or `https://www.jobbie.sk` — match what users hit).

Branded bodies: [`supabase/AUTH-EMAIL-TEMPLATES.md`](../supabase/AUTH-EMAIL-TEMPLATES.md).

### Troubleshooting Auth email

| Symptom | Likely cause |
|---------|----------------|
| PWA: *Nepodarilo sa odoslať e-mail…*; Supabase log `535 5.7.8 authentication failed` | Wrong SMTP username/password, or username not full email. Fix credentials in Supabase SMTP settings. |
| Log `500: Error sending recovery email` | SMTP send failed after auth or template render — check Auth logs + SMTP test below. |
| Log `504` / `context deadline exceeded` (~10s) | Supabase cannot reach your SMTP host in time — wrong host/port, IPv6 hang, or **Websupport blocking cloud IPs**. Try `smtp.m1.websupport.sk` port `465`, or use Resend/SES for Auth SMTP. |
| API `recover` returns 200, no mail, no error | Unknown email (by design) or mail in spam — only test with a **registered** address. |
| Reset link wrong host | Add that origin to Redirect URLs; set `NUXT_PUBLIC_SITE_URL` to canonical apex/www. |

**Verify SMTP outside Supabase:** use the same host/user/pass in a desktop client or `SMTP_VERIFY_ON_BOOT=true` on Nest with matching `SMTP_*` env. If Nest sends but Supabase does not, only the **Supabase Dashboard** SMTP block is wrong.

**Websupport from Supabase (per domain):** Another `@other-domain.sk` mailbox on the same `smtp.m1.websupport.sk` can work while `@jobbie.sk` fails — compare **Webadmin → Emaily → schránka → Nastavenia** for the two domains:

| Setting | jobbie.sk check |
|---------|-----------------|
| **GEO ochrana** | If enabled, Supabase egress may be blocked (timeout `504`). Disable for test, or allow EU countries (Supabase EU projects). FLOWii docs mention allowing **Holandsko** for NL-hosted apps. |
| **SMTP protokol** | Must be **povolený** on the mailbox. |
| **Real mailbox** | `noreply@jobbie.sk` must be a full schránka, not only an alias/forward. |
| **Sender = login** | Supabase `smtp_user` and sender email must be the **same** mailbox address. |
| **Limits** | 300/h per mailbox, 2000/h per domain — over limit blocks ~60 min. |

If GEO/SMTP settings match the working domain and it still times out, use Resend for Auth SMTP (below).

**Resend (recommended for Auth):** verify `jobbie.sk` in Resend → Supabase Authentication → SMTP: host `smtp.resend.com`, port `465`, user `resend`, password = Resend API key, sender `noreply@jobbie.sk`. Or use the [Supabase × Resend integration](https://supabase.com/partners/integrations/resend). Merge SPF/DKIM TXT records with existing Websupport mail DNS.

**Rate limit:** Supabase may throttle repeat reset requests (~1/min per address).

## Environment variables (Nest API)

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_HOST` | Yes | SMTP hostname |
| `SMTP_FROM` | Yes | From header, e.g. `Jobbie <noreply@yourdomain.sk>` |
| `SMTP_PORT` | No | Default `587` |
| `SMTP_SECURE` | No | `true` / `false`; if omitted, `465` → secure, else STARTTLS on 587 |
| `SMTP_USER` | No | Auth username (omit for IP-relay without auth) |
| `SMTP_PASS` | No | Auth password |
| `PUBLIC_APP_URL` | Recommended | PWA links in digests (unsubscribe page, manage hub, job list URLs) |
| `PUBLIC_API_URL` | Recommended when API ≠ PWA host | Pause link: `{PUBLIC_API_URL}/api/public/job-alerts/pause?token=…` (GET → redirects to `/ponuky-na-email/pozastavene`) |
| `NOTIFICATION_PREFERENCE_TOKEN_SECRET` | Required for pause/unsubscribe in job alert emails | Signs tokens for footer actions; if unset, digest footers fall back to non-token URLs |
| `PRICING_INQUIRY_TO` | No (defaults to `ahoj@jobbie.sk`) | Inbox for `/cennik` addon contact form (`POST /api/pricing-inquiries`) |
| `SMTP_VERIFY_ON_BOOT` | No | When `true`, Nest logs SMTP `verify()` result on startup (dev troubleshooting) |

If `SMTP_HOST` or `SMTP_FROM` is missing, `EmailService.sendHtmlEmail` returns `false` and crons skip dispatch (`canRunDispatch` / `canRunAlerts`).

### Job alert digest footer actions

| Action | URL target |
|--------|------------|
| Pozastaviť toto upozornenie | **API** `GET /api/public/job-alerts/pause` → 302 to PWA `/ponuky-na-email/pozastavene` |
| Vypnúť e-maily s ponukami | **PWA** `/unsubscribe/[token]?category=job_email_alerts` (page calls API to turn off email channel) |
| Spravovať upozornenia | **PWA** `/ponuky-na-email` (login required; return URL preserved) |

Local dev: set `PUBLIC_APP_URL=http://localhost:3001` and `PUBLIC_API_URL=http://localhost:8000` so pause does not hit the Nuxt dev server by mistake.

## HTML layout (branded transactional)

Shared templates in [`backend-ts/src/email/`](../backend-ts/src/email/):

| Module | Use |
|--------|-----|
| [`transactional-email.template.ts`](../backend-ts/src/email/transactional-email.template.ts) | Mint header, JOBBIE wordmark, content card, green pill CTA, footer — tokens mirror PWA `marketing.*` (`#F6FAF8`, `#22c55e`, `#fafcfb`, DM Sans / Inter stack). |
| [`job-alert-digest-email.template.ts`](../backend-ts/src/email/job-alert-digest-email.template.ts) | Job email alert digests (ponuky na e-mail): soft cards per listing + GDPR footer links. |

[`NotificationsService`](../backend-ts/src/notifications/notifications.service.ts) in-app notification emails use the same layout shell.

## Deliverability

Configure **SPF**, **DKIM**, and **DMARC** for the domain in `SMTP_FROM`. Without them, alert mail often lands in spam when using a self-hosted or shared SMTP host.

## Local development

Leave `SMTP_HOST` empty to disable sends, or point at a catcher (Mailhog, **Mailpit**) so pricing inquiries and alerts are visible without a real SMTP relay:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=Jobbie Dev <dev@localhost>
SMTP_VERIFY_ON_BOOT=true
PRICING_INQUIRY_TO=you@example.com
```

Run [Mailpit](https://github.com/axllent/mailpit) (e.g. `mailpit` or Docker on port 1025) and open its web UI (default `http://localhost:8025`). Production relays (e.g. Websupport) may reject mail from residential IPs — use Mailpit locally instead of debugging against production SMTP.

## Callers

- [`JobAlertsService`](../backend-ts/src/job-alerts/job-alerts.service.ts) — cron every 15m
- [`SearchAlertsService`](../backend-ts/src/search/search-alerts.service.ts) — saved searches
- [`NotificationsService`](../backend-ts/src/notifications/notifications.service.ts) — per-user notification email channel
- [`NotificationJobsService`](../backend-ts/src/notifications/notification-jobs.service.ts) — weekly digest / re-engagement
- [`EmployerApplicantsService`](../backend-ts/src/applications/employer-applicants.service.ts) — auto-reply to applicants
- [`PricingInquiriesService`](../backend-ts/src/pricing-inquiries/pricing-inquiries.service.ts) — `/cennik` doplnkové služby contact form → `PRICING_INQUIRY_TO`
