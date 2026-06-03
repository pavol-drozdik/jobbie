# Transactional email (SMTP)

JOBBIE sends product email (job alerts, saved-search alerts, notification digests, employer applicant auto-replies) through a single Nest service: [`EmailService`](../backend-ts/src/email/email.service.ts) using **nodemailer** and your SMTP server.

Billing invoice PDFs are **not** sent this way — they use [Stripe Dashboard settings](./stripe-invoice-emails.md). Auth messages (signup, password reset) use **Supabase Auth** SMTP settings in the Supabase project. Newsletter signups sync to **MailerLite** when `MAILERLITE_API_KEY` is set.

## Environment variables

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
| `PRICING_INQUIRY_TO` | No (defaults to `podpora@jobbie.sk`) | Inbox for `/cennik` addon contact form (`POST /api/pricing-inquiries`) |
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
