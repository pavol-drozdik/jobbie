# GDPR & privacy runbook (JOBBIE)

## Public privacy policy (PWA)

- PDF: [`app-pwa/public/docs/gdpr-jobbie.pdf`](../app-pwa/public/docs/gdpr-jobbie.pdf) — served at `/docs/gdpr-jobbie.pdf`
- Page: `/ochrana-osobnych-udajov` (footer **Ochrana súkromia**) — embeds the PDF with download link
- Source file for updates: replace the PDF in `public/docs/` and bump `GDPR_PRIVACY_POLICY_UPDATED_AT` in `app-pwa/utils/legal-documents.ts`

## Data categories

| Category | Storage | Who can read |
|----------|---------|--------------|
| Profile identity & contact | `profiles`, Supabase Auth | Owner via API; public fields per privacy toggles |
| CV personal data | `cvs`, `cv_personal_info`, sections | Owner; employers via Nest API with visibility + unlock rules |
| Marketing | `profiles.marketing_processing_consent`, `subscribers`, CV `marketing_consent` | Owner; sends gated in `NotificationsService` |
| Job alerts | `job_email_alerts`, `notification_preferences` | Owner; transactional sends when `is_active` |
| Billing | `billing_details`, Stripe (server) | Owner on `GET /profiles/me` only |
| Consent log | `consent_events` | Owner read; Nest inserts |

## User rights (API)

| Right | Endpoint / UI |
|-------|----------------|
| Access | `GET /api/profiles/me`, CV endpoints, `GET /api/profiles/me/export` → [app-pwa/pages/nastavenia/export-udajov.vue](../app-pwa/pages/nastavenia/export-udajov.vue) |
| Rectification | `PATCH /api/profiles/me`, `PATCH /api/cv/me` |
| Erasure | `POST /api/profiles/me/delete` → [nastavenia/nebezpecna-zona](../app-pwa/pages/nastavenia/nebezpecna-zona.vue) |
| Restrict processing | Privacy toggles on profile/CV; employer DB exclusion flags |
| Portability | ZIP export (`data.json` + `README.txt`) |
| Object (marketing) | `marketing_processing_consent`, notification categories, `/unsubscribe/[token]` |

## Retention (account deletion)

Soft delete: `profiles.is_deleted`, `deleted_at`, auth user banned and email replaced. Job offers deactivated; CVs hidden (`visible_to_employers = false`); contact fields scrubbed on `cv_personal_info`. Ledger/audit rows may be retained for legal obligations.

## Testing checklist

1. Employer CV detail: no phone/email until unlock or `show_contact_details`.
2. Employer list: no email/phone/gender/birth in cards.
3. Public job with `show_exact_address: false`: no street in API and `job_offers_public`.
4. Job alert email: pause + unsubscribe links work without login.
5. Export ZIP opens and contains profile + CV JSON.
6. Delete account: cannot log in; CV not in employer database.

## Cursor rule

Enforced in [.cursor/rules/security-privacy-gdpr.mdc](../.cursor/rules/security-privacy-gdpr.mdc).
