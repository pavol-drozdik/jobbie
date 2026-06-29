## 2026-06-29 — Permanent account deletion (vs admin suspend)

Changed:
- **backend-ts:** `POST /api/profiles/me/delete` and admin close-account now call `auth.admin.deleteUser` after billing/listing teardown — full erasure so email/OAuth can register fresh (`AccountPermanentDeletionService`).
- **jobbie-admin:** `close-account` permanently deletes auth user (audit `admin.user.account_deleted`); **suspend** unchanged (ban + `account_status: suspended`, account remains).
- **docs:** GDPR-PRIVACY, auth-security, profile-deferred — deletion vs enforcement ban.

## 2026-06-29 — VPS: scale Nest on one machine (runbook)

Docs:
- **staging-production-manual.md** §17 — scale multiple `backend` containers on one VPS (`REDIS_URL`, `BACKEND_SCALE`, verify via Admin Infra per-core CPU).
- **deploy_backend.sh** — reads `BACKEND_SCALE` from `.env` (default 1) on CI/manual deploys.
- **websupport-vps-deployment/.env.example** — documents `BACKEND_SCALE`.

## 2026-06-29 — Admin Infra per-core CPU bars

Fixed:
- **host_metrics.sh:** per-core CPU % uses full `/proc/stat` jiffies (fixes negative values like -300%); clamped to 0–100.
- **jobbie-admin:** history sanitizes/clamps stored `cpu_per_core` on load and record.

## 2026-06-29 — Admin Infra CPU/RAM history charts

Changed:
- **jobbie-admin:** Infra VPS cards show CPU load % and RAM % line charts with ranges **1 h**, **24 h**, **2 weeks**, **1 month**.
- **jobbie-admin API:** `GET /api/admin/infrastructure/:envId/history?range=1h|24h|2w|1m` — local JSON time series (samples every 4+ min on refresh, background poll every 5 min while API runs; 35-day retention).
- **jobbie-admin:** Optional `INFRA_METRICS_HISTORY_PATH`; Electron stores history in `userData/infrastructure-history.json`.

## 2026-06-29 — Google OAuth registration, PKCE flash, post-delete re-register

Fixed:
- **supabase:** `handle_new_user` validates `birth_date` only when present in signup metadata — OAuth signups apply wizard fields on `/auth/callback` via `updateUser` (Supabase cannot pass custom metadata on `signInWithOAuth`).
- **supabase:** `unlink_auth_identities_for_closed_account` RPC — removes `auth.identities` on account closure so Google can bind to a new `auth.users` row (hard `deleteUser` avoided: `profiles` FK cascade).
- **backend-ts:** `POST /api/profiles/me/delete` calls identity unlink after auth ban; **jobbie-admin** admin close mirrors the RPC.
- **app-pwa:** OAuth callback uses session-first PKCE handoff (`oauth-callback-session.ts`) — no flash of „PKCE code verifier not found“ when `detectSessionInUrl` already exchanged the code.
- **app-pwa:** Google OAuth sets persistent PKCE storage before redirect; registration wizard no longer passes ignored `options.data` to Supabase.
- **app-pwa:** `user_banned` / closed-account copy (`authAccountClosed`); OAuth signup errors route to `/auth/register` when wizard pending metadata exists.
- **docs:** `auth-security.md`, `GDPR-PRIVACY.md` — OAuth birth-date deferral and identity unlink on erasure.

## 2026-06-29 — Homepage mobile PageSpeed (images + font preload)

Changed:
- **app-pwa:** Hero phone column uses `<picture>` — `jobbie-mobile-hero-760.webp` below 900px, full asset on desktop; media-scoped image preloads in `HomeHeroSection`.
- **app-pwa:** Homepage feature sections use pre-exported `phone-image-400.webp` and `spotlight-400.webp` via `<picture>` (Cloudflare Pages does not resize `NuxtImg` at runtime).
- **app-pwa:** DM Sans normal weight loads from `/fonts/dm-sans-latin-wght-normal.woff2` (matches `nuxt.config` preload); italic stays deferred via fontsource.
- **app-pwa:** `scripts/optimize-home-marketing-images.mjs` — regenerate `jobbie-mobile-hero-760.webp` (760w) and 400w marketing WebPs with backend `sharp`.

## 2026-06-29 — PWA stale chunk recovery after deploy

Fixed:
- **app-pwa:** `0.chunk-reload.client.ts` — one automatic reload per tab when a dynamic `_nuxt` import fails (stale HTML after deploy / CDN cache).
- **app-pwa:** Service worker precache excludes `/_nuxt/**` so an outdated SW does not serve removed route chunks; navigations already use `NetworkOnly`.
- **app-pwa:** Blog index client retry uses `refreshList()` instead of writing to a read-only `loading` computed.
- **app-pwa:** Sentry ignores transient post-deploy chunk load errors (handled by reload).

## 2026-06-29 — Turnstile size=invisible removed (Cloudflare API)

Fixed:
- **app-pwa:** `useTurnstileWidget` no longer passes deprecated `size: 'invisible'` (Turnstile v0 now requires `normal`/`compact`/`flexible`); uses `execution: 'execute'` + `appearance: 'execute'` for programmatic invisible challenges and `reset()` before re-execute to avoid duplicate `execute()` warnings.

## 2026-06-29 — Google OAuth + Turnstile CAPTCHA

Fixed:
- **app-pwa:** `signInWithOAuth` (login + registration wizard) now passes Turnstile `captchaToken` when Supabase Auth CAPTCHA is enabled — fixes generic „Prihlásenie cez Google zlyhalo“ after recent Turnstile rollout.
- **app-pwa:** Google registration stores wizard metadata in `sessionStorage`, applies `updateUser` + `PATCH /api/profiles/me` on callback (roles, profile fields, newsletter consent); requires terms acceptance before OAuth.
- **app-pwa:** Clearer CAPTCHA-specific OAuth error copy (`authOAuthCaptchaFailed`).

## 2026-06-29 — Customer role label + blog layout

Changed:
- **app-pwa:** Renamed customer role display label from „Potrebujem pomoc s prácou“ to „Poskytujem prácu“ (signup, profile, settings, dashboard copy, CV database gate).
- **backend-ts:** Matching role name in customer-only API error messages.
- **app-pwa:** Blog post detail cover uses 4:3 aspect ratio (`aspect-[4/3]`); blog/home list card titles clamp to 2 lines.
- **docs/features.md** — updated `customer_role` label.

Fixed:
- **app-pwa:** Blog post hard refresh no longer shows generic 404 when the API is unreachable — SSR only 404s on `GET /api/blog/:slug` HTTP 404; client retries fetch after hydration when SSR could not reach the API.
- **app-pwa:** Blog post detail uses article skeleton + standard `error.vue` / `AppHttpErrorPage` for missing posts (not list error banner); `publicContentApiUrl()` for reliable SSR API base.

## 2026-06-29 — Registration activity roles persist at signup

Fixed:
- **app-pwa:** Signup metadata (`buildRegistrationSignUpMeta`) now includes `customer_role`, `worker_role`, and `provider_role`; Google OAuth registration passes the same flags.
- **supabase:** `handle_new_user` reads activity roles from signup metadata and sets them on `profiles` at user creation (fixes email-confirmation signups where post-login PATCH was skipped).
- **docs/features.md** — signup persistence path documented.

## 2026-06-29 — GET /metrics CORS bypass (admin Infra, scrapes)

Fixed:
- **backend-ts:** `/metrics` skips production CORS for requests without `Origin` (curl, JOBBIE Admin Infra server fetch). Endpoint stays protected by `METRICS_BEARER_TOKEN`.

## 2026-06-29 — Invisible Turnstile + single-use token fix

Fixed:
- **app-pwa:** Turnstile runs invisibly (no on-page widget); fresh token per auth attempt via `refreshToken()`.
- **backend-ts:** Nest no longer calls Cloudflare siteverify on login-status / signup-email-status (tokens are single-use; Supabase Auth verifies captcha).
- **app-pwa/useRegistrationSignUp:** Removed duplicate `POST /api/auth/captcha/verify` before sign-up.

## 2026-06-29 — Supabase Turnstile CAPTCHA on login

Fixed:
- **app-pwa:** Login always shows Turnstile and sends `captchaToken` to Supabase when `NUXT_PUBLIC_TURNSTILE_SITE_KEY` is set (fixes `no captcha_token found` with dashboard CAPTCHA enabled). Passkey conditional UI waits for captcha; reset-password and settings password flows include Turnstile; [`useAuthCaptcha`](../app-pwa/composables/useAuthCaptcha.ts) shared helper.

## 2026-06-29 — Supabase Auth policy alignment (PWA)

Changed:
- **app-pwa:** Shared password validator (`validate-password.ts`) — min 8 characters, letters and digits — used on register, password reset, and settings password change.
- **app-pwa:** Settings security — current-password reauthentication before email/password `updateUser` when the account has an email identity; improved secure email-change copy and post-confirm redirect to `/nastavenia/bezpecnost`.
- **docs/auth-security.md** — Supabase Auth password and email policy table.

## 2026-06-29 — JOBBIE Admin: Turnstile for Supabase CAPTCHA

Fixed:
- **jobbie-admin:** Pass `captcha_token` through `POST /api/auth/login` when Supabase Auth CAPTCHA is enabled; Turnstile widget via `VITE_TURNSTILE_SITE_KEY` in `app/.env`.

## 2026-06-29 — JOBBIE Admin: login via local API

Fixed:
- **jobbie-admin:** `POST /api/auth/login` on localhost uses `SUPABASE_ANON_KEY` from `api/.env` (same project as JWT verify). UI no longer depends on client-side Supabase env for sign-in.

## 2026-06-29 — JOBBIE Admin: login error messages

Fixed:
- **jobbie-admin:** Clearer Supabase login errors and `app/.env` validation hint. No Turnstile on admin — PWA/Nest CAPTCHA is separate from Supabase Auth.

## 2026-06-29 — JOBBIE Admin: MFA no longer required

Changed:
- **jobbie-admin:** Removed `AdminMfaGuard` (AAL2) and TOTP step from login; password + `app_role = admin` is enough. Sensitive routes still use `@RequireRecentLogin()`.

## 2026-06-29 — PWA update banner: Obnoviť activates new service worker

Fixed:
- **app-pwa/service-worker/sw.ts:** Listen for `SKIP_WAITING` so `@vite-pwa/nuxt` `updateServiceWorker()` can activate a waiting worker (`registerType: 'prompt'` + injectManifest).
- **app-pwa/app.vue:** Hard-reload fallback when the new worker never takes control within 1.2s.

## 2026-06-29 — Signup: duplicate email blocked

Fixed:
- **backend-ts:** Public `POST /api/auth/security/signup-email-status` (rate-limited, Turnstile when configured) checks `auth.admin.getUserByEmail` before signup.
- **app-pwa/useRegistrationSignUp:** Calls email-status before `signUp`; also rejects Supabase success responses with empty `identities` or duplicate error messages.

## 2026-06-29 — App-sent faktúra emails (SMTP)

Added:
- **backend-ts/billing-invoice-email.service:** Sends paid Stripe invoice PDF via Nest SMTP after credit pack (`ensureCreditPaymentInvoice`) and subscription invoices (`invoice.paid` / `confirm-subscription`); idempotent `billing_invoice_email_dispatches` table.
- **backend-ts/email:** `billing-invoice-email.template.ts`; optional PDF attachments on `EmailService.sendHtmlEmail`.
- Removed broken `invoices.sendInvoice` call for credit faktúry (`charge_automatically`).

Database:
- `billing_invoice_email_dispatches` — service_role only.

Docs:
- [stripe-invoice-emails.md](stripe-invoice-emails.md), [email-smtp.md](email-smtp.md), [payments-credits.md](payments-credits.md).

## 2026-06-29 — Signup: focused field border no longer clipped

Fixed:
- **app-pwa/RegisterSignupWizard:** Step 3 profile fields use `overflow-visible` (same as step 4) so focus styling is not clipped in the flex layout.
- **app-pwa/assets/css/main.css:** `.cv-field` inputs use inset focus ring + green border on `:focus-visible` instead of an outer `ring-2` that overflow containers crop on pill-shaped fields.

## 2026-06-28 — Stripe checkout: accordion icon, invoice email runbook, wallet domains

Fixed:
- **app-pwa/stripe-payment-element-ui:** Payment Element accordion layout — green card icon (`iconColor`, `.AccordionItem` rules); removed `.TabIcon--selected` white fill that did not apply to accordion headers (“Platba kartou” appeared white on light background).

Changed:
- **docs/stripe-invoice-emails.md:** “Receipts but no invoice PDF” troubleshooting table (Payments vs Email customers about toggles).
- **docs/payments-credits.md:** Wallet domain checklist (`jobbie.sk` + `www.jobbie.sk`).
- **backend-ts/scripts/register-stripe-payment-method-domains.mjs:** Ops helper to register payment method domains for Apple/Google Pay.

## 2026-06-28 — Pricing: monthly credits from live catalog (cache bust)

Fixed:
- **backend-ts/catalog-cache.service:** `invalidate()` / `invalidateCatalog()` now delete Redis keys by prefix; bumped catalog cache keys (`catalog:plans-list:v7`, `catalog:billing-config:v9`, …) so stale `monthly_credits` (e.g. Zadarmo `2` vs DB `5`) no longer appear on `/cennik`.
- **app-pwa/cennik:** Force-reload plans when opening the Plány tab; bumped session cache keys for plans and billing config.

## 2026-06-28 — Credits checkout: fulfillment on `/platba/vysledok` only + live Stripe Price validation

Fixed:
- **app-pwa/useCheckoutCredits, useCheckoutSubscription:** After Stripe success on `/platba`, navigate to `/platba/vysledok` with `payment_intent` / `setup_intent` — no inline `confirm-credits` / `confirm-subscription` on the payment form (charged card no longer leaves user stuck on checkout with an error).
- **app-pwa/app-routes.ts:** `checkoutResultUrl()` accepts `paymentIntentId` / `setupIntentId`.
- **app-pwa/useCheckoutResult:** Broader retryable fulfillment messages; optional billing from `sessionStorage` on confirm.
- **backend-ts/stripe.service:** `validateCreditPackForPaymentIntent` compares PI amount to live `stripe.prices.retrieve()` when `metadata.price_id` is set (Postgres `unit_amount` is catalog display only).
- **backend-ts/payments.controller:** Logs `fulfillCreditsIfNeeded` `reason` on confirm-credits failure (`not_succeeded` vs `not_credits`).

Docs:
- **docs/payments-credits.md:** post-payment flow on vysledok only.

## 2026-06-28 — Stripe invoice: Dátum dodania on PDF

Changed:
- **backend-ts/stripe-invoice-sk:** Adds `Dátum dodania` Stripe custom field (= dátum vystavenia, long `sk-SK` format). In-app `delivery_at` now matches `issued_at`.
- **app-pwa/InvoiceDetailPanel:** Hides duplicate `Dátum dodania` custom field under customer block.

## 2026-06-28 — Stripe invoice: Dodávateľ/Odberateľ custom fields + OR-only footer

Changed:
- **backend-ts/stripe-invoice-sk:** Supplier and buyer IČO/DIČ/IČ DPH move to two Stripe `custom_fields` (`Dodávateľ` | `Odberateľ`, single-line ` · ` values). Footer is only the OR line (`BILLING_SUPPLIER_OR` / default CoCreate register text). Removed poznámka, subscription period, and § 74 exemption text from Stripe PDF footer.
- **backend-ts/stripe.service:** Subscription invoice template always rebuilds custom fields from customer metadata; invoice detail merges missing `Odberateľ` from profile for legacy PDFs.
- **app-pwa/InvoiceDetailPanel:** Hides `Dodávateľ` custom field under customer block (shown in supplier section).

Docs:
- **docs/stripe-invoice-sk-vat.md:** custom field layout and footer behaviour.

## 2026-06-28 — Subscription invoice PDF: supplier IČO/DIČ/IČ DPH on trial invoices

Fixed:
- **backend-ts/payments:** Trial €0 subscription invoices often finalized before `invoice.created` webhook ran, so the SK footer (supplier IČO/DIČ/IČ DPH/OR + § 74 exemption) was never applied and only the Stripe Dashboard default footer appeared on the PDF.
- **backend-ts/payments:** Stamp SK template synchronously after `subscriptions.create`; set `invoice_settings.footer` on the Stripe Customer at checkout (overrides Dashboard default); webhook reloads full invoice before applying template on draft renewals.

Docs:
- **docs/stripe-invoice-sk-vat.md:** synchronous stamp + customer default footer fallback.

## 2026-06-28 — Redirect Cloudflare `pages.dev` to canonical site

- **app-pwa:** Nitro middleware `0.preview-host-redirect` 301-redirects `jobbie-pwa.pages.dev` (and `*.jobbie-pwa.pages.dev` previews) to `NUXT_PUBLIC_SITE_URL` (e.g. `https://www.jobbie.sk`). Cloudflare `_redirects` does not support domain-level redirects.
- **docs/deployment.md:** note on preview hostname redirect.

Fixed:
- **app-pwa/pages/platba:** Moved checkout from `platba.vue` to `platba/index.vue` so `/platba/vysledok` renders the result page (Nuxt parent route without `<NuxtPage />` had kept the payment form visible while the URL changed).

## 2026-06-28 — Reliable SK faktúra for credit pack purchases

Fixed:
- **backend-ts/stripe.service:** Credit purchases always get a post-payment Stripe Invoice (`ensureCreditPaymentInvoice`) with retry polling; fixes silent skip when `amount_received` was still 0 after redirect; attempts `invoices.sendInvoice` after pay.
- **backend-ts/payments.controller:** `confirm-credits` always runs invoice ensure after grant (repair path for missing faktúry).

## 2026-06-28 — Fix credit fulfillment race on `/platba/vysledok`

Fixed:
- **backend-ts/stripe.service:** `fulfillCreditsIfNeeded` polls Stripe until PaymentIntent is `succeeded` (up to ~6s); treats already-fulfilled PIs as success; pack validation uses `amount` when `amount_received` is still zero.
- **backend-ts/payments.controller:** `confirm-credits` returns 503 (retryable) when PI is not yet succeeded.
- **app-pwa/useCheckoutResult:** Auto-retries confirm up to 6×; keeps intent id for safe retry; strips only client secrets from URL; failure CTA retries fulfillment instead of starting a new checkout when card was charged.

## 2026-06-28 — Payment result pages (`/platba/vysledok`)

Added:
- **app-pwa/pages/platba/vysledok.vue:** Login-style success/failure/processing page (`AuthMarketingSplitShell`) for credits and subscription checkout.
- **app-pwa/composables/useCheckoutResult.ts:** Stripe return handling, confirm API calls, URL secret stripping; supports `setup_intent` for trial subscriptions.

Changed:
- **app-pwa/useCheckoutCredits, useCheckoutSubscription:** Stripe `return_url` and inline success redirect to `/platba/vysledok`; removed return-url confirm from checkout `init()`.
- **app-pwa/CheckoutCreditsPanel, CheckoutSubscriptionPanel:** Removed inline success banners (success UX on result page).
- **app-pwa/app-routes.ts:** `ROUTES.checkoutResult`, `ROUTES.checkoutResultUrl()`.
- **app-pwa/stripe-return-query.ts:** `readStripeReturnQuery` returns `setupIntent`.

Docs:
- **docs/frontend.md**, **docs/payments-credits.md:** checkout result flow.

## 2026-06-28 — Stripe § 74 invoice compliance (identifikovaná osoba)

Changed:
- **backend-ts/stripe-invoice-sk:** `buildSkInvoiceFooter` appends supplier IČO/DIČ/IČ DPH/OR (`BILLING_SUPPLIER_*` / defaults) and § 74(h) exemption text (`STRIPE_INVOICE_VAT_EXEMPTION_TEXT`, optional `STRIPE_INVOICE_VAT_EXEMPTION_REFERENCE`); `buildSkInvoiceRendering` sets `amount_tax_display: exclude_tax`.
- **backend-ts/stripe.service:** `invoice.created` subscription handler stamps `custom_fields` from Customer `invoice_settings` or metadata (`registration_number`, `tax_id`, `vat_id`); company checkout persists those keys on Customer metadata.
- **app-pwa/InvoiceDetailPanel:** Footer renders with `whitespace-pre-line` to match Stripe PDF legal block.

Docs:
- **docs/stripe-invoice-sk-vat.md:** § 74 mapping table, new env vars, footer behaviour.
- **backend-ts/.env.example:** exemption env documentation.

## 2026-06-28 — Fix setup_future_usage mismatch on subscription checkout

Fixed:
- **app-pwa/useCheckoutSubscription:** Freeze `checkoutTrialDays` and `checkoutIntentType` from `GET /api/payments/subscription-checkout-preview` on page init only — no longer mutates trial state inside `createPaymentIntent()` (that reactively flipped `deferred-mode` mid-pay and left Elements in deferred `setup` while confirming a PaymentIntent).
- **app-pwa/CheckoutSubscriptionPanel:** Bind `deferred-mode` to frozen `checkoutIntentType`; `:key` on `StripePaymentForm` for clean remount when preview mode differs.
- **app-pwa/StripePaymentForm:** Track `elementsMountKind`; never `elements.update()` a PaymentIntent onto deferred-setup Elements (always `mountWithClientSecret` + re-enter card); block `confirmPayment` when mount kind is still `deferred-setup`; confirm path uses server `intent_type` only (not stale `deferredMode`).

## 2026-06-28 — Subscription checkout: server trial preview + setup_future_usage guard

Fixed:
- **backend-ts:** `GET /api/payments/subscription-checkout-preview?plan_id=` returns per-user `trial_period_days` and `intent_type` using the same `resolveSubscriptionTrialDays` logic as `create-payment-intent-subscription`.
- **app-pwa/useCheckoutSubscription:** Checkout trial UI and deferred Elements mode (`setup` vs `payment`) now come from that preview (not catalog global fallback or `subscriptionTrialEligible` alone), so the summary matches what the server will create.
- **app-pwa/StripePaymentForm:** Before `confirmPayment`/`confirmSetup`, reject intent-type mismatches (e.g. setup-mode Elements + PaymentIntent) with `S.checkoutConfirmAfterRemount` instead of Stripe's `setup_future_usage` error.

## 2026-06-28 — Fix subscription checkout hang + Payment Element styling

Fixed:
- **app-pwa/StripePaymentForm:** Production subscription checkout could hang on "Spracovávam…" with no error. When deferred `setup` Elements received a PaymentIntent (no trial), the form remounted Elements with the server `clientSecret` and then called `elements.submit()` on the now-empty card field, which never resolved. Now on an intent-type remount the form stops gracefully with `S.checkoutConfirmAfterRemount` ("Skontrolujte údaje karty a potvrďte platbu znova.") so the next click confirms normally. Added a ~30s watchdog (`raceConfirmTimeout`) around `confirmPayment`/`confirmSetup` so the button can never stay stuck.
- **app-pwa/useCheckoutSubscription:** Root cause of the intent mismatch — the client decided trial/`setup` mode from DB/global catalog config while the backend grants trials only from the live Stripe Price. `planTrialDays` now trusts `GET /api/plans` `trial_period_days` (already derived from the live Stripe Price, the same source `createSubscriptionPaymentIntent` uses), so the form mounts the correct mode the first time. Removed the global/catalog fallback for the checkout decision.

Changed:
- **app-pwa/stripe-payment-element-ui:** Replaced the `9999px` pill `borderRadius` (which made Stripe's accordion render as a giant circular outline) with a normal `14px` field radius on inputs/dropdowns/tabs and the global appearance. Reduced field font/padding and `fontSizeBase` to 16px so card expiry and CVC stay on one row; kept the `accordion` layout so card and Google Pay stack vertically.

## 2026-06-28 — Staging deploy HEALTH_URL fallback

Fixed:
- **`.github/workflows/deploy-staging.yml`, `backend-ghcr.yml` (staging job):** When `STAGING_HEALTH_URL` is unset, resolve `HEALTH_URL` from `APP_DOMAIN` in the VPS `.env` before `deploy_backend.sh` (same as production’s `HEALTH_URL` default pattern). Fail the job with a clear error if both are missing — no empty health URL passed to deploy.
- **Same workflows:** Read `APP_DOMAIN` with `sudo grep` — `.env` is `chmod 600` root-owned on the VPS; unprivileged SSH user got `Permission denied` and an empty `APP_DOMAIN`.

## 2026-06-28 — Subscription trial checkout: remount Elements on intent mismatch

Fixed:
- **app-pwa/StripePaymentForm:** When deferred `setup` Elements receive a PaymentIntent from the API (or deferred `payment` receives a SetupIntent), remount Elements with `clientSecret` instead of `elements.update` — Stripe cannot confirm across modes. Re-submit card after remount.
- **app-pwa/useCheckoutSubscription:** Force-refresh `GET /api/billing/account` before `create-payment-intent-subscription` so trial UI / deferred mode match server eligibility after failed retries.
- **backend-ts/SubscriptionTrialService:** Abandoned `canceled` / `incomplete_expired` checkouts (no `trial_start`, no paid invoice) no longer block subscription trial eligibility.

Docs:
- `docs/payments-credits.md` — deferred trial checkout remount + trial eligibility rules.

## 2026-06-28 — Homepage marketing images + Twitter card

Changed:
- **app-pwa:** Default OG/Twitter image (`summary_large_image`) is now `/img/twittercard.png` from design assets.
- **app-pwa:** Homepage employer section uses updated `Firma-Spotlight.webp` as `/img/spotlight.webp`.
- **app-pwa:** Homepage hero uses refreshed `jobbie-mobile-hero.webp` (single asset for all breakpoints).

## 2026-06-28 — Google Search favicon (PNG/ICO)

Fixed:
- **app-pwa:** Production `/favicon.ico` was a 1×1 placeholder; added real `favicon.ico` and `favicon-48.png` (generated from `favicon.svg` via `npm run icons:generate`). Homepage `<head>` now links ICO + 48×48 PNG before SVG so Googlebot-Image can pick a raster icon.
- **app-pwa:** Removed static `public/robots.txt` fallback that appended `Disallow: /` after Cloudflare managed rules — Nitro `server/routes/robots.txt.get.ts` serves indexing policy when `NUXT_PUBLIC_ALLOW_INDEXING=1`.

## 2026-06-28 — Cookie consent: defer GTM until analytics granted

Fixed:
- **app-pwa:** GTM (`gtm.js`) no longer loads on first paint without analytics consent — prevents GA4/Clarity from auto-starting when the container tags ignore Consent Mode. `loadGtm()` runs only from `applyAnalyticsConsent(true)`; withdraw calls `teardownGtmAnalytics()` (removes bootstrap + injected tags).

## 2026-06-28 — Cookie consent: PostHog init + GTM consent signals

Fixed:
- **app-pwa:** PostHog init captures `runtimeConfig` and `router` synchronously before dynamic `import('posthog-js')` — fixes silent init failure after Accept on production; init failures log `[jobbie] PostHog init failed` in DevTools.
- **app-pwa:** `applyAnalyticsConsent` pushes `analytics_consent_granted` / `analytics_consent_withdrawn` to `dataLayer` for GTM triggers; Consent Mode `wait_for_update` increased to 2000 ms.
- **app-pwa:** Stronger analytics withdraw — expanded Clarity/Bing script purge regex, registrable-root cookie expiry (e.g. `.jobbie.sk`), PostHog `stopSessionRecording` + shutdown guard.
- **app-pwa:** CSP `connect-src` allows PostHog assets host derived from `NUXT_PUBLIC_POSTHOG_HOST` (e.g. `eu-assets.i.posthog.com`).

Docs:
- `docs/observability-runbook.md` — GTM trigger setup for `analytics_consent_granted` / withdraw verification checklist.

## 2026-06-28 — Fix subscription checkout Setup vs PaymentIntent confirm

Fixed:
- **app-pwa/StripePaymentForm:** Subscription trials mount Stripe Elements in deferred `setup` mode, but users who already used their trial get a PaymentIntent from the API. The form called `confirmPayment` on setup-mode Elements → Stripe error “cannot be confirmed with a Payment Intent”. Now uses `shouldConfirmSetupIntent()` (secret prefix + server `intent_type`) to pick `confirmSetup` vs `confirmPayment`.
- **app-pwa/useCheckoutSubscription, CheckoutSubscriptionPanel:** Deferred setup mode and trial UI now require `subscriptionTrialEligible` from `GET /api/billing/account`, not catalog trial days alone — aligns Elements mode with what the backend will create.

## 2026-06-28 — Fix staging health check CORS failure

Fixed:
- **backend-ts/main.ts:** CORS bypass for `/health` and `/api/seo/*` now also matches `Origin: null` (the literal string Undici/Node 22 built-in `fetch` sends for non-browser contexts per the WHATWG spec). The old check `!req.headers.origin` was falsy-safe but `"null"` is a truthy string, so Docker health check probes using Node `fetch` were rejected with a 500, marking the container unhealthy on every deploy.
- **backend-ts/Dockerfile, websupport-vps-deployment/docker-compose.yml:** Switched both health check commands from `fetch()` to `require('http').get()` (Node's `http` module, which never sends an `Origin` header).
- **.github/workflows/deploy-staging.yml, deploy-production.yml, backend-ghcr.yml:** Deploy workflows now upload and install `docker-compose.yml` alongside `deploy_backend.sh` so the VPS Compose config stays in sync with the repo on every deploy.

## 2026-06-28 — Remove per-credit price display from credit packs

Changed:
- **app-pwa:** Removed `0,60 € / kredit` (per-credit) price from checkout and buy-credits panels; deleted `pricePerCredit` helpers from composables and `formatPricePerCredit` from billing utils.
- **backend-ts/billing:** Dropped `pricePerCredit` from public credit-pack catalog DTO (`GET /api/billing/config`).

## 2026-06-28 — Buyer IČO/DIČ/IČ DPH guaranteed on company invoices

Changed:
- **backend-ts/payments:** `getCustomerInvoiceDetail` now guarantees IČO, DIČ, and IČ DPH appear in the buyer block for company accounts. The invoice `custom_fields` remain the authoritative source; if any identifier is missing (e.g. on old invoices created before custom_fields were stamped), the handler falls back to the authenticated user's Supabase profile (`registration_number`, `tax_id`, `vat_id`). Individual buyers (no `registration_number` on profile) are unaffected.

## 2026-06-28 — Invoice supplier auto-populated from Stripe account

Changed:
- **backend-ts/payments:** Supplier name and address on the in-app invoice detail (`/nastavenia/fakturacia/:id`) are now auto-fetched from Stripe's own account (`GET /v1/account` → `company.name` / `company.address`). Result is cached in memory for 1 hour. `BILLING_SUPPLIER_NAME` / `BILLING_SUPPLIER_ADDRESS` env vars still act as overrides.
- **backend-ts/payments:** `formatStripeAddress` maps Stripe country "SK" or "Slovakia" → "Slovenská republika" (covers both customer and Stripe-sourced supplier address).
- **backend-ts/payments:** `getBillingInvoiceSupplier` normalizes "Slovakia" → "Slovenská republika" in `BILLING_SUPPLIER_ADDRESS` env var at runtime.
- **backend-ts/payments:** IČO, DIČ, IČ DPH always fall back to `DEFAULT_BILLING_SUPPLIER` values when the corresponding `BILLING_SUPPLIER_*` env vars are not set. Note: Stripe does not expose actual tax ID values via the API (`tax_id_provided: true` only confirms they were submitted).

## 2026-06-28 — Hide unpaid invoices from billing list

Fixed:
- **backend-ts/payments:** Invoice list (`GET /api/payments/invoices`) and detail now only expose **paid** invoices. Open (unpaid) subscription invoices no longer appear in the billing UI. Removed the redundant Stripe `open` invoice fetch from `listCustomerInvoices`; `isVisibleCustomerInvoice` now returns true only for `status === 'paid'`.

## 2026-06-28 — Sub-390px responsive fixes

Fixed:
- **app-pwa/pages/index.vue:** Carousel role tabs ("Zamestnávateľ" / "Uchádzač" / "Profesionál") now use smaller padding and font (`px-2 py-1.5 text-[13px]`) below 390px so the pill does not wrap on iPhone SE (375px) and below.
- **app-pwa/components/home/HomeHeroSection.vue:** Hero h1 scales down to `text-[34px]` below 380px and `text-[42px]` below 520px instead of staying at 46px on all mobile widths.
- **app-pwa/pages/auth/login.vue, reset-password.vue, mfa.vue:** Auth form panel horizontal padding reduced from `px-7` (56px total) to `px-5` (40px total) below 390px, giving more content width on 320–375px screens.
- **app-pwa/components/auth/RegisterSignupWizard.vue:** Progress step labels changed from `whitespace-nowrap` to `max-w-[4rem] text-center` to prevent label overflow in very narrow containers.
- **app-pwa/components/ui/JaTagInput.vue:** Tag input `min-w` reduced from `180px` to `120px` so the text field coexists with tags in narrower flex containers.
- **app-pwa/pages/profil/index.vue:** Removed `max-lg:basis-[220px]` from the profile sidebar header div; `max-lg:flex-1` alone handles sizing on mobile.

## 2026-06-28 — CSP script nonce on Nuxt HTML chunks

Fixed:
- **app-pwa:** Nitro `render:html` receives `{ head, body, bodyPrepend, bodyAppend }` arrays — the old `html.replace()` hook never stamped nonces, so production `strict-dynamic` CSP blocked Nuxt bootstrap on `/platba` and other CSR routes (`baseURL` undefined). New `server/plugins/csp-script-nonce.ts` patches all chunk arrays (+ `render:html:close` bodyAppend).

## 2026-06-28 — Deploy script logs on unhealthy backend

Changed:
- **websupport-vps-deployment:** `deploy_backend.sh` prints `docker compose ps` + backend logs when `compose up --wait` fails (CI no longer exits before logs).
- **backend-ts:** `bootstrap().catch()` logs fatal startup errors before exit (visible in `docker compose logs backend`).

## 2026-06-28 — Production CSP connect-src (login blocked)

Fixed:
- **app-pwa:** CSP `connect-src` now reads API/Supabase/CDN/PostHog origins from `useRuntimeConfig(event).public` (build-time config) instead of empty `process.env` on Cloudflare Workers — fixes login and API calls blocked with `localhost:8000` in CSP while the client targeted `https://api.jobbie.sk`.

## 2026-06-28 — Footer CoCreate credit

Changed:
- **app-pwa:** Site footer shows „Vytvorilo“ with linked CoCreate logo next to the copyright line.

## 2026-06-28 — Health check browser CORS

Fixed:
- **backend-ts:** `GET /health` applies normal CORS when the browser sends `Origin` (PWA reachability probe); still bypasses CORS for probe traffic without `Origin` (Docker, Netdata, curl).
- **app-pwa:** Realtime health probe caches a failed result until the 15s retry (stops CORS error spam when API is unreachable).

## 2026-06-28 — Subscription checkout client secret (trial SetupIntent)

Fixed:
- **backend-ts:** `resolveSubscriptionPaymentClientSecret` — when `pending_setup_intent` is expanded without `client_secret` (trial checkout), retrieve SetupIntent by id; re-fetch shallow `latest_invoice` with payment expand and use `confirmation_secret` / `paymentIntents.retrieve` for paid first invoice.

## 2026-06-27 — Subscription checkout Stripe expand depth

Fixed:
- **backend-ts:** `subscriptions.create` on `/platba` — shallow expand (`latest_invoice`, `pending_setup_intent` only). Deep expand `latest_invoice.payments.data.payment.payment_intent` exceeded Stripe’s 4-level limit and broke subscription checkout; PaymentIntent client secret is resolved via existing follow-up retrieve in `resolveSubscriptionPaymentClientSecret`.

## 2026-06-27 — CV list preview photo + drop HTML náhľad

Fixed:
- **app-pwa:** CV hub **Náhľad** from `/zivotopisy` resolves the signed profile photo URL (same as the editor) before PDF preview.
- **app-pwa:** Removed temporary **HTML náhľad** button from the CV wizard finish step.

## 2026-06-27 — CV Monochrome continuous sidebar (paginated PDF)

Fixed:
- **backend-ts:** Monochrome paginated sheets use a full-height absolute sidebar chrome on every page (Atlas-style), including continuation pages (`CV_PDF_RENDERER_REVISION` 33).

## 2026-06-27 — CV Monochrome no profile photo

Changed:
- **backend-ts:** Monochrome template omits profile photo (text-only black masthead; `CV_PDF_RENDERER_REVISION` 32).
- **app-pwa:** Template picker marks Monochrómny as “Bez fotografie”.

## 2026-06-27 — CV Monochrome education in main column

Changed:
- **backend-ts:** Monochrome template — Vzdelanie moved to main column under work experience (order: experience → education → Záujmy → Doplňujúce informácie; sidebar: skills, driving, languages; `CV_PDF_RENDERER_REVISION` 31).

## 2026-06-27 — CV Monochrome template realign

Fixed:
- **backend-ts:** Monochrome template matches `jobbiecvdesign` reference — simplified header grid (name, contact line, summary + square photo), extra-info entry with “Doplnenie k profilu” subheading (`CV_PDF_RENDERER_REVISION` 30).

## 2026-06-27 — CV Minimalist template picker photo label

Changed:
- **app-pwa:** CV template selector shows photo support per layout — Minimalistický marked “Bez fotografie”; other templates show “S fotografiou” and thumbnail photo placeholders where applicable.

## 2026-06-27 — CV Minimalist header alignment

Fixed:
- **backend-ts:** Minimalist template — header summary and contact lines share last baseline (`align-items: last baseline`; matched lead/contact line-height; `CV_PDF_RENDERER_REVISION` 29).

## 2026-06-27 — Production Discord alerting runbook

Docs:
- **websupport-vps-deployment:** [`OPS-DISCORD-ALERTING.md`](../websupport-vps-deployment/OPS-DISCORD-ALERTING.md) — replicate free-tier operator alerts (Sentry→Worker→Discord, Supabase content reports, Netdata CPU/RAM/disk/API health); example configs under `ops/netdata/`, `ops/sentry-discord-bridge.worker.example.js`, `ops/supabase/discord-content-report.example.ts`.
- **README-DEPLOYMENT.md** — summary section + links.
- **observability-runbook.md** — operator Discord table and httpcheck / Cloudflare caveats.

## 2026-06-27 — Nuxt error page null statusCode

Fixed:
- **app-pwa:** `AppHttpErrorPage` and `error.vue` handle `useError()` becoming `null` during `clearError()` / navigation recovery (fixes Sentry `TypeError: Cannot read properties of null (reading 'statusCode')` on `/`).
- **app-pwa:** Web push `syncIfGranted` swallows background lifecycle failures so push re-sync does not surface as unhandled Vue errors.

## 2026-06-27 — Registration captcha network errors

Fixed:
- **app-pwa:** Registration Turnstile verify uses `useApi()` / `fetchApi` instead of raw `fetch`, so transient network failures show an inline error instead of an unhandled `TypeError: Failed to fetch` in Sentry.
- **backend-ts:** `POST /api/auth/captcha/verify` rate-limited (20/min) like sibling auth security endpoints.

## 2026-06-27 — SEO sitemap CORS bypass

Fixed:
- **backend-ts:** `GET /api/seo/*` (sitemap, feeds) bypasses credentialed CORS middleware so Nitro server-side `$fetch` works without an `Origin` header in production.

## 2026-06-27 — CV builder performance

Changed:
- **app-pwa:** `useCvHeaderAutosave` `flushSave` now uses delta diff instead of force-full; PATCH is skipped entirely when nothing changed since the last autosave, eliminating the redundant second header PATCH on wizard step navigation.
- **app-pwa:** `CvPrototypeShell` add/remove/reorder for experience and education use optimistic local aggregate updates (via new `updateAggregate` prop callback) instead of triggering a full `GET /api/cv/:id` reload — reduces each operation from 3 sequential round-trips to 1.

## 2026-06-27 — OAuth signup error handling (login Google / birth date)

Fixed:
- **app-pwa:** Global handler maps Supabase `Database error saving new user` (and birth-date trigger failures) to Slovak copy and redirects new users to `/auth/register`; login page hints that Google signup belongs on registration; `/auth/callback` uses the same mapper.

## 2026-06-27 — CV editor work & education reorder

Added:
- **app-pwa:** CV builder — up/down controls on work experience and education rows persist order via `PATCH /api/cv/:id/{experience|education}/order` (`utils/cv-section-order.ts`).

## 2026-06-27 — Individual registration minimum age (16+)

Added:
- **app-pwa:** Registration wizard and sign-up composable reject individual accounts when birth date proves age under 16; date picker caps at the latest allowed birth date.
- **supabase:** `handle_new_user` requires a valid `birth_date` in auth metadata for `role = individual` and rejects signups younger than 16.

## 2026-06-27 — Production CORS, Clarity CSP, cookie banner hydration

Fixed:
- **backend-ts:** CORS preflight allows Sentry `sentry-trace` and `baggage` headers so cross-origin API calls from the PWA work when browser tracing is enabled.
- **app-pwa:** CSP `script-src` allows `https://*.clarity.ms` (GTM loads Clarity from `scripts.clarity.ms`); `connect-src` allows `wss://` on the API origin (Socket.IO feed); `font-src` allows `NUXT_PUBLIC_CDN_URL` for bundled `@fontsource` assets.
- **app-pwa:** Cookie consent host wrapped in `ClientOnly` to avoid SSR hydration mismatches on public pages (`/cennik`, etc.).
- **app-pwa:** App layout defers auth chrome until after mount; homepage CTA role picks after mount; stale BFF refresh failure clears auth cache (fewer repeat `401` refresh attempts).
- **app-pwa:** Sentry trace propagation limited to same-origin API (dev proxy) so cross-origin production calls work before/with Nest CORS `sentry-trace`/`baggage` allowlist.

## 2026-06-27 — CV section order (Záujmy before Doplňujúce informácie)

Changed:
- **backend-ts:** All CV templates render Záujmy before Doplňujúce informácie (`CV_PDF_RENDERER_REVISION` 26).

## 2026-06-27 — CV Minimalist sidebar skills + column gap

Changed:
- **backend-ts:** Minimalist template — Znalosti moved to sidebar; wider gap between main and side columns (`CV_PDF_RENDERER_REVISION` 25).

## 2026-06-27 — CV Minimalist layout

Changed:
- **backend-ts:** Minimalist template — wider main column, education under work experience in main, no profile photo (`CV_PDF_RENDERER_REVISION` 24).

## 2026-06-26 — CV date label formatting

Fixed:
- **backend-ts:** CV PDF/templates — experience months use 3-letter Slovak abbreviations (Jan, Feb, …); education ongoing label renders as Neukončené (`CV_PDF_RENDERER_REVISION` 23).

## 2026-06-26 — CV Editorial education before extra info in PDF

Fixed:
- **backend-ts:** Editorial PDF pagination — education stays before Doplňujúce informácie (extra info moved into main panel after education; orphan extra merge blocked when education is on a later page; `CV_PDF_RENDERER_REVISION` 22).

## 2026-06-26 — CV Editorial education under experience

Changed:
- **backend-ts:** Editorial template — education sits directly under work experience in one main-column panel; pagination no longer pulls extra info above pending education units (`CV_PDF_RENDERER_REVISION` 21).

## 2026-06-26 — CV Editorial education + profile photo

Changed:
- **backend-ts:** Editorial template — education moved to main column; header photo is 40mm circle without border (`CV_PDF_RENDERER_REVISION` 20).

## 2026-06-26 — CV Editorial PDF column layout fix

Fixed:
- **backend-ts:** Editorial/Minimalist/Monochrome PDF grids use `minmax(0, …fr)` plus `min-width: 0` and word-break on column children so long sidebar text cannot blow out column widths.
- **backend-ts:** Removed `10.5pt` base font shrink on paginated Editorial sheets; body copy stays at design `11.2pt` on `.cv-sheet`.
- **backend-ts:** Coupled-column packer prioritizes main-column units before sidebar when filling pages (`CV_PDF_RENDERER_REVISION` 19).

## 2026-06-26 — CV templates realign (Editorial, Minimalist, Monochrome)

Fixed:
- **backend-ts:** Editorial, Minimalist, and Monochrome CV templates realigned to `jobbiecvdesign/` reference layouts — summary as header lead, correct main/side column placement (education/skills/hobbies per design).
- **backend-ts:** Multi-page PDF packer — continuation grid padding for Minimalist/Monochrome; `data-cv-pack="with-previous"` for trailing extra-info sections; orphan rebalance for coupled columns (`CV_PDF_RENDERER_REVISION` 18).

## 2026-06-27 — Square photo crop (CV + profile)

Changed:
- **app-pwa:** CV editor and profile settings show a square crop modal (pan, zoom slider, pinch) before photo upload; cropped image flows through existing compression and storage APIs.

## 2026-06-27 — CV editor photo removal

Changed:
- **app-pwa:** CV editor — “Odstrániť fotografiu” removes the uploaded CV photo via existing `DELETE /api/cv/:id/photo` (storage + header fields cleared).

## 2026-06-26 — Homepage SSR usePageSeo fix

Fixed:
- **app-pwa:** Explicit `usePageSeo` import on homepage and in `useGlobalSiteSeo`; moved `fetchPublicJobsHome` to `utils/` (not a composable) to avoid SSR auto-import gaps.

## 2026-06-26 — Homepage PageSpeed & accessibility

Changed:
- **app-pwa:** Homepage marketing images optimized (`phone-image.webp`, `spotlight.webp`, `jobbie-mobile-hero-760.webp`); hero uses `<picture>` + correct aspect ratio; feature sections use `NuxtImg` with `sizes`.
- **app-pwa:** Global CSS slimmed — Font Awesome and CV mini-sheet styles load only on CV/register routes; DM Sans italic deferred via idle plugin; latin WOFF2 preloaded from `/fonts/`.
- **app-pwa:** `preconnect` hints for API, Supabase, and CDN origins in `nuxt.config.ts`.
- **app-pwa:** Homepage SSR includes job category counts; deterministic multi-role CTA pick; hero chips hydrate after mount to avoid mismatch.
- **app-pwa:** Guest auth plugin skips BFF `session/refresh` when no session hint (removes anonymous 401 noise).
- **app-pwa:** Accessibility — removed invalid chip `listitem` ARIA; 44px carousel dots; logo width/height; duplicate footer login removed. Homepage accent color stays bright `marketing-green` (`#22c55e`).

## 2026-06-26 — CV PDF pagination (all templates)

Fixed:
- **backend-ts:** All CV templates (Atlas, Editorial, Minimalist, Monochrome) now use the JS measurement packer for PDF export — splits experience/education entries across A4 sheets instead of dumping most content on page 2 via CSS grid print.
- **backend-ts:** Packer rebuilds `.cv-breakable-section` wrappers when mounting split columns; Atlas page 1 fills the main column by measured height; coupled-column templates prefer the taller column when both sides can grow.
- **backend-ts:** `CV_PDF_RENDERER_REVISION` 14 — stored CV PDFs regenerate.

Fixed:
- **backend-ts:** Editorial / Minimalist / Monochrome — column-based height measurement (`max(main, side)` without `min-height: 100%` stretch) fixes one-section-per-page over-splitting; paginated `.cv-sheet` pages use fixed A4 box with `align-items: start` on grids (`CV_PDF_RENDERER_REVISION` 15).

Changed:
- **backend-ts:** Editorial, Minimalist, and Monochrome CV PDF templates now use the same main/side section order as Atlas (summary → experience → education → extra → hobbies in main; skills → languages → driving in side) (`CV_PDF_RENDERER_REVISION` 16).

Fixed:
- **backend-ts:** Editorial PDF — coupled-column packer fills main-column slack when sidebar drives row height; single-sheet fast path for moderate CVs; orphan guard prevents extra-info-only continuation pages; paginated sheet CSS aligned with design (`CV_PDF_RENDERER_REVISION` 17).

## 2026-06-26 — Hide listings from closed accounts

Fixed:
- **backend-ts:** Account closure (self-delete and admin) now archives active company ads and removes jobs from Typesense; job search hydration re-checks `is_active` / draft so stale index rows are dropped.
- **backend-ts:** Public job and company-ad catalog queries exclude listings whose owner `profiles.is_deleted = true`.
- **jobbie-admin:** Admin account close archives active company ads for the user.

Database:
- Migration `20260726130000_hide_listings_closed_accounts.sql` — backfill inactive jobs / archived ads for closed accounts; `job_offers_public` and `company_ads_public` views join non-deleted owners.

## 2026-06-26 — Checkout purchaser type locked to account type

Changed:
- **app-pwa:** `/platba` — removed buyer-type toggle; `individual` accounts pay as fyzická osoba, `company` accounts as firma.
- **backend-ts:** `assertSkBillingEligible` rejects mismatched `purchaser_type` vs `profiles.role` (also on `applyCheckoutBillingDetails`).

## 2026-06-26 — Fakturácia: billing form by account type

Changed:
- **app-pwa:** `/nastavenia/fakturacia` — fyzické osoby see only SK fakturačná adresa; firemné účty keep Názov firmy / IČO / DIČ / IČ DPH (aligned with `/platba` purchaser types).

## 2026-06-26 — Credits do not expire

Fixed:
- Removed expiring-soon warning from `/nastavenia/kredity` and stopped setting `expires_at` on subscription/free credit grants.
- Disabled `CreditExpirationCron`; migration `20260726120000_credit_lots_no_expiration.sql` clears `expires_at` on remaining lots.

## 2026-06-25 — Profesionáli: open chat from ad detail

Fixed:
- **backend-ts:** `POST /api/company-ads/:id/open-chat` creates or reuses a chat room tied to the ad (`chat_rooms.company_ad_id`); respects owner `public_allow_platform_contact` and active listing visibility.
- **app-pwa:** `CompanyAdOwnerOpenChatActions` uses the company-ad open-chat endpoint (no longer requires a job application via profile open-chat). Chat sidebar/header show the ad title in `job_title` like job-application threads.

Database:
- Migration `20260715130000_company_ad_chat_rooms.sql` — nullable `job_id`, `company_ad_id` FK, inquiry unique index.

## 2026-06-25 — Chat: show other party profile name in list and header

Fixed:
- **backend-ts:** Chat room enrichment and notifications load `company_name` when resolving `other_user_name` / sender labels (company profiles no longer fall back to generic “Konverzácia” / “Profil” in the PWA).

## 2026-06-25 — Job post edit: align BFF cookie auth identity

Fixed:
- **app-pwa:** `fetchUser` / `fetchProfile` use BFF cookies (not stale Bearer) when `shouldPreferBffCookieAuth()` — fixes job wizard 403 when in-memory JWT and `jb_*` session disagreed on localhost.
- **app-pwa:** Hub `JobHubRow` primes `useJobWizardBootstrap` before navigate (skip fragile for-edit GET on first paint).
- **backend-ts:** `GET /api/jobs/:id/for-edit` scopes by `company_id` in SQL (Postgres UUID match).

## 2026-06-25 — Job post wizard: for-edit API + bootstrap hydrate

Fixed:
- **backend-ts:** `GET /api/jobs/:job_id/for-edit` — authenticated owner endpoint for draft/edit wizard (no anonymous 404 on drafts).
- **app-pwa:** Job wizard bootstrap from `/novy` POST (same pattern as company ads); wizard loads via `/for-edit` using default `useApi()` auth (BFF cookies — do not force in-memory Bearer, which caused 403 owner mismatch on localhost).
- **app-pwa:** `[jobId]` pages skip mounting wizard for reserved segment `novy`.

## 2026-06-25 — Job post wizard: auth-ready hydrate + editor CSS

Fixed:
- **app-pwa:** `JobPostWizard` waits for auth and retries draft load after BFF session refresh (draft jobs no longer 404 when cookies were not ready).
- **app-pwa:** `AppRichTextEditor` — use `disabled:cursor-not-allowed` in `@apply` (custom `is-disabled-cursor` is invalid inside `@apply`).
- **app-pwa:** Job create pages (`/vytvorit-ponuku/novy`, foreign variant) call `waitForAuthReady()` before POST; `[jobId]` routes redirect reserved `novy` segment.

## 2026-06-25 — Security scanner remediation (CSP, Permissions-Policy, CORS, privacy links)

Security:
- **app-pwa:** Production CSP enforces per-request `script-src` nonces + `strict-dynamic` (no `unsafe-inline` on HTML); opt-out via `NUXT_CSP_NONCE_RELAXED=1`. CSP omitted on `/_nuxt`, `/_ipx`, `/assets` paths.
- **app-pwa:** `Permissions-Policy` `payment` allowlist uses explicit Stripe origins (no `https://*.stripe.com` wildcard).
- **backend-ts:** CORS regression tests — allowed origin echoed exactly; evil origin rejected (never `Access-Control-Allow-Origin: *`).
- **app-pwa:** Discoverable privacy/terms links on auth pages (`AuthLegalFooter`), registration consent checkboxes, cookie banner, `default` layout; `<link rel="privacy-policy">` in app head.

Changed:
- **docs/auth-security.md** — CORS verification checklist (API, PWA, Supabase, CDN).
- **docs/security/frontend-implementation-summary.md** — CSP nonce enforcement now default in production.

## 2026-06-25 — Security: scan false positives + CAPTCHA wiring

Security:
- **app-pwa:** Remove `password:"Heslo"` bundle false positive (`S.fieldLabelPassword`); parse Supabase hash handoffs via `URLSearchParams` instead of literal `access_token=` string.
- **app-pwa:** Shared `useTurnstileWidget` + `AuthTurnstileWidget`; pass `captchaToken` to Supabase `signUp`, `signInWithPassword`, `resetPasswordForEmail`; Turnstile on forgot-password when keys configured; `/auth/signin` → `/auth/login`, `/auth/signup` → `/auth/register` redirects.

Changed:
- **docs/auth-security.md**, **docs/deployment.md** — Turnstile + Supabase Auth CAPTCHA checklist.

## 2026-06-25 — Security: strip origin Server / Via fingerprint headers

Security:
- **app-pwa:** Remove `Server` and `X-Powered-By` on Nitro responses.
- **backend-ts:** `helmet({ xPoweredBy: true })` + `removeHeader('Server')`.
- **websupport-vps-deployment/Caddyfile:** `-Server`, `-Via`, `-X-Powered-By` on API ingress.
- **docs/deployment.md:** Cloudflare Managed Transform / Transform Rule to remove edge `Server: cloudflare`.

## 2026-06-25 — Security: CDN-Cache-Control no-store on private HTML

Security:
- **app-pwa:** Private document responses send `CDN-Cache-Control: no-store` (Cloudflare edge) alongside `Cache-Control: private, no-store, must-revalidate`.

## 2026-06-25 — Security: X-Frame-Options static route rules (no duplicate from assets)

Security:
- **app-pwa:** `/_nuxt/**` route rules set only `cache-control`; `X-Frame-Options` solely from `security-headers` middleware (avoids middleware + route-rule double-set on asset paths).

## 2026-06-25 — Security: X-XSS-Protection legacy header

Security:
- **app-pwa:** `X-XSS-Protection: 1; mode=block` in `buildPlatformSecurityHeaders()` (via `security-headers` middleware).
- **backend-ts:** Disable Helmet `X-XSS-Protection: 0` default; set `1; mode=block` explicitly.

## 2026-06-25 — Security: Cache-Control no-store on private HTML routes

Security:
- **app-pwa:** `utils/cache-route-policy.ts` + Nitro `cache-control` middleware; `private, no-store, must-revalidate` on auth, CV editor, chat, settings, etc.; explicit `public, max-age=300` on public SSR shells. Fixes `/auth/login` and `/zivotopisy` serving only Cloudflare `max-age=14400`.

## 2026-06-25 — Security: fix duplicate X-Frame-Options (DENY, DENY)

Security:
- **app-pwa:** Move platform security headers to Nitro `security-headers` middleware only; remove `...security` spreads from `nitro.routeRules` (overlapping `/**` + per-route rules duplicated `X-Frame-Options` and CSP on HTML pages).
- **docs/deployment.md:** Cloudflare must not add `X-Frame-Options` on `www` when origin already sets it.

## 2026-06-25 — Security: X-Content-Type-Options coverage

Security:
- **app-pwa:** Spread platform security headers onto `/_nuxt/**`, `/_ipx/**`, `/assets/**` route rules; Nitro `security-headers` middleware sets `nosniff` when absent.
- **backend-ts:** Explicit `helmet({ noSniff: true })`.
- **docs/deployment.md:** Cloudflare Transform Rule for apex→www redirects (edge redirects skip Nitro headers).

## 2026-06-25 — PWA: vibecode / UX authenticity improvements

Changed:
- **app-pwa:** Desktop nav mega-menus keyboard-clickable; register step 4 `<form @submit>`; FAQ accordion ARIA; homepage carousel `radiogroup`; form labels (`AppFormDropdown` `id` + `aria-expanded`, search `aria-label`, login `AppCheckbox` remember-me).
- **app-pwa:** `utils/marketing-ui.ts` + `utils/avatar-palette.ts`; green avatar fallbacks (replaced `#7c3aed`); `rounded-card` / shadow tokens; `.is-clickable` utility (replaces `cursor-pointer` in HTML).
- **app-pwa:** Build guard: `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` must start with `pk_`; `<meta name="referrer">` belt-and-suspenders.

Docs:
- `docs/frontend.md` — marketing layout tokens section.

## 2026-06-21 — CV builder: fix PATCH body stripped by ValidationPipe (root cause)

Fixed:
- **backend-ts:** `CvHeaderPatchDto` and all CV section upsert DTOs lacked `class-validator` decorators. Global `ValidationPipe({ whitelist: true })` stripped every field from `PATCH /api/cv/:id` bodies before they reached `CvService`, so nothing was written to `cv_personal_info` (only `cvs.updated_at` changed). Added decorators to all CV write DTOs + regression tests.

## 2026-06-21 — CV builder: fix personal data not persisting

Fixed:
- **backend-ts:** `PATCH /api/cv/:id` upserts `cv_personal_info` / `cv_job_preferences` when the child row is missing (was silent no-op on `UPDATE`); merged CV header reads personal fields after shell so they are not overwritten; ensures child rows exist, verifies DB write, and surfaces errors instead of silent failure.
- **app-pwa:** Header autosave sends a **full** header snapshot on flush (Pokračovať / Dokončiť / blur), no longer replaces local edits with empty server values, blocks navigation when save fails, and shows an in-form error when flush fails.

## 2026-06-21 — PWA: fix auth/register 500 (service worker navigation)

Fixed:
- **app-pwa:** Service worker no longer serves prerendered homepage HTML for all SPA navigations (`NavigationRoute` → `createHandlerBoundToURL('/')`). Hybrid SSR + CSR routes (`/auth/register`, `/auth/login`, …) now fetch the correct document from the network; fixes production registration/login hitting generic 500 after SW install.

## 2026-06-21 — GDPR: ÚOOÚ SR new registered office address

Changed:
- `/ochrana-osobnych-udajov`: supervisory authority contact updated to Galvaniho Business Centrum II, Galvaniho 7/B, 821 04 Bratislava (ÚOOÚ SR sídlo od 1. 6. 2026).

## 2026-06-21 — Cookie consent: GTM Consent Mode + Clarity teardown

Fixed:
- **app-pwa:** GTM container bootstraps on every page (Consent Mode default-denied); GA4/Clarity tags fire on `analytics_storage` grant instead of lazy-loading `gtm.js` after accept (missed `Window Loaded` triggers).
- **app-pwa:** Withdrawing analytics consent purges GTM-injected Clarity/GA scripts, clears `_clck`/`_clsk`/`_ga*` with `Secure`/`SameSite`, and Clarity storage keys — cookies no longer persist after deny.
- **app-pwa:** Legacy `jb_consent` v1 choices replay on boot (v2 `policy` gate no longer blocks prior accepts).

Docs:
- `docs/observability-runbook.md` — GTM Consent Mode bootstrap note.

## 2026-06-21 — CodeQL CI: opt-in SARIF upload

Fixed:
- `.github/workflows/codeql.yml` — SARIF upload only when repo variable `CODEQL_UPLOAD=true` (avoids CI failure when GitHub Code scanning is disabled). Analysis still runs; fork PRs never upload.

## 2026-06-21 — Cookie consent log: surface missing migration

Fixed:
- Admin `GET /admin/consent/cookie-log` no longer returns empty list on DB errors; reports missing `cookie_consent_log` table with migration hint.

## 2026-06-21 — Admin infra SSH fix; backend /metrics hardening

Fixed:
- **jobbie-admin:** `vps-ssh-metrics.service.ts` — `import * as path from 'path'` (CommonJS `path.resolve` was undefined); clearer error when `VPS_*_SSH_PRIVATE_KEY` is a placeholder.
- **backend-ts:** `GET /metrics` uses `@Res({ passthrough: true })`, explicit `@Public()`, and try/catch around Prometheus export (401/503 as Nest exceptions).

## 2026-06-21 — Admin analytics: PostHog cross-check fix

Fixed:
- Analytics **Web & marketing** no longer compares PostHog pageviews to platform signups (different metrics — false warning). Cross-check runs only when both PostHog and GA4 are configured (pageviews + active users).

## 2026-06-21 — Invoice description restored; PDF logo watermark (Dashboard)

Changed:
- Credit invoice `description` (memo *Kredity na využívanie…*) is set again on Stripe PDF.

Docs:
- Large company name in the upper-right PDF corner is Stripe **Branding → Logo/Icon**, not API — remove in Dashboard (test + live).

## 2026-06-21 — SK credit invoice PDF cleanup (no DPH footer, no pay link)

Fixed:
- Removed default DPH/legal footer text from Stripe faktúry; footer is poznámka (+ optional `STRIPE_INVOICE_FOOTER` only).
- Credit invoices: no header `description` (removes large corner text on PDF).
- Paid credit invoices: `attachPayment` with succeeded PI instead of only `paid_out_of_band`.
- Customer `invoice_settings`: explicit `custom_fields: []` clears legacy konštantný symbol; no customer-level footer.
- API/PWA: konštantný symbol never returned; no legal footer fallback in app.

## 2026-06-21 — SK credit invoice content (bundle line, footer, buyer VAT)

Fixed:
- Credit-pack faktúry: jeden riadok **balík** (qty 1, cena balíka), popis obsahuje počet kreditov — nie jednotková cena ÷ počet.
- Odstránený konštantný symbol z nových faktúr; staré PDF ho môžu mať v `custom_fields`.
- Pätička: dodávateľ **nie je platiteľom DPH** pri predaji; `STRIPE_INVOICE_AUTOMATIC_TAX` predvolene vypnuté (zapnúť explicitne).
- Odberateľské IČ DPH len cez custom field „IČ DPH“; `eu_vat` na Customer sa pri checkoute maže (žiadna duplicitná „SK VAT“ na PDF).
- Uhradené kreditové faktúry bez `payment_settings` (žiadne „Zaplatiť online“ na PDF).

Changed:
- PWA `/nastavenia/fakturacia/:id`: konštantný symbol len ak existuje; fallback pätička zladená s backendom.

Docs:
- [stripe-invoice-sk-vat.md](./stripe-invoice-sk-vat.md) — PDF dodávateľ = Stripe Dashboard Business details; bundle line, buyer VAT, automatic tax.

## 2026-06-21 — pdfjs-dist 6 (Dependabot PR #28)

Changed:
- `pdfjs-dist` 4.10.38 → 6.0.227 (chat PDF attachment thumbnails).
- PWA `engines.node` → `>=22.13.0` (required by pdfjs-dist 6).
- `pwa-bundle-budget` and `pwa-cloudflare-deploy` GitHub Actions jobs use Node 22 (was 20).

## 2026-06-21 — Atlas CV PDF layout

Fixed:
- Atlas PDF — Doplňujúce informácie and Záujmy stack vertically (`.atlas-stack`) instead of a narrow two-column grid that broke letter-spaced headings and hobby text.
- Atlas PDF — birth date in Kontakt renders as Slovak `DD. MM. YYYY` (e.g. `01. 01. 2000`) instead of ISO `YYYY-MM-DD`.
- Atlas direct-print PDF — minimum A4 page height and fixed sidebar stripe (`::before`) so the blue panel fills the full page in Playwright output.
- Atlas PDF — JS pagination packer restored (per-sheet full-height sidebar chrome) so the blue panel is continuous on every A4 page; editorial/minimalist/monochrome stay on direct CSS print.
- Atlas PDF — fixed `.cv-sheet` height (excluded from `resume-page { height: auto }`) so page-1 sidebar fills full A4 when main content is taller.
- Atlas PDF pagination — raised A4 height budget and single-page fast path so typical CVs are not split when sidebar + main fit on one sheet.
- Atlas PDF sheets — absolute full-height sidebar panel per A4 page; pagination measures column overflow so main content is not clipped (fixes blank work experience).

## 2026-06-21 — Credit invoice creation (Stripe amount+quantity)

Fixed:
- Post-payment SK faktúra for credit packs failed silently: Stripe rejects `amount` + `quantity` on the same invoice item. Line items now use `unit_amount` or `unit_amount_decimal` × počet kreditov.
- Draft invoice cleanup before credit faktúra no longer deletes subscription draft invoices.

## 2026-06-21 — Stripe Payment Element / PI payment method alignment

Fixed:
- Credit PaymentIntents and SetupIntents use `payment_method_types: ['card']` (not `automatic_payment_methods`) to match Payment Element deferred checkout.
- Removed PI updates that enabled `automatic_payment_methods` on subscription invoice PaymentIntents (caused confirm error).
- `/platba` deferred checkout: `elements.submit()` runs before PI creation; no remount that cleared entered card data; API errors from `preparePayment` are no longer masked as generic „Platba nebola dokončená“.

## 2026-06-21 — SK faktúra vzory (CoCreate / kredity / predplatné)

Changed:
- Stripe faktúry: štandardizované popisy položiek, poznámky a obdobie predplatného podľa účtovných vzorov (predaj kreditov + mesačné predplatné, firma / FO).
- Kreditové faktúry: množstvo = počet kreditov (ks), jednotková cena z uhradenej sumy.
- Predplatné: webhook `invoice.created` upraví draft faktúru (popis, poznámka, obdobie).
- Dodávateľ v aplikácii: predvolene CoCreate s. r. o. (`BILLING_SUPPLIER_*`, `BILLING_SUPPLIER_OR`).
- PWA detail faktúry: stĺpec jednotka, poznámka, obdobie predplatného, OR dodávateľa.

Docs:
- [`docs/stripe-invoice-sk-vat.md`](./stripe-invoice-sk-vat.md).

## 2026-06-21 — Invoice legal footer and past-due billing copy

Changed:
- PWA invoice detail always shows SK DPH legal footer (`settingsInvoiceLegalFooter`); pay section restored for open **subscription** invoices (`can_pay`).
- Fakturácia past-due banner includes inline **Zmeniť kartu** action on `/nastavenia/fakturacia`.

## 2026-06-21 — Post-payment credit invoices

Changed:
- Credit checkout (`create-payment-intent-credits`) uses a standalone PaymentIntent; SK faktúra is created only after `payment_intent.succeeded` (`paid_out_of_band` on Stripe Invoice).
- Abandoned open credit invoices are voided on new checkout; incomplete subscription cancel voids the open first invoice; `payment_intent.canceled` voids legacy invoice-backed open invoices.
- `GET /api/payments/invoices` and invoice detail return **paid** invoices and **open** subscription renewal invoices (past_due pay flow).

Docs:
- [`docs/payments-credits.md`](./payments-credits.md), [`docs/stripe-invoice-emails.md`](./stripe-invoice-emails.md).

## 2026-06-21 — Admin Infra VPS dashboard

Added:
- **Infra** screen in `jobbie-admin` (`/infrastructure`): staging + production VPS cards with API health, host CPU/RAM/disk (SSH), Docker stats, optional Nest Prometheus metrics.
- Admin API `GET /api/admin/infrastructure` (scope `overview`, throttle 6/min).
- `websupport-vps-deployment/scripts/host_metrics.sh` — read-only JSON metrics script for SSH collection.

Docs:
- [`jobbie-admin/api/.env.example`](../jobbie-admin/api/.env.example) — `VPS_STAGING_*` / `VPS_PRODUCTION_*` env vars.
- [`docs/admin-desktop.md`](./admin-desktop.md) — Infra endpoint and operator setup.

## 2026-06-21 — PWA dependency bumps (Dependabot CI)

Changed:
- `app-pwa`: `isomorphic-dompurify` ^3.18.0 (patched DOMPurify), `@supabase/supabase-js` ^2.108.2.
- PWA CI and `engines.node` aligned to `>=20.19.0` / Node 22 in GitHub Actions (required by isomorphic-dompurify 3.17+).
- Dependabot: ignore TypeScript 6 major bumps in `app-pwa` and `backend-ts` until toolchain migration.

## 2026-06-21 — Deploy health check URL sanitization

Fixed:
- `deploy_backend.sh` strips CR/LF from `HEALTH_URL` and `APP_DOMAIN` before `curl` (GitHub `vars.STAGING_HEALTH_URL` with an embedded newline caused `curl: (3) URL rejected: Malformed input`).
- SSH deploy workflows strip newlines from `HEALTH_URL` before invoking the script.

## 2026-06-19 — Backend dead code cleanup

Changed:
- Removed unused helpers, Nest providers (`TwilioSmsService`, `PaidPlanAccessService` class), and auth guard stack (`RolesGuard`, `AppRoleGuard`, `AdminMfaGuard`) from public `backend-ts` API — admin MFA/roles remain in [`jobbie-admin/api`](../jobbie-admin/api).
- Removed legacy payment routes (`checkout-session`, `checkout-credits`, `create-payment-intent-job`, `checkout-subscription`, `GET config`, `GET credit-packs-config`) and gone multipart storage routes (`job-photo`, `profile-avatar`).
- Public blog detail sanitizes `body_html` via `sanitizeBlogBodyHtml` on read.

Docs:
- [`backend.md`](./backend.md), [`payments-credits.md`](./payments-credits.md), [`SECURITY.md`](./SECURITY.md), [`auth-security.md`](./auth-security.md).

## 2026-06-19 — Remove legacy subscription Checkout Session

Changed:
- Removed Stripe hosted/embedded Checkout Session for subscriptions (`createSubscriptionCheckoutSession`, `StripeEmbeddedCheckout.vue`).
- Added `POST /api/payments/activate-free-plan` for downgrade to `zadarmo`; PWA `usePricingPlanCheckout` uses it.
- `POST /api/payments/checkout-subscription` now returns `400` (deprecated — use `/platba` or `activate-free-plan`).

## 2026-06-19 — SK-only billing for credits and subscriptions

Added:
- Backend: `assertSkBillingEligible` on credit/subscription PaymentIntent creation — SK address, individual attestation, company IČO + RPO lookup.
- PWA `/platba`: SK policy notice, individual residence checkbox, client IČO format check; `/cennik` billing notice with contact link.

Security:
- Non-SK `address_country` or invalid company IČO returns `400` before Stripe PaymentIntent is created.

Docs:
- [`payments-credits.md`](./payments-credits.md) — SK-only purchase policy section.

## 2026-06-15 — No email for monthly credit grants

Changed:
- Subscription monthly credit grants (paid + free plan) notify in-app only — no SMTP email or web push (`omitExternalChannels`).
- One-time credit pack purchases (`Kredity pripísané` webhook) — in-app only, no email or push.

## 2026-06-15 — Disable stub weekly digest email

Changed:
- Backend: weekly digest cron and `runWeeklyDigest` no-op (`WEEKLY_DIGEST_EMAIL_ENABLED = false`) — placeholder “týždenný prehľad” emails no longer send.
- Default `digest` email preference off (backend + PWA matrix) until a real digest template exists.

## 2026-06-15 — SEO title suffix and geographic scope

Fixed:
- PWA: removed double brand suffix (`— JOBBIE — JOBBIE`) — `usePageSeo` passes page-only title to `titleTemplate`; `formatBrandedSeoTitle` sets OG/Twitter titles.
- Homepage and default meta copy now mention Slovensko aj v zahraničí; error page titles no longer embed brand (template adds it once).

## 2026-06-15 — SEO titles and meta descriptions

Changed:
- PWA: improved static SEO copy (homepage, job/foreign/professional catalogs, blog, cenník, job alerts, trust pages) with keyword-focused Slovak titles and ~155-char descriptions.
- `find-catalog-seo.ts` now reads catalog descriptions from `strings.ts`; job catalog pages pass dedicated `seoTitle` props.
- Job/blog/profile detail meta: category in job descriptions, truncated blog/profile fallbacks, profile titles with `| Profil` suffix.

## 2026-06-15 — Footer Návody column

Changed:
- `AppSiteFooter` **NÁVODY**: six labels only — ako to funguje, registrácia, služba, pracovná ponuka, profil, topovanie služby alebo ponuky.

## 2026-06-15 — Staging deploy health check fallback

Fixed:
- Staging GitHub Actions deploy no longer falls back to `https://api.cocreate.cz/health` (wrong project). `deploy_backend.sh` derives `https://{APP_DOMAIN}/health` from the VPS `.env` when `STAGING_HEALTH_URL` / `HEALTH_URL` is unset.

## 2026-06-15 — Stripe Payment Element billing address on confirm

Fixed:
- PWA: credits checkout Payment Element hides each billing address subfield (`never`) while invoice/card setup uses `if_required`; `confirmPayment` passes full address including `state` (city fallback for SK).
- PWA: deferred checkout Elements use `paymentMethodTypes: ['card']` to match invoice-backed PaymentIntents (`payment_method_types: ['card']`), fixing automatic-PM confirm mismatch.

## 2026-06-15 — Slovak Stripe invoice format (iDoklad-style)

Changed:
- Stripe invoices: konštantný symbol `0308` (`STRIPE_INVOICE_CONSTANT_SYMBOL`), card-only `payment_settings`, A4 PDF, SK footer with late-payment text; customer `invoice_settings` for subscription renewals.
- `/nastavenia/fakturacia/:id`: variabilný symbol (= číslo faktúry), symboly, dátumy dodania, spôsob úhrady „Kartou / online platba“.

Docs:
- [stripe-invoice-sk-vat.md](./stripe-invoice-sk-vat.md) — Dashboard numbering, no bank transfer, symbols checklist.

## 2026-06-15 — Privacy policy as HTML page

Changed:
- `/ochrana-osobnych-udajov`: replace PDF embed with full Slovak GDPR text (`privacy-policy-content.ts`); `MarketingContentPage` supports bullet lists and subsection headings.

## 2026-06-15 — Stripe Node SDK 22 (Dahlia API)

Changed:
- `backend-ts`: bump `stripe` from 14.25.0 to 22.2.1; pin `apiVersion` to `2026-05-27.dahlia`.
- Billing helpers for Dahlia/Basil field moves: subscription period on `items`, invoice `parent.subscription_details` and `payments`, invoice line `pricing`, checkout `ui_mode: embedded_page`.

## 2026-06-15 — backend-ts dependency bumps (archiver 8, sharp 0.35)

Changed:
- `archiver` ^8.0.0 + `@types/archiver` ^8.0.0 — `ZipArchive` class API (runtime `require` for ESM package + Jest).
- `sharp` ^0.35.1 — removed deprecated `@types/sharp`; callable `require` cast in `image-process.service.ts`.

## 2026-06-15 — Fix CORS middleware crash (production)

Fixed:
- `backend-ts`: load `cors` via `require()` in `http-cors.util.ts` so compiled `dist/main.js` no longer calls `cors_1.default` (TypeError on `GET /` and `/api/*` when Docker image was built without `esModuleInterop`; `/health` was unaffected).

## 2026-06-15 — Cookie consent CMP compliance

Added:
- `cookie_consent_log` table + `POST /api/consent/cookie` (anonymous or authenticated) for CMP audit trail.
- jobbie-admin **Cookie súhlas** view (`/consent-log`) and per-user history on support user detail.
- `jb_consent` v2 payload (analytics, marketing, personalization, policy version) and `jb_consent_vid` visitor cookie.

Fixed:
- Cookie withdrawal: preferences modal mounted globally in `AppCookieConsentHost`; unsaved-close confirm; consolidated `useConsentCookieRef()`.
- PostHog/Sentry teardown and prior blocking when consent withdrawn.

Changed:
- Marketing and personalization CMP categories (inactive until integrations exist); Sentry gated on analytics consent; modal a11y (focus trap, Escape, close button).

Database:
- `20260715120000_cookie_consent_log.sql`

## 2026-06-13 — PWA media proxy (Nitro `/media`)

Added:
- `GET /media?url=` Nitro route — caches public `job-photos` and `profile-avatars` from Supabase; set `NUXT_PUBLIC_MEDIA_CDN_URL=/media`.

## 2026-06-13 — Supabase egress reductions

Changed:
- **Storage:** public objects get `Cache-Control: public, max-age=31536000, immutable` on finalize; job photo uploads also write a `{uuid}_thumb.jpg` list variant (640px).
- **Jobs catalog:** list API returns cover thumb URLs only; feed scoring uses `skill_tags` instead of shipping `description`/`requirements`; public catalog reads use `getReadClient()` when configured.
- **Cache:** `AnonymousCatalogCacheInterceptor` on `GET /jobs` and `GET /company-ads` (60s CDN for anonymous); SEO feeds cached in Redis (15 min); PWA `/_ipx/**` long cache headers.
- **PWA:** CV signed photo URL in-memory cache; job card thumbnails fall back from thumb → full URL → placeholder.

Docs:
- `docs/scalability.md` — egress / media CDN notes.

## 2026-06-13 — Fix CORS middleware crash in Docker production build

Fixed:
- `backend-ts/tsconfig.json`: enable `esModuleInterop` so `import cors from 'cors'` compiles correctly (`cors_1.default is not a function` on `/api/*` OPTIONS/GET in GHCR image; `/health` was unaffected).

Changed:
- `websupport-vps-deployment/Dockerfile`: retry `npm ci` on transient registry errors (common on arm64 QEMU in GHA).
- `backend-ghcr.yml`: staging branch builds `linux/arm64` only (staging VPS); `main`/tags still build amd64+arm64.
- Rename `deploy_staging.sh` → `deploy_backend.sh` (shared VPS deploy; prod workflows no longer reference a staging-named script).
- `deploy_backend.sh`: `docker compose up --wait` (180s) plus retried external `/health` curl — fixes false-fail 502 right after container recreate.

## 2026-06-12 — PWA Cloudflare deploy (GitHub Actions)

Added:
- `pwa-pages` — push `staging` / `main` on `app-pwa/**`: test, `build:cloudflare`, deploy via Wrangler to Cloudflare Pages.
- Reusable `pwa-cloudflare-deploy.yml`; manual **deploy-pwa-staging** / **deploy-pwa-production**.
- PWA host/project via GitHub Environment vars `PWA_PAGES_PROJECT`, `PWA_PAGES_BRANCH`, `NUXT_PUBLIC_SITE_URL` (Phase 1: staging on `jobbie.sk`; Phase 2: `staging.jobbie.sk` + prod `jobbie.sk`).

Changed:
- Docs: `NUXT_PUBLIC_API_BASE_URL` is API origin without `/api` suffix.

## 2026-06-12 — VPS deploy: pass env vars through sudo

Fixed:
- GitHub Actions SSH deploy passes `BACKEND_VERSION`, `GHCR_*`, and `HEALTH_URL` on the `sudo` line — default `sudo bash` stripped them (`BACKEND_VERSION is required`).

## 2026-06-12 — Staging & production deployment manual

Docs:
- [`docs/staging-production-manual.md`](./staging-production-manual.md) — full runbook: architecture, Git/GitHub (`staging`/`main`), CI/CD workflows, VPS bootstrap (staging + prod), env files, migrations, PWA, Stripe, release checklist, troubleshooting.

## 2026-06-12 — Branch-based backend deploy (staging / main)

Added:
- `backend-ghcr` triggers on push to **`staging`** and **`main`** (path-filtered); auto image tags `staging-YYYY.MM.DD-<sha7>` vs `YYYY.MM.DD-<sha7>`; `:latest` only on `main` and `backend-v*` tags.
- `deploy-production` job in `backend-ghcr` + workflow **deploy-production** (SSH via `PROD_SSH_*`, `PROD_GHCR_TOKEN`, `production` environment).
- Docs: branch promotion flow, production GitHub secrets, optional production environment approval.

Changed:
- `deploy_staging.sh` success message is environment-neutral (same script for staging and prod VPS).

## 2026-06-12 — Health check CORS bypass and Typesense compose probe

Fixed:
- `GET /health` skips credentialed CORS middleware so Docker, `curl`, and `deploy_staging.sh` work without an `Origin` header in production.
- `websupport-vps-deployment/docker-compose.yml` Typesense healthcheck uses bash `/dev/tcp` (image has no `wget`).

## 2026-06-12 — Staging auto-deploy after GHCR push

Added:
- `websupport-vps-deployment/scripts/deploy_staging.sh` — GHCR login (private package), set `BACKEND_IMAGE`, `compose pull` + `up -d backend`, health check.
- `backend-ghcr` job `deploy-staging` (SSH + optional `skip_deploy` on manual runs); workflow `deploy-staging` for redeploy-only.
- Docs: GitHub secrets (`STAGING_SSH_*`, `STAGING_GHCR_TOKEN`), `staging` environment, private GHCR `read:packages` PAT.

## 2026-06-12 — Backend CI: PWA build and test

Fixed:
- `backend-ci` triggered on `app-pwa/**` but only ran backend `build-and-test` plus `pwa-npm-audit` (no compile/typecheck). Added `pwa-build-and-test` (`npm test`, `npm run build`) so PWA-only PRs and pushes cannot pass CI without a green PWA build.

## 2026-06-12 — GHCR multi-arch (amd64 + arm64)

Fixed:
- `backend-ghcr` publishes `linux/amd64,linux/arm64` (staging ARM VPS + production x86); QEMU + Buildx on GHA amd64 runners. Same tag on both hosts — Docker picks the matching manifest.

## 2026-06-12 — Backend CI Node 22

Changed:
- `backend-ci` `build-and-test` and `npm-audit` jobs use Node 22 (matches `backend-ghcr` and production `node:22-bookworm-slim` image).

## 2026-06-12 — Backend CI: Jest exceljs + CV pagination bootstrap

Fixed:
- `employer-applicants.service.spec.ts` — Jest `moduleNameMapper` shim for `exceljs` (avoids ESM `uuid` parse error in CI).
- `cv-document-html.spec.ts` — track `cv-document-pagination.bootstrap.js` in git (was gitignored; required at runtime by `cv-document-pagination.node.ts` and Nest asset copy).
- CI Playwright — `scripts/ensure-playwright-browsers.cjs` + `pretest` installs `chromium-headless-shell` when `CI=true`; verify via headless launch (not `executablePath()`, which points at full Chromium).

## 2026-06-12 — Restore CV API sources for CI

Fixed:
- GitHub Actions failed because `cv.service`, `cv.controller`, `cv.dto`, and `cv.module` were never committed (only compiled `.js` existed locally under `backend-ts/src/cv/`, gitignored).
- Added TypeScript sources: `cv.dto.ts`, `cv.module.ts`, `cv-skill-name.ts`.
- Committed legacy compiled `cv.service.js`, `cv.controller.js`, `cv-scoped-sections.controller.js` (+ `.d.ts`) until full TypeScript port of the large service/controller files.

## 2026-06-11 — CV builder PDF export auth

Fixed:
- `fetchApiBinary` (CV PDF download/preview) now matches `useApi` session recovery: Bearer fallback after BFF refresh on 401, `credentials: 'omit'` when using Bearer (avoids stale `jb_*` cookie conflicts), CSRF ensure/retry on mutations.

## 2026-06-11 — PWA dev: blank page from IndexNow route

Fixed:
- Removed `server/routes/[key].txt.get.ts` — Nitro registered `/:key.txt` as a catch-all `key.txt` param, so every path returned 404 and Nuxt showed a blank error overlay in dev.
- IndexNow key file is now served from `server/middleware/indexnow-key-txt.ts` with explicit `/{key}.txt` matching (still skips `robots.txt` / `llms.txt`).

## 2026-06-11 — Security: employer CV database GDPR redaction

Fixed:
- `GET /api/employer/cv-database/:cvId` no longer exposes `has_disability` (including `false`) on the CV shell; `sanitizeHeaderForEmployerDatabaseView` omits the field instead of sending a boolean.

## 2026-06-11 — SEO/AEO: llms.txt, feeds, SSR, IndexNow

Added:
- Site-level `/llms.txt` (Slovak curated index) and `# LLMs:` hint in `robots.txt`.
- RSS + JSON Feed for jobs and company ads (`/feeds/jobs.rss`, `/feeds/jobs.json`, `/feeds/ads.rss`, `/feeds/ads.json`) backed by `GET /api/seo/feeds/*`.
- IndexNow: `INDEXNOW_KEY` on API (publish hooks), `NUXT_PUBLIC_INDEXNOW_KEY` + `/{key}.txt` on PWA; GSC/Bing verification meta env vars.

Changed:
- Homepage and `/profesionali` catalog SSR for job/ad listings; `FAQPage` on `/`, `ItemList` on catalogs; richer Slovak default meta copy.
- `JobPosting` JSON-LD: `identifier`, `directApply` / `applicationContact`.

Docs:
- `docs/seo-implementation.md`, `docs/aeo-geo-implementation-summary.md`, `.env.example` files.

## 2026-06-09 — Login: passkey autofill (Conditional UI)

Changed:
- `/auth/login` — passkey sign-in via WebAuthn Conditional UI in the email field (`autocomplete="username webauthn"`); no dedicated passkey button or discoverable prompt on submit. Aborts pending autofill when password/OAuth/forgot-password flows start.

## 2026-06-09 — GDPR privacy policy PDF

Added:
- Official GDPR document (`public/docs/gdpr-jobbie.pdf`) on `/ochrana-osobnych-udajov` (footer **Ochrana súkromia**) with inline viewer and PDF download.

## 2026-06-09 — Homepage: CTA zamestnávateľa

Changed:
- Employer CTA subtext: „1 inzerát zadarmo mesačne“ (namiesto 5 inzerátov).

## 2026-06-09 — Cenník: oprava cien a zjednodušenie kreditov

Changed:
- `/cennik` — záložka **Jednorazové kredity**: kompaktná `PricingCreditsUsageSection` so 4 skutočnými platiteľnými akciami a cenami z `planTierCreditCosts` (zhodné s wizardmi); odstránený nadbytočný text (Stripe poznámka, „Prihláste sa“, nesprávne `CREDIT_COSTS` položky).

## 2026-06-09 — Terminology: poskytovateľ → profesionál

Changed:
- PWA user-facing copy, home carousel/FAQ role keys, and provider dashboard route `/dashboard/poskytovatel` → `/dashboard/profesional` (301 redirect from old path). Middleware renamed to `dashboard-profesional`.

## 2026-06-09 — Uchádzač terminology (PWA copy)

Changed:
- User-facing copy: „brigádnik / brigádnici“ → „uchádzač / uchádzači“ across PWA strings, FAQ, registration, trust pages, and pricing copy. Legal employment labels (e.g. „Brigáda (dohoda)“) unchanged.

## 2026-06-09 — Supabase Auth SMTP troubleshooting doc

Docs:
- `docs/email-smtp.md` — Supabase Auth SMTP setup, `535` auth failure checklist (password reset vs Nest `SMTP_*`).

## 2026-06-09 — Forgot-password send reliability

Fixed:
- PWA forgot-password — `resetPasswordForEmail` `{ error }` is now checked (previously ignored because Supabase JS does not throw); rate limit, captcha, and validation failures show actionable errors instead of a false “check your email” screen.
- Auth `redirectTo` uses `NUXT_PUBLIC_SITE_URL` when set (canonical production origin) instead of only `window.location.origin`.

Changed:
- [`reset-password.html`](../supabase/email-templates/reset-password.html) — simpler `or`/`printf` link template (re-paste into Supabase Dashboard if already deployed).

## 2026-06-09 — Unified contact email

Changed:
- All platform contact/support defaults (`info@`, `podpora@`, `support@`) → `ahoj@jobbie.sk` in PWA strings, SEO JSON-LD, trust pages, pricing FAQ, backend pricing inquiries, data export README, VAPID subject, and `.env.example` files.

## 2026-06-09 — Supabase Auth email templates (JOBBIE brand)

Added:
- [`supabase/email-templates/`](../supabase/email-templates/) — branded HTML for all six Supabase Auth templates (confirm signup, invite, magic link/OTP, change email, reset password, reauthentication); Slovak copy; login-card visual language (mint bg, gradient header, white wordmark, pill CTA).

Changed:
- [`supabase/AUTH-EMAIL-TEMPLATES.md`](../supabase/AUTH-EMAIL-TEMPLATES.md) — full dashboard mapping, subjects, PKCE `token_hash` paths, testing checklist.
- PWA `/auth/callback` — `verifyOtp({ token_hash, type })` for signup, invite, magic link, and email change handoffs.

Docs:
- `docs/auth-security.md` — link to full Auth email template set.

## 2026-06-05 — CV PDF: CSS print pagination (no JS packer)

Changed:
- CV PDF — replaced JS DOM-packer on the PDF path with direct CSS print (`buildCvDocumentPrint` → `renderPdfDirect`). Chromium breaks at A4 naturally; `break-inside: avoid` keeps entries intact; Atlas blue sidebar painted on all pages via `background-attachment: fixed`. HTML náhľad (debug) still uses the packer. Renderer revision 13.

## 2026-06-05 — Passkeys after BFF bearer fallback

Fixed:
- `ensureSupabaseAuthSession`: try `supabase.auth.refreshSession()` before BFF cookie refresh; `applySupabaseSessionTokens` after login when BFF cookies are not bound (settings enroll/list/sign-in).
## 2026-06-05 — Login: no forced passkey + stale cookie 401 fix

Fixed:
- Login form and navbar **Prihlásiť sa** use email/password (or Google) only — no automatic discoverable passkey prompt on submit.
- Post-login bootstrap: clear BFF cookies before `GET /api/auth/me`; omit cookies on Bearer-only bootstrap requests (fixes 401 from conflicting `jb_*` + fresh Supabase JWT on localhost).
- Post-login logout (~1s): all `useApi` Bearer requests use `credentials: 'omit'`; verify BFF cookies after `establishSession` (dev proxy fallback to Bearer); auth plugin skips sign-out on token profile fetch 401; brief login-bootstrap guard for deferred Supabase `onAuthStateChange`.

## 2026-06-05 — OAuth callback localhost handoff

Fixed:
- PWA `/auth/callback`: `loginBootstrap` + `finishAuthAfterSignIn` (same as password login); handle `exchangeCodeForSession` / OAuth errors; redirect to login with message on failure.
- Auth plugin: skip aggressive sign-out on `/auth/callback` during PKCE handoff (`isAuthCallbackRoute`).
- Login: show `auth_callback_failed` query error; surface post-auth bootstrap failure when Supabase session exists without Nest user.

## 2026-06-05 — Google Sign-In OAuth branding runbook

Docs:
- [`supabase/AUTH-GOOGLE-OAUTH.md`](../supabase/AUTH-GOOGLE-OAUTH.md) — Google Cloud brand verification (free tier), OAuth client URIs, Supabase URL config, production test checklist; Pro+ Custom Domain (`auth.jobbie.sk`) notes.
- `docs/auth-security.md` — Google OAuth branding subsection; production redirect URLs in Supabase URL configuration.
- `docs/deployment.md` — link to Google OAuth runbook; `NUXT_PUBLIC_SUPABASE_URL` custom-domain note.

## 2026-06-05 — Password recovery link + forgot-password UX

Fixed:
- PWA `/auth/reset-password`: recovery session via `verifyOtp({ token_hash, type: 'recovery' })` so reset links work when opened outside the requesting browser; PKCE `code` kept as fallback.

Changed:
- Login **Zabudol som heslo**: email-only step when empty; sent confirmation with optional webmail button (`email-webmail-url.ts`).

Added:
- `bootstrap-password-recovery-session.ts`, `auth-recovery.spec.ts`, `email-webmail-url.spec.ts`.
- [`supabase/AUTH-EMAIL-TEMPLATES.md`](../supabase/AUTH-EMAIL-TEMPLATES.md) — Reset password template must use `TokenHash` + `RedirectTo`.

Docs:
- `docs/auth-security.md` — password reset + email template section.

## 2026-06-04 — PWA Windows install & Cloudflare build scripts

Changed:
- PWA: `npm run build:cloudflare` uses local Nuxt (not `npx nuxi`); `NUXT_IGNORE_LOCK=1` for deploy builds.
- PWA: `npm run ci:win` / `ci:win:quarantine` / `clean:win-native` for Windows EPERM cleanup; README documents dev-server lock on `esbuild.exe`.

## 2026-06-04 — Homepage hero & app download art

Changed:
- PWA homepage hero phone column: `jobbie-mobile-hero.webp` (`HomeHeroSection`).
- PWA “Jobbie vždy po ruke” download block: `jobbie-app.webp` (`HomeMarketingBlogFaqNewsletter`).

## 2026-06-04 — Activity roles gate features (not account type)

Changed:
- **Feature access** uses profile activity flags (`customer_role`, `worker_role`, `provider_role`), not `profiles.role` (individual vs company). Account type remains for firma settings (IČO, `/nastavenia/firma`) only.
- PWA nav (`account-nav-access`), `customer-only` middleware (replaces `company-only` on employer routes), `useCan`, job-alert redirects.
- Backend: `ProfileActivityAuthorizationService`; job create + employer CV DB require `customer_role`; job email alerts require `worker_role` for all account types. Profile auth cache invalidated when activity flags change.

Changed (same release):
- PWA **Nastavenia → Profil**: account type (Jednotlivec / Firma · SZČO) is editable; link to firemný profil when company.
- PWA role checkboxes: debounced multi-save fixes only-first-toggle persisting.

Fixed:
- `PATCH /api/profiles/me`: `role` whitelisted (`individual` | `company`); profile auth cache invalidated on change.

## 2026-06-03 — Login passkey on Prihlásiť sa

Changed:
- Login: **Prihlásiť sa** tries passkey (discoverable WebAuthn) first when the browser supports it; cancel or no passkey falls back to e-mail + password. No separate passkey button.
- Fix: passkey login no longer gets wiped by stale-session `signOut` on `/auth/login` reload; explicit `setSession` + BFF `establishSession` retry; login bootstrap flag held through handoff so auth plugin does not sign out mid-flow.
- Navbar **Prihlásiť sa** (desktop + mobile drawer) tries passkey first via `usePasskeySignInFlow`; cancel or unsupported browser opens `/auth/login` with redirect preserved.

## 2026-06-03 — Supabase auth bridge (MFA / passkeys)

Fixed:
- `ensureSupabaseAuthSession()`: BFF cookie refresh now calls `supabase.auth.setSession` (`syncSupabase: true`) so security settings (TOTP, passkeys, email/password) work after production login without persisted Supabase tokens.
- BFF refresh sync: avoid `useAuth()` in `bff-session-refresh.ts` (ReferenceError / circular import with `useAuth`); use `auth-session-state.ts` + dynamic `useSupabase` import.
- TOTP disable: `challenge` + `verify` + `refreshSession` (not `challengeAndVerify`); always verify code before unenroll; sync BFF after disable; read factors from `data.totp` fallback.
- TOTP disable UX: drop broken global confirm modal step — first click opens inline OTP form; success message; do not clear OTP UI during `refreshTotpState` while disabling.
- `AppButton`: emit `click` explicitly (`inheritAttrs: false` dropped listener forwarding) — fixes security settings TOTP/passkey buttons that appeared dead.
- Passkeys: map `Credential verification failed` to setup hints after API failure only (removed erroneous localhost pre-flight block that prevented `registerPasskey` even when Supabase was configured); TOTP code step before enroll when 2FA is on.

## 2026-06-03 — Account roles nav + settings redirect

Fixed:
- PWA app nav: signed-in users only see destinations they can use — `worker_role` (životopisy, ponuky na e-mail), `provider_role` (moje reklamy), company account type (ponuky, uchádzači, databáza CV); empty nav groups are hidden. Guests still see full marketing nav.
- Role/account denials redirect to **Nastavenia → Profil** with banner + scroll (roles section or account type for employer-only).
- `moje-reklamy` wizard routes use `provider-only` middleware (not `company-only`); profile **Štatistiky** link serves both `customer_role` and `provider_role` (one button, dashboard tabs when both).

## 2026-06-03 — Cookie banner copy

Changed:
- PWA cookie banner: user-friendly Slovak intro (`Ahoj, používame súbory cookie`) without vendor names on first screen; analytics vendors remain in preferences modal and cookie inventory.

## 2026-06-03 — Applicant auto-reply without confirm dialog

Fixed:
- `spravca-uchadzacov/[jobId]`: when company auto-replies are enabled (Plus/Pro), changing status to **Pozvať na pohovor** or **Zamietnutí** sends the template immediately — no “Presunúť a odoslať” confirmation. Confirm dialog remains only for explicit resend (`forceResend`).

## 2026-06-03 — Remove /navody guide pages

Changed:
- Deleted all `/navody/*` guide pages (`pages/navody/[slug].vue`, `utils/guide-page-content.ts`); footer **NÁVODY** labels kept as non-navigating text (no URLs).
- Removed guide paths from sitemap/SEO policy (`seo-route-policy.ts`, `backend-ts` `SeoService`).

## 2026-06-03 — Remove visible SEO breadcrumb / AEO summary blocks

Changed:
- Job, blog, and professional detail pages no longer render on-page breadcrumbs (`Domov / …`) or the “Súhrn ponuky” fact panel; meta tags and `BreadcrumbList` / `JobPosting` JSON-LD remain via `usePublicContentSeo`.
- Removed `components/seo/AppBreadcrumbs.vue`, `PublicContentAeoSummary.vue`, and AEO fact builders from `utils/public-content-seo.ts`.

## 2026-06-03 — Subscription cancel (BFF step-up + incomplete Stripe)

Fixed:
- Billing step-up when Supabase tokens were cleared after BFF login (production): resolve access via `POST /api/auth/session/refresh` (`resolveBillingBffTokens`).
- BFF probe for billing: `GET /api/auth/session/bound` (requires `jb_sid`) replaces `/api/auth/me` — step-up no longer skipped when only `jb_at` cookie was present.
- Step-up / `@RequireRecentLogin`: match `api_user_sessions` by `access_token_jti` when `jb_sid` cookie is missing but `jb_at` is present.
- Step-up retries after session refresh (CSRF sync); billing re-establish calls `logoutSession` before a fresh `establishSession`.
- Cancel/resume billing mutations: step-up re-bootstraps BFF session + CSRF before `POST /api/payments/cancel-subscription`.
- `POST /api/payments/cancel-subscription`: Stripe subscriptions in `incomplete` / `incomplete_expired` are canceled immediately instead of `cancel_at_period_end` (which Stripe rejects).
- PWA: clearer message when step-up fails before cancel (`settingsBillingStepUpFailed`).

## 2026-06-03 — app-pwa Nuxt dev (`rollupOptions.input`)

Fixed:
- `experimental.viteEnvironmentApi: true` in `nuxt.config.ts` — fixes dev crash `No entry found in rollupOptions.input` on Nuxt 3.21 + Vite 7 when `ssr` is false (local / non-indexing).

## 2026-06-03 — Subscription free trial (Stripe Price, toggleable in Dashboard)

Added:
- Paid-plan free trial driven by **Stripe Price** `recurring.trial_period_days` (disable by removing trial on the Price in Dashboard). First-time Stripe subscribers only; card collected up front, charge after trial.
- Migration `20260630120000_subscription_trial.sql` (`trialing` status, `profiles.subscription_trial_used_at`).
- API: `subscriptionTrial` on `GET /api/billing/config`; `subscriptionTrialEligible` on `GET /api/billing/account`; setup-intent path on `POST /api/payments/confirm-subscription`.
- PWA: trial badge on `/cennik` plans; checkout copy on `/platba`.

Changed:
- [`docs/payments-credits.md`](payments-credits.md) — trial env and flows.

Database:
- `user_subscriptions.status` allows `trialing`; `profiles.subscription_trial_used_at`.

## 2026-06-03 — backend-ts npm audit (0 vulnerabilities)

Security:
- Upgraded NestJS stack to **11.1.24** (`@nestjs/common`, `core`, `platform-express`, `websockets`, `platform-socket.io`), `@nestjs/config` **4.x**, `@nestjs/schedule` **6.x**, `@nestjs/cli` **11.x**; **Express 5.2.1**.
- `npm overrides` for transitive `qs`, `uuid`, `picomatch`, `ajv`, `webpack`.
- `file-type` **21.3.4** (dynamic load in production; Jest uses `src/test/mocks/file-type.cjs`).

## 2026-06-03 — app-pwa npm audit (0 vulnerabilities)

Security:
- `npm audit fix` for transitive Nuxt/Vite/Workbox advisories.
- Dev: `vitest` ^4.1.8 (critical Vitest UI advisory).
- `overrides.tar` ^7.5.16 for `@capacitor/cli` without Capacitor 8 upgrade.

## 2026-06-03 — Default listing thumbnails (white logo)

Changed:
- Regenerated default thumbnails for jobs, profesionáli (company ads), and blog posts: brand green (`#22c55e`) background with centered `jobbielogowhite.svg` wordmark.
- Assets: `public/jobbie-default-thumb.svg`, `public/job-card-placeholder.svg` (alias), `public/img/jobbie-def-thumb.webp`; constants `BRAND_DEFAULT_THUMB_*` in `utils/brand-assets.ts`.
- Regenerate after logo changes: `npm run thumbs:generate` in `app-pwa/`.

## 2026-06-03 — PWA dev console fixes

Fixed:
- Nuxt auto-import: `components/seo` with `pathPrefix: false` so `AppBreadcrumbs` and `PublicContentAeoSummary` resolve on job/blog/ad detail pages.
- Font Awesome self-hosted via `@fortawesome/fontawesome-free` (global CSS) — no cdnjs CSP violations on register/CV flows.
- Audit client telemetry: only batches events for logged-in users; `skipSessionExpiry` on ingest; `useApi` skips BFF refresh on 401 when no recoverable session; `/auth/register` treated as guest auth route.
- Socket.IO plugin probes Nest `GET /health` on configured API origin before connecting (avoids reconnect spam when API is down).
- Chat legacy media: `assertChatMediaReadableInRoom` allows signed URLs when object exists and a room message references the path; PWA uses `signedUrl` DTO field and shows `chatMediaUnavailable` placeholder on hydrate failure.

Changed:
- `app-pwa/README.md` — dev URL `http://localhost:3001`, API proxy note.
- `docs/frontend.md` — SEO components scan path, Font Awesome, local dev ports.

## 2026-06-03 — Chat bubble layout (reply + mobile)

Fixed:
- PWA chat (`MessageBubble`): reply action sits beside the bubble in a flex row (no overlap on wide messages); bubble max-width uses viewport-aware `calc` on small screens; long unbroken text wraps with `break-all`; swipe-to-reply transform applies to the bubble column only.

## 2026-06-03 — Admin Moderácia: actions, suspend, step-up

Fixed:
- **jobbie-admin:** Moderation queue GET/count work without `@RequireRecentLogin()`; claim/dismiss/hide POSTs still step-up protected.
- Moderation UI: clear errors for expired step-up / MFA / scope; success feedback; re-login CTA; **Pozastaviť účet** on `company_profile` reports (`POST /admin/users/:id/suspend`); copy clarifies skryť obsah ≠ ban.
- `AppRoleGuard` reads class-level `@RequireAppRoles`; `AdminScopeGuard` honors `profiles.admin_role` (analyst no longer gets moderation via app_role shortcut).
- Login verifies `GET /admin/overview` (requires `app_role = admin`); Moderácia nav hidden when count returns 403.
- MFA verify refreshes session for fresh JWT `auth_time`.

Changed:
- `docs/admin-desktop.md` — moderation vs Účty suspend, step-up on mutations only, `company_ad` in hide list.

## 2026-06-03 — Site footer (P_ta screenshot)

Changed:
- PWA `AppSiteFooter`: mint background (`marketing-mint` + subtle green glow), four columns per P_ta mockup — brand (logo, slogan, social, cookies with shield), Rýchle menu + support email, Návody, newsletter card (`abChipBg` + bell header).
- Bottom bar: copyright, Ochrana súkromia, Obchodné podmienky, Cenník.
- `AppIcon`: `mail`, `shield-check` for footer contact and cookie row.
- Návody prepends „Ponuky na email“ (`ROUTES.guideEmailAlerts`).

## 2026-06-03 — Content reports: ⋮ menu + company ad target

Changed:
- PWA job detail (`/ponuka/:id`) and profesionali detail (`/profesionali/:id`): report moved behind ⋮ menu (`ContentReportMenu`); owners do not see the option.
- Fix: explicit imports + `components/marketing` with `pathPrefix: false` so `ContentReportMenu` resolves (was auto-registered as `MarketingContentReportMenu` and did not render).
- Report ⋮ in the white action card beside **Uložiť ponuku** (`JobSingularSalaryApplyCard`) or message CTA (`CompanyAdSingularContactCard`).
- Profesionali reports use `target_type=company_ad` and ad UUID (was `company_profile` + owner id).

Added:
- `company_ad` in `content_reports.target_type` check; admin Moderácia preview, hide (pause ad), and support link for company ads.

Database:
- `20260703120000_content_reports_company_ad.sql`

## 2026-06-03 — Moderácia scope + report dialog (PWA)

Changed:
- **jobbie-admin:** `profiles.admin_role` scopes apply for `app_role = admin` (see later fix: analyst no longer inherits moderation). Optional `ADMIN_DEV_FULL_SCOPES=1` for local full scopes.
- **PWA:** Content report dialog teleported to viewport center; predefined reasons + **Iné** with free text.

## 2026-06-03 — Decimal pricing (jobs + profesionali)

Changed:
- Job post and company ad wizards accept decimal amounts (`10,50` or `10.50`); stored with up to two decimal places and shown as `10,50 €/hod` on detail cards.
- Backend normalizes `salary_min` / `compensation_amount` and `price_min` / `price_max` on save.

## 2026-06-03 — RPO IČO lookup: `identifier` query param

Fixed:
- `SkRpoLookupService` IČO verification called `GET …/search?ico=…`; ŠÚ SR API expects `identifier` (otherwise “No parameters specified in search request”). Aligns with official RPO search API.

## 2026-06-03 — Cookie preferences: inventory tables

Changed:
- PWA cookie „Nastavenia“ modal: intro copy, expandable categories, per-cookie table (name, domain, expiry, path, description) for JOBBIE BFF cookies, Turnstile (when configured), PostHog, and GTM/GA4/Clarity; privacy link and support email footer.

## 2026-06-03 — CV builder: sticky step sidebar below nav

Fixed:
- PWA životopisy builder: sticky aside uses measured app header offset (was 24px) so step navigation no longer scrolls under the fixed navbar; aside `z-50` for stacking above the form column.
- PWA ponuky na email wizard (`JobEmailAlertWizardShell`): same sticky aside behavior as CV builder.
- PWA job / company ad wizards (`JobPostShell`): same sticky step aside below the navbar.

## 2026-06-03 — Applicant auto-replies: Plus / Pro only

Changed:
- Automatické odpovede (šablóny v nastaveniach firmy, odoslanie pri zmene stavu) require an active **Plus** or **Pro** subscription (`hasPlusOrProAccess` on `GET /api/billing/account`; enforced on template save and `send_auto_reply`).
- Start and Zadarmo tiers can still change applicant status without auto-messages; UI shows upgrade CTA on `/nastavenia/firma` and a hint when inviting/rejecting.
- `/cennik` → **Porovnanie plánov**: row „Automatické odpovede uchádzačom“ (Áno pre Plus/Pro); plan cards list the feature on Plus/Pro only.

## 2026-06-03 — Applicant list: name opens profile, not HR modal

Changed:
- Správca uchádzačov: clicking an applicant name or **Zobraziť CV** opens the employer CV profile (`CvCandidateDetailModal`, same as databáza životopisov) or public `/profil/:id` when they have no CV.
- Removed `ApplicantDetailModal` (status history / internal note sheet on name click); status, note, and chat stay on the list card.

## 2026-06-03 — Applicant auto-replies: in-app chat + company defaults

Fixed:
- Employer auto-replies always post to the application chat room; optional applicant email is sent in addition (previously a successful email skipped in-app chat).
- Per-job `job_applicant_reply_settings` rows with all flags off and empty templates no longer shadow company templates from `/nastavenia/firma`.
- Status change flow surfaces an error when reply settings cannot be loaded instead of silently treating auto-reply as disabled.

## 2026-06-02 — Registration newsletter opt-in

Added:
- PWA signup step 4: optional newsletter checkbox after terms consent; on submit calls `POST /api/subscribe` and sets `marketing_processing_consent` when the account session is created immediately.

## 2026-06-02 — Topovanie: TOP pill in catalog + save on edit

Fixed:
- Public job search (`GET /api/search`) enriches results with `show_top_badge` from active `job_promotions` rows (find/home catalog TOP pill).
- Job/company PATCH applies top when `want_top_listing` is set and the listing is already live; live check uses `is_active === true` and `is_draft !== true`.
- Edit wizards restore the Topovanie checkbox from `show_top_badge` when reopening a listing that already has TOP.

## 2026-06-02 — Job offer stats panel (ponuka) design

Changed:
- PWA `JobStatsPanel` — white card shell, header, „Detailné štatistiky“ block, 4-column metric grid, chart empty state; aligned with dashboard stats UI.

## 2026-06-02 — Provider dashboard KPI display

Fixed:
- Conversion % derived from profile view count when API omits rate (e.g. 2 views → `0.0 %` instead of „Nedostatok dát“).
- Avg rating falls back to all-time reviews when none in selected period; benchmark uses same fallback.

## 2026-06-02 — Dashboard upsell for paid plans

Fixed:
- PWA `DashboardUpsellBanner` hidden when `GET /api/billing/account` reports paid plan access (`useBillingAccount` + `hasPaidPlanAccessFromAccount`).

## 2026-06-02 — Dashboard charts CSP fix

Fixed:
- Chart.js loaded from npm bundle instead of jsDelivr (blocked by `script-src` CSP) — dashboard charts render again.
- Provider conversion shown when profile views ≥ 1; clearer copy when no views/reviews in period.
- Chart draw retried after DOM mount when canvas refs were not ready.

## 2026-06-02 — Dashboard stats and pricing CTA

Changed:
- PWA dashboard upsell **Zobraziť plány** → `/cennik?tab=plans`; removed `/app/plans` page (301 to cennik); deleted legacy `PlansPanel.vue`.
- Stripe plan checkout return URLs use `/cennik?tab=plans` (`usePricingPlanCheckout`).
- Provider dashboard: conversion % only when ≥3 profile views; avg rating for selected period; benchmark `reason` hints; category bar from active `company_ads`; chart empty states.
- Customer dashboard: removed placeholder **Miera dokončenia** card; `completionRate` dropped from API DTO.

## 2026-06-02 — Topovanie: dedicated apply endpoint

Fixed:
- `POST /api/jobs/:id/top-listing` and `POST /api/company-ads/:id/top-listing` — apply paid TOP after the listing is already published (edit wizard calls this after a successful save).
- Publish + urgent + top can be combined: failed top no longer unpublishes the job/ad or rolls back the publish credit spend.
- Job/company PATCH no longer fails entirely when top billing fails; top is applied via the dedicated endpoint.

## 2026-06-02 — Edit wizard: Topovanie, photos, city

Fixed:
- Job / Profesionáli edit wizards no longer clear cover photo or city on save when the user did not change them (omit unchanged `photos` / `thumbnail_url`; restore municipality from stored `city`).
- Job API normalizes legacy `photos` jsonb object shapes so the editor loads existing images.
- After saving a **published** job with Topovanie checked, PWA calls `POST /api/jobs/:id/promote` (`top_category`) when needed; company ads send a follow-up `PATCH` with `want_top_listing` for active ads.

## 2026-06-02 — Topovanie on live job / Profesionáli ads

Fixed:
- `want_top_listing` (manual Topovanie checkbox) now applies when saving or renewing an **already published** job offer or **active** company ad, not only on first publish from draft.
- Top promotion spend refs include a time period key so a new 7-day top can be purchased after the previous one expires (avoids idempotent ref blocking re-top).

## 2026-06-02 — Provider stats labels

Changed:
- PWA profile sidebar link to provider dashboard: „Štatistiky“ (was „Štatistiky verejného profilu“).
- PWA `/dashboard/poskytovatel` page title: „Štatistiky reklamy“.

## 2026-06-02 — Ponuky na e-mail marketing copy

Changed:
- PWA `/ponuky-na-email` — removed logged-out „Ako to funguje“ and FAQ blocks; simplified page SEO (no HowTo/FAQ JSON-LD).

## 2026-06-02 — Homepage hero phone asset

Changed:
- PWA hero — phone column uses `Jobbie design/jobbie-mobile-mockup.webp` → `public/img/jobbie-mobile-mockup.webp`.

## 2026-06-02 — Homepage A/B hero (design parity)

Fixed:
- `HomeHeroSection` rebuilt against `Jobbie design/A_B _ Desktop.html`: green „sadne.“ underline, dual search (`Pozícia` / `Mesto`), filled first category chip, black/white role cards (`Pre uchádzačov` / `Pre firmy`), horizontal trust icons.
- Phone column — PNG raster from design export (`public/img/home-hero-ab-phone.png` via `backend-ts/scripts/capture-ab-hero-phone.mjs`); removed inaccurate Vue/SVG mock.

## 2026-06-02 — Homepage A/B hero

Changed:
- PWA `/` — new light hero (`HomeHeroSection`): headline „Nájdi prácu, ktorá ti sadne“, search + category chips, dual CTAs, stats row; Tailwind tokens `marketing.abGreen` / `abInk` / `abMuted`.
- Previous green-gradient hero backed up in `components/home/HomeHeroSection.legacy.vue` (rollback reference).

## 2026-06-02 — CV PDF page count (pagination packer v2)

Fixed:
- CV PDF — single pagination pass (`paginateExportData`) then print HTML without re-running bootstrap; preview uses the same pass.
- Atlas packer — fixed A4 content height budget; measure full sheet; page 1 takes sidebar + main, continuation pages use chrome + main.
- Renderer revision **8** — stored PDFs regenerate with fewer spurious pages.

## 2026-06-02 — CV PDF page count (pagination packer)

Fixed:
- Atlas CV — profile photo 40×40 mm circle without border; flatter main column markup; pagination measures A4-sized sheets, rebuilds breakable sections on output pages (renderer revision 12).
- CV builder — temporary **HTML náhľad** button (`POST /api/cv/:cvId/document/preview-html`) for template/CSS work; main **Náhľad** stays PDF.
- CV preview — `POST /api/cv/:cvId/document/preview` returns inline PDF (same Playwright pipeline as export); PWA opens PDF in a new tab. Draft download uses `POST …/pdf/render` with editor payload. Pagination measure host matches print sheet size; PDF renderer revision 11.
- CV export — Znalosti and Vodičský preukaz use horizontal chip rows on all templates (driving no longer uses vertical `contact-stack`); PDF renderer revision 10.
- CV pagination — collect units inside nested Atlas main wrappers; keep full sidebar on page 1; wait for webfonts before DOM measurement (fixes 1-page and 7+ page PDFs); renderer revision 9.
- CV pagination — `getMaxPageHeight()` now matches full A4 sheet height (was main-column only), so the packer no longer puts one block per page; section headings stay with the first entry below them.

## 2026-06-02 — CV pagination v2 (server preview + verified PDF)

Changed:
- CV preview — `POST /api/cv/:cvId/document/preview` on `CvController` (see above: now returns PDF).
- PWA — no longer imports `cv-document-html` (avoids `node:fs` in Vite); pagination bootstrap is server-only (`cv-document-pagination.node.ts`).
- CV PDF — same pagination pipeline; renderer revision **6**; `.cv-sheet` fixed A4 height with full-height Atlas/Monochrome chrome sidebars on continuation pages.
- Tests — Atlas fixture (2 schools + full driving + long jobs): `sheetCount` matches PDF page count; optional `SAVE_CV_PDF_FIXTURE=1` writes `backend-ts/tmp/cv-fixture-atlas.pdf`.

## 2026-06-02 — Dev console noise (auth, PostHog, public jobs)

Fixed:
- `GET /api/jobs/latest` and `GET /api/jobs/category-counts` — `@Public()` (were default-deny → 401 for guests); homepage fetches use `skipSessionExpiry`.
- BFF bootstrap — clear stale CSRF/cache on anonymous `/auth/me` 401; skip BFF refresh retry in `bootstrapAuthMe` when no token and no BFF hint; chat Socket.IO only after `user` is loaded (avoids reconnect spam from stale `jb_csrf`).
- PostHog — removed dev `debug()` console flood.
- Logout `Clear-Site-Data` — drop unsupported `executionContexts` (Chromium warning).

## 2026-06-02 — Guest feature page illustrations

Changed:
- PWA logged-out heroes — `ponuky-na-email`, `vytvorit-ponuku`, `vytvorit-zahranicnu-ponuku`, and `zivotopisy` hub use design illustrations from `public/home-design/` (`job-alerts-illustration`, `job-post-illustration`, `cv-illustration`).

## 2026-06-02 — Hard refresh session restore

Fixed:
- PWA auth bootstrap — always probe `POST /api/auth/session/refresh` when Supabase storage is empty (not only when BFF hint/cache exist); apply refresh tokens in-memory before `/api/auth/me`; `refreshUser()` uses cookie refresh instead of clearing user when Supabase keys were cleared after BFF login.

## 2026-06-02 — Job / profesionáli wizard save buttons

Fixed:
- Job publish confirm — `AppConfirmDialog` now uses `v-model:open` (one-way `:open` did not show the credit confirmation modal).
- Job / company-ad wizards — action errors in the footer (not only at page top); CSRF refresh before save; clearer API/session error messages; `AppRichTextEditorLazy` exposes `getPlainText` for draft/publish payloads.
- PWA BFF session — persist `csrf_token` in `sessionStorage` after establish/refresh (`jb_csrf` is `Path=/api` and not readable on wizard routes); restore on cold boot; retry mutations on `403 Invalid CSRF` after `POST /api/auth/session/refresh`; do not mark BFF active from cookie probe without CSRF.

## 2026-06-02 — Employer CV database list load

Fixed:
- `EmployerCvDatabaseService` / applicants CV shell queries — read `show_contact_details` from `cv_personal_info` (column was removed from `cvs` in multi-CV migration); fixes `GET /api/employer/cv-database` returning “Nepodarilo sa načítať životopisy”.
- `CvPhotoUrlController` — same `show_contact_details` source; fixed undefined `path` when resolving signed photo URL.

## 2026-06-02 — Homepage download section (design restore)

Changed:
- PWA homepage “Jobbie vždy po ruke” — restored marketing copy, App Store / Google Play buttons (design); store links via `NUXT_PUBLIC_APP_STORE_URL` / `NUXT_PUBLIC_GOOGLE_PLAY_URL`.

Fixed:
- PWA homepage — `NuxtImg` width/height for `heroiphone2.png` matched intrinsic 1027×1406 ratio (was 1:2), so IPX `cover` no longer crops the phone mockup sides.

## 2026-06-02 — Remove FAQ, About, Contact pages

Removed:
- Marketing pages `/casto-kladene-otazky`, `/o-nas`, `/kontakt` (and `/faq` redirect stub); `utils/public-faq.ts`; footer links; sitemap entries. Legacy URLs 301 → `/`.

## 2026-06-02 — Footer Návody links

Changed:
- Site footer **Návody** column — seven links (ako to funguje, registrácia, služba, profil, topovanie, voucher, zaregistrovať sa); six new `/navody/*` guide pages + sitemap paths.

## 2026-06-02 — CV multi-page preview and PDF export

Fixed:
- CV náhľad — pagination runs in a hidden iframe, then opens stacked `.cv-sheet` pages only (no visible stretched source); source markup measured off-screen.
- CV PDF — print media + fixed 297mm `.cv-sheet` pages (no full-document viewport stretch); `CV_PDF_RENDERER_REVISION` 5 regenerates stored PDFs.
- CV export — client pagination splits atomic blocks; Atlas/Monochrome continuation pages keep full-height sidebar chrome.
- CV break rules — `cv-breakable-section` on experience/education; whole sections (e.g. Vodičský preukaz) stay on one page.

## 2026-06-02 — CV driving license order in export

Fixed:
- Driving categories saved and rendered in builder order (`AM`…`T`); removed `AM`→`Z` / `BE`→`E` relabel in preview/PDF; backend `CV_DRIVING_LICENSE_CATEGORIES` aligned with PWA.

## 2026-06-02 — CV PDF inline debounce (no Redis)

Fixed:
- `CvPdfQueueService` — without Redis, debounce PDF regeneration for 45s (same as BullMQ) instead of firing Playwright on every autosave; one debug log per debounce window.

## 2026-06-02 — CV builder photo upload (private `cv-photos`)

Fixed:
- CV photo direct upload — store storage path when `publicUrl` is empty (private bucket); PWA accepts `photo_storage_path` on finalize; preview loads via `GET /api/cv/:cvId/photo-url` (`useCvPhotoDisplayUrl` composable — fixes blank CV builder from `useApi()` in async watch).
- CV builder/preview photo — owner aggregate and upload responses include ephemeral `photo_view_url` (signed URL); `photo-url` resolves legacy public paths; instant blob preview after upload.
- `cv-photo-url.controller` — resolve path from `photo_storage_path` or legacy `photo_url`.

## 2026-06-02 — CV migrations + builder layout

Database:
- `20260525100000_cv_multi_cvs_normalize.sql` — idempotent backfills (`cv_title`, job columns) and `drop policy if exists` before RLS on `cv_volunteering` / portfolio / awards / references.

## 2026-06-02 — CV builder layout + dev warnings

Fixed:
- `useCvPrototypeStickySidebar` — use `translateY` instead of `position: absolute` so the CV editor grid keeps sidebar and main form in separate columns.
- `app-pwa/modules/dev-stable.ts` — treat `ECONNABORTED` (write aborted on closed dev proxy/HMR socket) as benign so `nuxt dev` does not fork-restart on Windows.

Changed:
- `app-pwa/modules/dev-stable.ts` — stop attaching late `promise.catch()` in the benign `unhandledRejection` wrapper (was emitting `PromiseRejectionHandledWarning` on every Vite/proxy TCP reset during startup and HMR).
- `app-pwa/plugins/1.auth.client.ts` — attach `.catch()` on fire-and-forget auth refresh helpers.

## 2026-06-29 — Pre-rendered CV PDFs (`cv-pdfs` bucket)

Fixed:
- CV PDF `Content-Disposition` — ASCII-safe `filename` + RFC 5987 `filename*` (fixes 500 when display title or name contains `ž`/diacritics, e.g. „Životopis“).
- CV PDF export — return rendered bytes when `pdf_*` DB columns or storage download lag; map Playwright / `cv-pdfs` bucket errors to 503 with Slovak hint (was generic 500); PWA parses Nest `message` JSON on PDF download failure.
- CV PDF generation — `loadShell` no longer selects removed `cvs` columns; `getOwnerAggregateByCvId` for owner export; case-insensitive user id; skips `pdf_*` DB updates when migration `20260629120000` not applied (was bogus 404 „CV neexistuje.“).

Changed:
- Migration `20260629120000_cv_pdfs_storage.sql` — private `cv-pdfs` bucket; `cvs.pdf_storage_path`, `pdf_content_hash`, `pdf_generated_at`, `pdf_generation_status`.
- BullMQ job `cv-regenerate-pdf` (45s debounce per CV) after saves; inline generation when `REDIS_URL` unset.
- Candidate `GET|POST /api/cv/:cvId/pdf` streams from `cv-pdfs` with sync fallback render (full contact).
- Employer CV PDF routes still render on demand from sanitized aggregates (contact unlock / `show_contact_details`).
- PWA CV export uses `GET /api/cv/:cvId/pdf` (saved CV only; preview JSON body rejected).

Docs: `docs/uploads.md`, `docs/deployment.md`.

## 2026-06-29 — cv-photos bucket migration (hosted Supabase)

Changed:
- `20260628130000_cv_photos_private_bucket.sql` — remove `COMMENT ON storage.buckets` / `DROP POLICY`; add RESTRICTIVE default-deny for `public` on `cv-photos`.

## 2026-06-29 — Storage lockdown migration (hosted Supabase)

Changed:
- `20260628121000_storage_upload_lockdown_finish.sql` — RESTRICTIVE deny policies block authenticated writes to `profile-avatars` / `chat-media` (hosted Supabase cannot `DROP POLICY` or `GRANT supabase_storage_admin`).

Docs: `docs/uploads.md`.

## 2026-06-29 — Security audit remediation (follow-up)

Changed:
- **Payments:** Legacy job `checkout-session` + Stripe webhooks require job `company_id` ownership; metadata includes `user_id` for defense-in-depth.
- **Auth:** Public `login-attempt` rejects `success: true`; lockout cleared only on `POST /api/auth/session`; session routes use `jb_at` cookie (removed redundant `JwksAuthGuard`).
- **Jobs:** Public `GET /jobs` defaults to active, non-draft unless owner-scoped (`my` or own `company_id`).
- **DB:** Revoke `search_profiles_hybrid` from `anon`/`authenticated` (migration `20260629120000`).
- **AV:** `FileScanService` fail-closed by default in production when `CLAMAV_FAIL_OPEN` unset.
- **PWA:** Per-request CSP nonce middleware + tighter `connect-src`; shared `utils/platform-csp.ts`.
- **CI:** `app-pwa` `npm audit` job; security tests for checkout IDOR and login-attempt.

Docs: `docs/SECURITY.md`, `docs/auth-security.md`.

## 2026-06-02 — BFF + JwksAuthGuard cookie auth

Fixed:
- `JwksAuthGuard` accepts `request.user` from `SessionAuthGuard` (BFF cookies) instead of requiring Bearer on every stacked route.
- Billing `GET/PATCH /api/billing/account` rely on `GlobalAuthGuard` only.
- Dev: keep Supabase session after BFF login; refresh syncs Supabase in dev to reduce spurious logouts.

## 2026-06-02 — PWA dev auth (localhost Missing or invalid token)

Fixed:
- Vite dev proxy `/api` and `/socket.io` → Nest `:8000`; client uses `resolvePublicApiBase()` so BFF cookies are same-origin on `:3001`.
- `shouldPreferBffCookieAuth()` only when API is same-origin as the PWA; Bearer fallback on 401 when cookies fail.
- Login no longer strips Supabase Bearer when API is cross-origin without proxy.

## 2026-06-02 — PWA security hardening (30-phase plan)

Changed:
- **Navigation:** `safe-navigation.ts` + tests; all auth/checkout redirects and notification/SW paths hardened against open redirects.
- **BFF auth:** Cookie-preferring `useApi`, no Bearer when BFF active; single-flight refresh; CSRF from cookie only; minimal auth cache v2; logout clears state + backend `Clear-Site-Data`.
- **Sockets:** `jb_at` cookie `Path=/`; handshake cookie auth; PWA `withCredentials` without Bearer when BFF active.
- **Checkout:** Stripe return query stripped; credit success only after `confirm-credits` + `refreshUser()`.
- **Headers / CSP:** Expanded Nitro security headers, report-only CSP + `POST /api/csp-report`; private route `Cache-Control`.
- **Analytics:** PostHog identify without email; GTM unload removes script; audit/web-vitals consent-gated.
- **Backend:** `sanitizeExternalUrl` / internal path helpers; push URL + notification `link_path` validation; session guard prefers cookie when `jb_sid` present.

Docs: `docs/security/frontend-implementation-summary.md`, baseline `docs/security/frontend-audit-2026-06-baseline.md`.

## 2026-06-28 — Chat infinite scroll for older messages

Changed:
- Opening a room loads the **latest 50** messages (not the oldest chunk).
- Scrolling near the top loads older pages automatically (`before` keyset cursor); removed the manual “Načítať staršie správy” button.
- API: `GET /api/chat/rooms/:id/messages?before=<cursor>` for older pages; default (no offset) returns newest page in ascending order.

## 2026-06-28 — Backend performance (25-phase implementation)

Added:
- Migrations `20260628120000_employer_applicants_list_rpc.sql`, `20260628130000_storage_async_finalize.sql`, `20260628140000_chat_messages_keyset_index.sql`.
- `ProfileAuthCacheService` (Redis + in-memory), shared `BackgroundQueueModule`, async storage finalize + `GET /api/storage/uploads/:id/status`, k6 baseline scripts, `backend-ts/Dockerfile`.
- Docs: `docs/backend-performance-baseline.md`, `docs/backend-performance-implementation-summary.md`.

Changed:
- Employer applicants: `employer_list_application_rows` RPC fast path; batched job-email alerts; deferred Stripe webhook notifications; catalog single-flight cache.
- Jobs/search: split `JOB_CARD_LIST_SELECT` / `JOB_FEED_LIST_SELECT` / `JOB_SEARCH_HYDRATE_SELECT` (list routes omit `description`).
- Bull worker: env `BULL_WORKER_CONCURRENCY`; digest/reengagement + `storage-finalize` jobs; notification crons enqueue when Redis set.
- PWA: `useStorageUpload` polls async finalize; notification unread uses `unread_delta` when possible.
- `main.ts`: keep-alive/timeouts, `REQUIRE_REDIS_IN_PRODUCTION`, shutdown hooks; expanded Prometheus metrics.

## 2026-06-02 — PWA frontend performance (full implementation plan)

Changed:
- **API:** GET in-flight deduplication in `useApi` (`utils/api-get-dedup.ts`); notification `refresh()` coalesces parallel calls.
- **Homepage:** `useJobsFeedSocket` connects after latest-jobs section intersects or idle; socket.io remains dynamic import.
- **Display HTML:** public job/blog detail trust Nest-sanitized HTML (`sanitizeForDisplayFromApi`); DOMPurify kept for editor save paths only.
- **Lazy bundles:** `AppRichTextEditorLazy` in CV/job/ad wizards; Sentry loaded on idle; pdf.js already lazy in chat attachments.
- **Chat:** initial 50 messages, DOM render window (120), scroll preservation on prepend, lazy media hydrate via IntersectionObserver.
- **Catalog:** batched job impression POSTs (400ms debounce); `content-visibility` on job cards.
- **Employer hub:** paginated jobs/applicants (50/page) in `spravca-uchadzacov/*`.
- **PWA precache:** 5 MB per-file cap; ignore hero PNGs, perspective.png, pdf.worker.
- **A11y/motion:** global `prefers-reduced-motion` overrides in `main.css`.
- **Images:** `NuxtImg` WebP on job detail gallery and public profile avatars.
- **CI/docs:** `docs/frontend-performance.md`, soft bundle budget workflow `pwa-bundle-budget.yml`.

## 2026-06-02 — PWA frontend performance (audit remediation)

Changed:
- PostHog: dynamic `import('posthog-js')` after consent; removed `useAnalytics` from `useAuth` bootstrap chain.
- Homepage jobs feed: dynamic `socket.io-client` in `useJobsFeedSocket`.
- Notifications: `refreshIfStale` (45s TTL) on SPA navigation instead of refetch every `route.fullPath`.
- Public job/profile/blog detail: single SSR fetch path (`useAsyncData` hydrates child; no duplicate client GET on first paint).
- Chat: initial load 80 messages + “load older” pagination; lazy `pdfjs-dist` in attachment cards.
- Images: wider `NuxtImg` + WebP on home job grid, hero, marketing sections; dimension fixes on company ad cards.
- Bundle analysis: `npm run build:analyze` → `app-pwa/stats/bundle-stats.html` (`rollup-plugin-visualizer`).

Removed:
- Unused `html2pdf.js` dependency from `app-pwa`.

## 2026-06-27 — API performance (audit remediation)

Added:
- Migration `20260627120000_perf_applicant_counts_chat_unread.sql` — RPCs `employer_application_status_counts`, `chat_unread_counts_for_viewer`.
- `backend-ts/src/jobs/job-list-select.ts`, `backend-ts/src/common/fetch-with-timeout.ts`, k6 smoke script `backend-ts/scripts/k6/smoke.js`, GitHub Actions `backend-ci.yml`.
- Prometheus `jobbie_outbound_fetch_*` metrics for external HTTP clients.

Changed:
- Employer applicants list: SQL pagination + status RPC (in-memory path capped at 500 rows for search/CV filters).
- JWT profile auth cache (5 min); session guard verifies cookie before Bearer (single profile lookup).
- Chat room list: batched unread counts via RPC.
- Job catalog/search hydrate uses explicit column list; Bull `background` queue registered in `JobAlertsModule`; cron job dedupe `jobId`; worker concurrency 4.
- Typesense/Turnstile/Twilio `fetch` timeouts; Stripe SDK `timeout` + `maxNetworkRetries`; in-memory feed engagement cache capped at 5000 keys.

## 2026-06-01 — Automatic public content AEO/GEO

Added:
- `utils/public-content-seo.ts` + `usePublicContentSeo` composables: auto meta, JSON-LD, robots, and visible AEO summary for job/blog/professional detail pages.
- `PublicContentAeoSummary` component on `/ponuka/:id`, `/blog/:slug`, `/profesionali/:id`.

## 2026-06-01 — AEO/GEO remaining implementation

Added:
- Slovak FAQ hub `/casto-kladene-otazky` (301 from `/faq`); merged `public-faq.ts`; seven `/navody/*` guide pages.
- `NUXT_PUBLIC_LEGAL_PUBLISHED`, brand/contact env vars; legal pages `noindex` + review banner until published.
- SSR catalog/blog list fetch; pricing + email-alert AEO copy/schema; claims audit + implementation summary docs.

Changed:
- Central `seo-route-policy.ts` (legal gate, guides, FAQ slug); sitemap uses runtime static paths; Nest static list excludes legal.
- Footer/contact placeholders gated; homepage PWA copy replaces fake app store links; `usePageSeo` brand suffix + legal-aware robots.

## 2026-06-01 — Automatic public content SEO

Added:
- `utils/public-content-seo.ts` + `usePublicContentSeo` — job, blog, and professional detail pages derive meta, JSON-LD, and breadcrumbs from API data automatically.

Changed:
- `ponuka/[id]`, `blog/[slug]`, `profesionali/[id]` use shared composables instead of duplicated `usePageSeo` blocks.

## 2026-06-01 — SEO implementation completion

Added:
- Central route policy (`seo-route-policy.ts`), catalog canonical/noindex helpers, `AppBreadcrumbs` + `BreadcrumbList` JSON-LD.
- Crawlable job search `?page=` (Nest `SearchQueryDto.page`); catalog `rel=prev`/`next`; SSR `useAsyncData` on blog, public profile, company ad detail.
- Unit tests (`seo-config`, `seo-json-ld`, `sitemap-xml`); [docs/seo-implementation.md](./seo-implementation.md).

Changed:
- `titleTemplate` `%s — JOBBIE`; default OG image → `/icon-512.png`; `/databaza-zivotopisov` noindex (removed from sitemap).
- `usePageSeo`: canonical query whitelist, JSON-LD script keys, pagination links; job email alert subroutes noindex.

## 2026-06-01 — AEO/GEO audit implementation

Added:
- Trust pages: `/faq`, `/o-nas`, `/kontakt`, `/bezpecnost`; full privacy/terms content (replacing stubs).
- `MarketingContentPage`, `MarketingFaqSection`; pricing FAQ on `/cennik`; homepage definitional copy.
- `useGlobalSiteSeo` (Organization + WebSite JSON-LD); `FAQPage` schema on `/faq`; blog author fields in API + UI.
- `utils/trust-page-content.ts`, `utils/pricing-faq.ts`; footer links to FAQ, About, Contact, Security, and guide articles.

Changed:
- Legal pages indexable when `NUXT_PUBLIC_ALLOW_INDEXING=1`; static `public/robots.txt` removed (dynamic Nitro route).
- SSR enabled globally when indexing is on; prerender list for marketing routes; sitemap static paths expanded.
- `app-pwa/.env.example`: `NUXT_PUBLIC_SITE_URL`, `NUXT_PUBLIC_ALLOW_INDEXING`.

## 2026-06-01 — PWA SEO foundation

Added:
- Env-gated indexing: `NUXT_PUBLIC_ALLOW_INDEXING`, `NUXT_PUBLIC_SITE_URL`; dynamic `robots.txt` and `sitemap.xml` (Nitro); `GET /api/seo/sitemap` (Nest).
- `usePageSeo` composable (canonical, Open Graph, Twitter, JSON-LD); `JobPosting` / `BlogPosting` / `WebSite` helpers.
- Public job URLs `/ponuka/:id` with 301 from `/app/jobs/:id`; catalog filter/cursor URL sync and “load more” control.

Changed:
- Per-route SSR (`routeRules`) for public marketing routes when indexing is enabled; legal stubs stay `noindex`.
- Footer links to foreign jobs and Profesionáli; internal job links use `ROUTES.jobDetail`.
- `PUBLIC_APP_URL` example aligned to `https://jobbie.sk`.

## 2026-06-01 — Brand favicon and logo

Added:
- Design assets from `Jobbie design/` in `app-pwa/public/` (`favicon.svg`, `jobbielogo.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`).
- `AppBrandLogo` component; header, footer, and auth marketing panels use SVG mark/wordmark.
- `npm run icons:generate` to rebuild PNG PWA icons from `favicon.svg`.

Changed:
- PWA manifest `theme_color` → `#2ecc40`; global `<link rel="icon">` and apple-touch-icon in `nuxt.config.ts`.

## 2026-06-01 — CV editor finish navigation fix

Fixed:
- CV wizard “Dokončiť” no longer depends on `ROUTES.cvHub` at runtime (navigate to `/zivotopisy`); CV document HTML loads only on client for preview/PDF to avoid SSR bundle issues.

## 2026-06-01 — CV preview/PDF omit empty sections

Changed:
- CV document templates no longer render placeholder profile photo, empty education/experience blocks, or “zatiaľ nebolo doplnené” copy for missing skills, languages, or contact.

## 2026-06-01 — CV editor rich-text fields

Changed:
- CV builder (`CvPrototypeShell`): hobbies, osobné zhrnutie, doplňujúce informácie, and experience/education descriptions use `AppRichTextEditor` (same sanitizer as job/company post builders); plain-text length counters; debounced section saves for exp/edu.
- `useCvHeaderAutosave` now PATCHes `additional_skills_info` (was missing).
- Nest `cv.service.js` sanitizes rich fields on `patchCv` and experience/education writes.
- CV preview/PDF (`cv-document-*`): `renderCvRichField` for summary, hobbies, extra info, and section descriptions; scoped `.rich-html-content` CSS in export styles.

## 2026-06-01 — DM Sans self-hosted (CSP)

Fixed:
- Production DM Sans did not load: CSP `style-src` blocked Google Fonts stylesheet while only `fonts.gstatic.com` was allowed in `font-src`.
- Self-hosted via `@fontsource-variable/dm-sans` in [`main.css`](../app-pwa/assets/css/main.css); removed Google Fonts `useHead` from [`layouts/app.vue`](../app-pwa/layouts/app.vue); tightened PWA `font-src` to `'self' data:`.
- Stripe Payment Element uses family names only (no external font CSS).

Docs:
- [`docs/SECURITY_VERIFICATION.md`](SECURITY_VERIFICATION.md) — CSP font check.

## 2026-06-01 — Job alert email footer links

Fixed:
- Digest footer actions: pause uses `PUBLIC_API_URL` (not PWA `/api/…`); unsubscribe/manage use `PUBLIC_APP_URL`; pill-style footer buttons in HTML.
- Public `GET /api/public/job-alerts/pause` redirects to `/ponuky-na-email/pozastavene` (or `?error=invalid` on bad token).

Changed:
- [`public-urls.util.ts`](../backend-ts/src/common/public-urls.util.ts) — `resolvePublicAppOrigin` / `resolvePublicApiOrigin`.

Docs:
- [`docs/email-smtp.md`](email-smtp.md), [`backend-ts/.env.example`](../backend-ts/.env.example).

## 2026-06-01 — Pricing contact form errors

Fixed:
- `/cennik` inquiry form surfaces Nest API error messages (SMTP unavailable vs unreachable API); dev hint when Nest is not running.
- `EmailService` logs SMTP error codes on send failure; optional `SMTP_VERIFY_ON_BOOT` for local troubleshooting.

Docs:
- [`docs/email-smtp.md`](email-smtp.md) — Mailpit local setup, `PRICING_INQUIRY_TO`, pricing inquiry caller.

## 2026-06-01 — Opt-in TOP listing (Topovanie)

Changed:
- TOP badge and catalog sort use active paid `top_category` promotion (7 days), not subscription plan.
- Job and Profesionáli publish wizards: optional **Topovanie** checkbox; tier credit cost from `planTierCreditCosts`.
- `company_ad_promotions` table; `ListingTopPromotionService` shared by jobs and company ads.

## 2026-06-01 — Plan-tier credit costs (cenník + billing)

Changed:
- `plan-tier-credit-costs.ts`: per-plan costs for job publish (3/mo), urgent publish (2/2/0/0), Profesionáli ad (3/mo), top listing `top_category` (10/10/5/0).
- `CreditsService.spendForPlanTier` / `spendIfPositive` (0 credits skips RPC); jobs publish/renew and `top_category` promote enforce tier costs.
- `GET /api/billing/config` includes `planTierCreditCosts` (cache `v5`); PWA compare table + job wizard display matching costs.

Docs:
- [`docs/payments-credits.md`](payments-credits.md), [`docs/frontend.md`](frontend.md).

## 2026-06-01 — Site footer layout

Changed:
- Brand column: e-mail and phone under slogan; cookie settings moved to link column.
- Former **Kontakt** column → footer links (pracovné ponuky, blog, cenník, VOP, GDPR, cookies).
- Stub pages `/vseobecne-podmienky`, `/ochrana-osobnych-udajov` until legal copy is published.
- Newsletter consent links to `/ochrana-osobnych-udajov`.

## 2026-06-01 — Branded job alert digest emails

Changed:
- Job email alert digests use shared transactional HTML ([`transactional-email.template.ts`](../backend-ts/src/email/transactional-email.template.ts), [`job-alert-digest-email.template.ts`](../backend-ts/src/email/job-alert-digest-email.template.ts)) aligned with PWA marketing tokens (mint background, soft cards, green pill CTA).
- In-app notification channel emails reuse the same layout shell.

Docs:
- [`docs/email-smtp.md`](email-smtp.md), [`docs/notifications.md`](notifications.md).

## 2026-06-01 — Job email alert digest (ponuky na e-mail)

Fixed:
- Digest dispatch sends **one** summary per period with all new matching jobs (removed 10-job cap); `last_dispatch_at` advances only after successful SMTP + `job_email_alert_sent_jobs` insert (no advance on empty/failed runs).
- Dispatch matching uses `created_at` sort and `created_at_ts` upper bound at run time; preview count stays on relevance.

Added:
- **Monthly** frequency (DB constraint, API, PWA wizard).

Database:
- `20260601120000_job_email_alerts_monthly_frequency.sql`

Docs:
- [`docs/notifications.md`](notifications.md)

## 2026-06-01 — Cenník doplnkové služby

Added:
- `/cennik`: third tab **Doplnkové služby** (bannery, TOP zamestnávatelia logo, PR článok, mailing) with indicative prices and contact CTA scrolling to on-page form.
- `POST /api/pricing-inquiries` (public, throttled) — e-mail to `PRICING_INQUIRY_TO` via SMTP; audit `pricing.inquiry.received`.

Changed:
- Kontaktný formulár a priamy kontakt (`podpora@jobbie.sk`, telefón) len na tabe **Doplnkové služby**; split-panel layout (gradient + formulár) v `PricingContactSection`.

Docs:
- [`docs/frontend.md`](frontend.md) — pricing tabs and inquiry form.

## 2026-06-01 — CV templates (jobbiecvdesign)

Changed:
- CV builder: four templates from [`jobbiecvdesign/`](../jobbiecvdesign/) — Atlas, Redakčný (Editorial), Minimalistický, Monochrómny — shared HTML in [`backend-ts/src/cv/document/`](../backend-ts/src/cv/document/); PWA preview/PDF via `#cv-document` alias; server PDF via Playwright (`CvHtmlPdfRenderer`).
- Hub labels/swatches updated; `template_key` storage unchanged (`modern`, `elegant`, `minimal`, `professional`).

Fixed:
- Preview/PDF styling: regenerated scoped CSS from [`jobbiecvdesign/cv-templates.css`](../jobbiecvdesign/cv-templates.css) (previous auto-scope produced invalid rules); styles in `<head>`; Atlas/Monochrome markup aligned with design HTML.
- CV editor PDF download: `POST /api/cv/:cvId/pdf` with preview JSON body + Playwright (replaces client html2pdf/html2canvas, which broke CSS Grid layouts). Empty body still exports saved CV from DB.
- CV PDF matches preview: Playwright uses screen CSS (not print overrides), A4 viewport, font wait; PDF mode keeps same `min-height` / monochrome flex layout as preview.

Docs:
- [`docs/deployment.md`](deployment.md) — `npx playwright install chromium` for API PDF generation.

## 2026-06-01 — CV database contact unlock in detail modal

Changed:
- `CvCandidateCard`: **Odomknúť kontakt** shows e-mail/telefón on the card; **Kontaktovať kandidáta** opens chat only (no unlock).
- List API: `contacts_visible` per row (`show_contact_details` or `cv_contact_unlocks`).
- `CvCandidateDetailModal`: contact section + unlock; **Kontaktovať** unlocks when needed.
- `useEmployerCvDatabase.postUnlockContact`; employer CV aggregate includes `contact_unlocked`.

## 2026-06-01 — CV database view counts toward PDF quota

Changed:
- `GET /api/employer/cv-database/:cvId` consumes the same monthly quota as PDF (`max_cv_pdf_downloads_monthly`); one unit per distinct CV per month (re-view / PDF after view does not double-count).
- Migration `20260624120000_employer_cv_monthly_pdf_access.sql` (`employer_cv_monthly_pdf_access`).
- Pricing copy: **Zobrazenie a stiahnutie CV** (was PDF-only wording).

## 2026-06-01 — CV database chat without application

Changed:
- `POST /api/employer/cv-database/:cvId/open-chat` creates or reuses an outreach chat room when the candidate has not applied (`application_id` null on `chat_rooms`); requires at least one active job for job context.
- Migration `20260623170000_chat_rooms_cv_database_outreach.sql`.

## 2026-06-01 — Applicant internal notes (DB)

Fixed:
- Note save 400 when `application_notes` missing: apply migration `20260622140000_employer_applicants_v2.sql` (`supabase db push`); Nest logs PostgREST error and hints missing table.

## 2026-05-31 — Stripe Elements appearance (checkout)

Changed:
- Tax ID + Payment Element: shared Appearance rules aligned with `.addjob-input` / `AppFormDropdown` (pill `h-14`, `marketing-soft` `#fafcfb`, green focus ring, dropdown list items like `app-form-dropdown__option`).

## 2026-05-31 — Checkout: manual billing address (fyzická osoba)

Changed:
- `/platba`: fyzická osoba and firma always enter invoice address (ulica, mesto, PSČ) in checkout form; no fallback from Nastavenia → Fakturácia or card billing address on Payment Element.

## 2026-05-31 — Checkout payment UX (shell, wallets, single step)

Changed:
- `/platba`: marketing card uses `overflow-hidden` + `rounded-[24px]` like login; form column `isolate` for Stripe focus rings.
- `StripePaymentForm`: deferred Payment Element (billing + pay on one screen, single **Zaplatiť**); canonical `form-field-ui` for company IČO/DIČ/address; shared `utils/stripe-payment-element-ui.ts` (appearance, Apple/Google Pay wallets).
- `BillingPaymentMethodForm` / `InvoicePayForm`: same Stripe appearance and wallet options.
- API: invoice-backed PaymentIntents enable `automatic_payment_methods`; `create-payment-intent-*` responses may include `amount` + `currency` for `elements.fetchUpdates` after tax.

Docs:
- `docs/payments-credits.md`, `docs/frontend.md` — single-step checkout, wallet domain registration.

## 2026-05-31 — Applicant note save & export auth

Fixed:
- CORS: allow `PUT` (poznámka save failed with synthetic 503 when preflight blocked PUT).
- Employer applicants API: drop redundant `JwksAuthGuard` so BFF cookie sessions work on Excel/CV export downloads.
- PWA: binary exports use shared `fetchApiBinary` (cookies + Bearer + refresh on 401).

## 2026-05-31 — Backend build fix (applicant exports)

Fixed:
- `nest build` failures (`chat.gateway` `leave` typing, applicant CV PDF basename types) that prevented the API from serving new applicant routes (`export/excel`, application CV PDF, etc.).

## 2026-05-31 — Applicant CV PDF without database quota

Changed:
- `GET /api/employer/applications/:applicationId/cv/pdf` for applicant list/detail/ZIP CV downloads; monthly `max_cv_pdf_downloads_monthly` applies only to `GET /api/employer/cv-database/:cvId/pdf`.

## 2026-05-31 — Interview list export: Excel

Changed:
- **Exportovať zoznam na pohovor** downloads an `.xlsx` of `interview_invited` applicants, then opens the print preview; print page adds **Stiahnuť Excel** alongside PDF.

## 2026-05-31 — Applicants list: instant status updates

Changed:
- Správca uchádzačov: status changes patch the list and tab counts locally (no full-list skeleton reload); filter/search reload still refetches quietly when rows are already loaded.

## 2026-05-31 — Applicant status picklist (3 stages)

Changed:
- Employer status dropdown and API patch accept only **Prijatý**, **Pozvaný na pohovor**, **Zamietnutý**; **Nový** (`pending`) remains the initial badge-only state for new applications.

## 2026-05-31 — Employer applicants list and auto-replies

Changed:
- Per-job applicants list: card layout (`ApplicantCard`), compact meta chips, contextual invite/reject; status control uses `AppFormDropdown` (toolbar) aligned with `h-11` pill actions (`applicants-card-styles`); bulk bar uses `AppButton` size `md`.

Added:
- Applicant cards and detail modal: **Stiahnuť PDF** when `cv_id` is present (reuses `GET /api/employer/cv-database/:cvId/pdf`).
- Bulk selection bar: **Exportovať Excel** (`.xlsx`) and **Stiahnuť životopisy (ZIP)** (max 25 CVs); removed bulk invite/reject shortcuts.

Fixed:
- Status dropdown no longer binds `value="undefined"` (`AppNativeSelect`, `StatusDropdown` reset after change).
- Select-all passes checkbox checked state; selection clears on filter reload.
- Bulk status changes capped at 50 applications; partial bulk failures surfaced.
- Company auto-reply templates (`/nastavenia/firma`): load/save errors shown, client seed on empty/failed GET, validation when enabled without text, “Uložiť všetko”, confirm dialog shows message preview; hint when auto-reply disabled on status change.

Docs:
- `docs/frontend.md`, `docs/features.md`.

## 2026-05-31 — Web push on desktop (Windows / macOS)

Fixed:
- Chat Socket.IO rooms: PWA emits `leave_room` when leaving a thread or unmounting chat; Nest `ChatGateway` handles `leave_room`. Previously sockets stayed in every visited `chat:{roomId}`, so `ChatNotificationsService` skipped push (and email) while a desktop tab stayed open.
- Push subscription lifecycle: `pushsubscriptionchange` in SW, client re-sync on `controllerchange` / tab visible / PWA update; stale subs removed on 401/403 as well as 410/404.
- Notification click: same-origin absolute URLs normalized to path before `WindowClient.navigate` (desktop Safari/Edge).

Docs:
- `docs/notifications.md` — chat `leave_room` behaviour and production verification checklist.
- `docs/profile-deferred.md` — push is implemented (removed stale note).

## 2026-05-31 — Hard refresh session restore (production)

Fixed:
- Auth plugin no longer clears cached user on failed BFF cold boot before `confirmApiSessionDead()`; expired sessions redirect to `/auth/login?reason=session_expired` instead of silent guest UI.
- `auth-loading` stays true until bootstrap completes (avoids parallel `useApi()` 401s during restore).
- BFF CSRF hint persisted in `sessionStorage` after establish/refresh; cleared on logout.
- Shared [`bootstrap-auth-me.ts`](../app-pwa/utils/bootstrap-auth-me.ts) for plugin + `useAuth.fetchUser` cookie-first cold boot.

Docs:
- `docs/auth-security.md` — hard refresh Network debug checklist.

## 2026-05-31 — PWA analytics: Google Tag Manager

Changed:
- Browser analytics: single consent-gated GTM load (`NUXT_PUBLIC_GTM_CONTAINER_ID`) instead of direct GA4 + Clarity snippets.
- Removed `ga4-client.ts`, `clarity-client.ts`; added `gtm-client.ts` with SPA `page_view` `dataLayer` pushes.
- Cookie copy: one GTM row (GA4 + Clarity disclosed as loaded via GTM).

Docs:
- `docs/observability-runbook.md`, `docs/deployment.md`, `docs/frontend.md`, `app-pwa/.env.example`.

## 2026-05-31 — TOP badge for paid subscriptions

Added:
- Job and company-ad catalog cards show a red **TOP** pill when the poster has active paid plan access (`show_top_badge` from API; plan ≠ `zadarmo`, same rules as billing settings).
- Shared `CatalogListingBadgeStack` stacks TOP with existing Urgentné / Nové pills.
- Catalog list APIs sort paid-plan listings first (stable within TOP / non-TOP groups), then paginate.

## 2026-05-31 — Searchable Lokalita (SK obce) on all catalog filters

Changed:
- Jobs (`/pracovne-ponuky`), company ads (`/profesionali`), and employer CV database location filters use `AppSkMunicipalityCombobox` (API search over all SK municipalities) instead of a fixed city shortlist.
- Zahraničné ponuky keep searchable country picker via `AppSearchableFilterCombobox`.
- Firmy ad wizard city field uses the shared municipality combobox (removed duplicate inline dropdown).

## 2026-05-31 — Profesionáli detail platform chat

Changed:
- `/profesionali/[id]`: **Napísať správu** opens or creates a chat with the ad owner via `POST /api/profiles/:id/open-chat` (contact sidebar + posted-by row); login redirect returns to the ad page.

## 2026-05-31 — Profesionáli catalog cards (job parity)

Changed:
- `/profesionali` list cards (`CompanyAdListCard`) match `/pracovne-ponuky` layout: location, availability, and price rows; owner footer with initials; **Nové** badge when created within 7 days.

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Subscription cancel step-up (billing settings)

Fixed:
- Billing cancel modal never opened: template used `SubscriptionCancelDialog` but Nuxt registers `SettingsSubscriptionCancelDialog`; dialog stays open on failure with inline error.
- `POST /api/payments/cancel-subscription` failed when in-memory `jb_csrf` existed without a matching `api_user_sessions` row (common on localhost PWA → API). Billing step-up now re-establishes the BFF session before `step-up` and before cancel/resume.
- Cancel without `stripe_subscription_id` schedules local end-of-period access instead of returning `canceled: false`.
- Paid-plan guard on cancel uses `plan_id` → `subscription_plans.price_monthly_cents` (reliable vs embedded join).

## 2026-05-31 — CV database hero filters (skills, languages, education)

Changed:
- Skills filter: pill dropdown with `JobPostSkillTagsField` / `AppSkCvSkillCombobox` (catalog-backed) instead of free-text `JaTagInput` below the grid.
- Languages (tags + CEFR per language) and education level moved into the hero `FindFiltersDropdownGrid` (9 pills total).
- Removed `CvDatabaseAdvancedFiltersModal` and trimmed `CvDatabaseFiltersModel` (no school, driving licence, name, etc. in PWA).
- Employer `/databaza-zivotopisov` green hero matches `/pracovne-ponuky` (`list-search-shell`, pill dropdown grid, underlined clear-filters link).
- CV database reuses `FindFiltersDropdownGrid` (`gridVariant: cv-database`) with searchable SK municipality location; employment types use category-style multi-select.
- Removed PWA filters for platform metadata (last active/updated, candidate status, CV quality toggles, contact presence, age/gender).

## 2026-05-31 — CV database skills/languages filter dropdowns

Changed:
- Employer CV hero **Zručnosti**: search + catalog multiselect (`CvDbFilterSkillsSearchPanel`, same API as CV skill combobox). **Jazyky**: checkbox preset list + shared min CEFR level.
- **Jazyky**: after selecting one or more languages, min CEFR level applies to all selected (single list, same as other pills).
- Options: `utils/cv-database-filter-options.ts` (catalog seed skills + common languages).

## 2026-05-31 — CV database hero and builder-aligned filters (earlier)

Changed:
- Initial hero redesign and builder-aligned filter set (see above entry for latest pill layout).

Docs:
- `docs/frontend.md`, `docs/features.md`.

## 2026-05-31 — Public profile reviews (write UI)

Added:
- `ProfileReviewForm` on `/profil/[userId]` — star rating, optional comment, submit / edit / delete for logged-in visitors.
- `GET /api/profiles/:id` returns `viewer_review` for authenticated non-owners (existing review for edit mode).
- `ProfileReviewListItem` — reviewer name (incl. `company_name`), avatar, link to `/profil/{reviewerId}` when public; ⋮ menu (edit/delete) on own review; composer hidden after submit.

Changed:
- Review mutations require a public profile (`public_profile_enabled`); POST/PATCH/DELETE throttled (10/min).
- API conflict copy: «Tento profil ste už ohodnotili.»
- `GET /api/profiles/:id/reviews` returns reviewer snapshot (`role`, avatar/logo URLs, `public_profile_enabled`); resolves display name from profile + auth metadata when profile fields are empty.

Docs:
- `docs/frontend.md`, `docs/features.md`.

## 2026-05-31 — Public profile owner panel removed

Changed:
- `/profil/[userId]` no longer shows owner-only blocks (credits, subscription, draft offers, account shortcuts, «Nastavenia» link) when viewing your own profile; use `/profil` (account hub) for those.
- Public profile sidebar: removed «Ponúknuť prácu»; «Napísať správu» opens the chat room via `POST /api/profiles/:id/open-chat` (existing application thread or picker when several).

## 2026-05-31 — Profesionáli ad owner name on detail

Fixed:
- `GET /api/company-ads/:id` owner snapshot resolves display name from `first_name` + `last_name` when `display_name` is empty (same as public profile).
- Posted-by row label matches jobs (`Zverejnil`) and shows the **publishing account** (`owner_id`), not ad `contact_person` (contact stays in the contact section).

## 2026-05-31 — Profesionáli ad detail (job-style listing)

Changed:
- `/profesionali/[id]` is a dedicated service-ad listing page (`CompanyAdDetailView`), not the owner's full public profile.
- Job-detail layout: hero, meta pills, contact sidebar, posted-by card linking to `/profil/[ownerId]`, description, services, location, gallery.
- Catalog cards CTA: «Zobraziť inzerát» (was «Zobraziť profil»).
- `GET /api/company-ads/:id` returns owner snapshot fields (`owner_display_name`, `owner_company_name`, avatar/logo, registry flag) for the posted-by card.
- Removed `companyAd` embed from `PublicProfileCard` (profile-only at `/profil/[userId]`).

Docs:
- `docs/frontend.md` — Profesionáli detail behavior.

## 2026-05-31 — Subscription pricing and CV quotas

Changed:
- Free plan (`zadarmo`): 5 monthly credits (was 2).
- Paid CV database included quotas: `start` 50/25/25, `plus` 75/50/50, `pro` unlimited (unlock · contact · PDF per month).

Database:
- Migration `20260531120000_subscription_pricing_cv_quotas.sql`.

Docs:
- `docs/payments-credits.md`.

## 2026-05-31 — Job detail crash fix

Fixed:
- `parseJobRequirementsMeta` accepts JSON objects from the API (not only strings), fixing a runtime crash on `/app/jobs/:id`.
- Defensive array handling for languages, benefits, and related fields in `job-detail-display.ts`.
- Job detail load always clears the loading skeleton (`try/finally`).
- `watch(galleryPhotos)` moved below the computed definition (was a setup-time `ReferenceError` that blocked the whole detail page).
- Desktop `ContentReportButton` uses `job.id` for `target-id`.

## 2026-05-31 — Typesense is_foreign catalog filter

Fixed:
- Typesense jobs collection schema patch now adds `is_foreign` on existing indexes (was only on new collections).
- Job search skips Typesense when the collection lacks `is_foreign`; Postgres `search_jobs_hybrid` handles domestic/foreign catalogs without repeated WARN spam.
- When Typesense returns no foreign-scoped hits but Postgres finds matches, log at debug level and suggest `npm run search:reindex` in `backend-ts`.

## 2026-05-31 — Job detail builder parity

Changed:
- `/app/jobs/[id]` renders builder fields via `JobSingularDetailsSections`: schedule (from `requirements` JSON), location (PSČ, work mode), education, languages, skills, driver licenses, work shift, benefits, and application info (non-platform method, contact person, required documents).
- Meta pills show all employment types and first schedule line instead of unused `completion_deadline`.
- Urgent / foreign badges on hero; gallery excludes cover image when extra photos exist; desktop report button.

Added:
- `app-pwa/utils/job-detail-display.ts` (+ spec) and `components/job/JobSingularDetailsSections.vue`.

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Company ad public detail parity

Changed:
- `CompanyAdPublicSection` shows custom service area tags, contact person, and email/phone returned by the API (gated by `show_email_publicly` / `show_phone_publicly`).
- `CompanyAdWizard` contact step: visibility checkboxes for email and phone; blur on filled fields sets the flag to public.
- Gallery no longer duplicates the cover image when there are no separate gallery items.
- `getCompanyAdServiceAreasFullDisplay` in `utils/company-ad-display.ts`.

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Typ úväzku (unified labels)

Changed:
- Single Slovak copy for employment-type fields: **Typ úväzku** (find filters, job post wizard, CV builder, job email alerts).
- Canonical value labels (`Plný úväzok`, `Brigáda (dohoda)`, `Jednorazová práca`, …) in `app-pwa/utils/employment-types.ts`; job post, find catalog, alerts, and CV DB import from there.
- All typ úväzku filters expose the same five options as job post (plus turnus on foreign catalog); CV DB filter values use `brigada` / `one_off` aligned with CV `employment_types` (legacy `agreement` / `self_employed` URLs still match).
- Find jobs filter label fixed from „Typ spolupráce“ to „Typ úväzku“; legacy `fuska` displays as jednorazová práca.

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Typ mzdy (unified labels + catalog filter)

Changed:
- Job post, detail, and find catalog use shared salary-type labels from `app-pwa/utils/job-post-options.ts` (`getSalaryTypeLabel`, `SALARY_TYPE_FILTER_OPTIONS`).
- Find pay filter uses `salary_type` (hodinová / mesačná / jednorazová odmena, dohodou) instead of legacy `compensation_type`; legacy `compensation_type=fixed` maps to `one_time`.
- Job detail sidebar shows correct typ mzdy from `salary_type`, not only legacy `compensation_type`.
- Search API: Typesense/Postgres fallback filter all `salary_type` values; `compensation_type` query kept only when `salary_type` is absent.

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Unified native checkboxes

Added:
- `app-pwa/components/ui/AppCheckbox.vue` — shared square checkbox (`default` on light UI, `onDark` for footer newsletter consent); `size-5`, marketing-green accent, focus ring.

Changed:
- Replaced ad-hoc `<input type="checkbox">` styling across consent forms, CV editor, company ad wizard, applicants list, job wizard (urgent), and CV database filters. Toggle switches (`SettingsToggleRow`, `AppSettingsSwitch`, job ASAP) unchanged.

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Work category icon mapping unified

Fixed:
- Single slug→icon map tied to `CATEGORIES` in `app-icons.ts`; legacy Base44/English aliases (`construction`, `moving`, `doprava`, …) normalize before lookup (no more `briefcase` fallback on old data).
- Nest API returns canonical category slugs on read (`normalizeJobCategorySlug` in job/company-ad mappers).
- Hub rows (jobs, company ads, email alerts) and publish wizards use `CategoryHubGlyph` / `CategoryIcon` instead of employment gradients or unrelated swatches.
- Urgent job cards keep category icon in the category pill; urgent badge stays separate.

Database:
- `20260531210000_normalize_work_category_slugs.sql` — backfill legacy category values on `job_offers`, `company_ads`, `job_email_alerts`.

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Category icons consistency

Fixed:
- `auto` (doprava / logistika) category icon is truck everywhere, matching design and wizard copy; legacy `doprava` slug aliases normalize to the same icon.
- Job catalog cards (`FindJobsCatalogPage`) and company ad cards/detail use `CategoryIcon` / `getCategoryIconName` instead of hardcoded warning or generic icons.
- Find and profesionáli filter dropdowns show per-category icons aligned with the home grid.
- Company ad hub swatches keyed by all 10 canonical `CATEGORIES` slugs.

Added:
- `components/CategoryIcon.vue` — shared wrapper for category badges (optional urgent bolt).

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Unified work categories

Fixed:
- Job publish wizard, filters, home grid, company ads, and job email alerts use the same 10 industry slugs and Slovak labels (`app-pwa/utils/job.ts`).
- Removed alternate publish picker labels (`add-job-categories.ts`); company ad hub swatches keyed by canonical slugs.
- Nest: shared `job-categories.constants.ts`; `@IsIn` on job/alert category fields; publish rejects unknown slugs; analytics charts use display labels.

Docs:
- `docs/features.md`.

## 2026-05-31 — Foreign job catalog split fix

Fixed:
- Foreign job wizard: country dropdown + free-text city for place of work; foreign catalog location filter lists countries (`foreign-work-countries.ts`).
- Domestic vs foreign listings no longer share stale results when navigating between `/pracovne-ponuky` and `/zahranicne-pracovne-ponuky` (catalog remount + `isForeign` watch).
- Search hydration filters `job_offers.is_foreign` after Typesense so mixed catalogs cannot leak across scopes.

## 2026-05-31 — Foreign job offers (create + catalog)

Added:
- Routes `/vytvorit-zahranicnu-ponuku` (hub, `/novy`, `/[jobId]`) and `/zahranicne-pracovne-ponuky`; `job_offers.is_foreign` splits domestic vs foreign search catalogs.
- Typ úväzku **Turnusová práca** on foreign wizard (`employment_types: turnus`, `work_shift_modes` id 6, Obdobie Od/Do in `requirements` JSON).
- Shared `FindJobsCatalogPage` for `/pracovne-ponuky` (`is_foreign=false`) and foreign listing (`is_foreign=true`, turnus filter).

Changed:
- `GET /api/search` accepts `is_foreign=true|false`; Typesense jobs index field `is_foreign`; `search_jobs_hybrid` param `p_is_foreign`.
- `GET /api/jobs?my=true` filters by `is_foreign`; `is_foreign` cannot change after create.

Database:
- Migration `20260531200000_job_offers_foreign_and_turnus.sql`.

Docs:
- `docs/features.md`, `docs/frontend.md`.

## 2026-05-31 — Job email alert match count

Fixed:
- Wizard preview count and alert email dispatch use relevance search + Postgres catalog hydrate (matches `/pracovne-ponuky`), not inflated raw Typesense `found` with `sort: created_at`.
- Typesense job filter excludes passed application deadlines (`application_deadline_ts`); inactive/draft listings are removed from the index on re-index.

Docs:
- `docs/notifications.md`.

## 2026-05-31 — CV database nav and page load

Fixed:
- `/databaza-zivotopisov` no longer crashes on load (`insufficientCreditsUserMessage` import in `CvCandidateDetailModal`).
- App nav menu links use default `NuxtLink` navigation except when returning from a wizard sub-route to its hub.
- Legacy `/app/databaza-zivotopisov` redirects via `resolveLegacyAppPath`.

## 2026-05-31 — Blog excerpt and cover backfill

Changed:
- Admin save/publish persists derived `cover_image_url` (first body image or titulná fotka) and auto-fills empty `excerpt` from SEO/body.
- Public list API selects `excerpt` / `seo_description`; migration backfills existing posts missing cover or perex.
- Trusted blog image URLs accept project `SUPABASE_URL` host and local Supabase dev.

## 2026-05-31 — Blog grid cards equal height

Changed:
- `GET /api/blog` list items include `excerpt`; grid cards use fixed 3-line title and excerpt slots (`line-clamp` + `min-h`) so rows align.
- Homepage blog section reuses `BlogPostCard` (`variant="home"`) with the same layout.

## 2026-05-31 — Unified form field styling (CV builder)

Changed:
- Canonical text/number/textarea controls: `.addjob-input` / `.addjob-textarea` + `.cv-field` everywhere (settings, profile, auth, checkout billing fields, chat, list search, hub rename dialogs).
- `utils/form-field-ui.ts` + `useSettingsFormStyles()` (removed legacy `form-input` variant); `wizard-ui.ts` re-exports shared tokens.
- Modifiers: `--inset` (chat composer, list search), `--compact`, `--danger` (account delete confirm); `.list-search-shell` for catalog search bars.

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Blog cover from editor images

Fixed:
- Admin **Publikovať** now saves pending edits (cover upload, body) before publishing — cover was previously dropped when publishing without **Uložiť**.
- On save, `cover_image_url` falls back to the first trusted inline image from the TipTap body when no titulná fotka is set.
- Public blog API resolves list/detail thumbnails the same way (works for existing posts without re-save).

## 2026-05-31 — Blog cover thumbnails 4:3

Changed:
- Blog list cards, featured card, home blog teaser, related-article thumbs, and admin cover preview use **4:3** landscape aspect ratio (`BLOG_COVER_ASPECT_CLASS`).

## 2026-05-31 — Blog post excerpt on detail page

Changed:
- `GET /api/blog/:slug` returns `excerpt` (explicit DB value, else SEO popis, else truncated body plain text).
- PWA `/blog/[slug]` shows excerpt under the title; admin blog edit restores **Perex** field.

Docs:
- `docs/features.md`.

## 2026-05-31 — Rich text editor formatting & toolbar

Changed:
- `AppRichTextEditor`: block-type `AppFormDropdown` (`variant="toolbar"`) instead of native select; ProseMirror uses shared `.rich-html-content` (bold, italic, underline, lists, headings visible in editor).
- `AppFormDropdown`: `variant="toolbar"` for compact pill trigger aligned with editor toolbar.
- Job detail and `CompanyAdPublicSection`: `.rich-html-content` on sanitized `v-html` wrappers (replaces long Tailwind descendant utilities on job pages).

Docs:
- `docs/frontend.md`.

## 2026-05-31 — CV DB quota: no credit fallback

Changed:
- `CvDatabaseQuotaService`: when monthly CV quota is exhausted on capped plans (`zadarmo`), return `403` instead of spending 1 credit per action.
- Removed `unlockCandidateContact`, `contactCandidate`, `downloadCandidateCvPdf` from `CREDIT_COSTS`; removed `pricingCvFreeQuotaNote` copy.

Docs:
- `docs/payments-credits.md`.

## 2026-05-31 — Cenník pricing UI v2

Changed:
- `/cennik`: credit packs as a single white list panel (price + amount, no per-credit line); plans as one four-column panel with checkmark features (CV detail in compare table only); compare table adds monthly credits and active-job rows.
- Removed tab intro copy and „Môj plán“ banner on `/cennik` (current plan still marked on the tier column).

## 2026-05-31 — Cenník layout and pricing cards

Changed:
- `/cennik`: `max-w-[1400px]`; tab content on mint (removed outer white wrapper); credit packs and plans use shared `PricingTierCard` (marketing-surface + shadow, featured/current accents); plans include inline CV limits; compare table matches tier card surface.

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Job post wizard UX & publish credits

Changed:
- `/vytvorit-ponuku` step 3: education single dropdown, skills via SK catalog combobox (`JobPostSkillTagsField`), driver licenses as wizard pills (A–T), start date and application method as wizard pills (aligned with required-documents style).
- Job publish credits: normal **1** credit, urgent **3** credits (`publishJob30Days` / `publishUrgentJob30Days`); backend `chargeJobPublish` uses `is_urgent` on create, publish-from-draft, and renew.

Docs:
- `docs/payments-credits.md`, `docs/frontend.md`.

## 2026-05-31 — Job post: vodičák (CV chips) a panel kreditov

Changed:
- `/vytvorit-ponuku` krok 3: vodičské oprávnenia — plná mriežka AM…T ako v CV builderi (`JobPostCvLicensePillGrid`), mapovanie na `driver_licenses` ID; panel kreditov v `JobPostSectionCard` so skloňovaním (1 kredit / 3 kredity) a `AppButton` na `/cennik`.

Docs:
- `docs/frontend.md`.

## 2026-05-31 — Cookie preferences footer link

Fixed:
- **Spravovať cookies** in `AppSiteFooter` opens the preferences modal — `components/consent` registered with `pathPrefix: false` so `AppCookiePreferences` / `AppCookieBanner` resolve (were `ConsentAppCookie*` only); footer mounts preferences + shared `cookiePreferencesOpen` ref with computed unwrap for `:open`.

## 2026-05-31 — DOMPurify sanitize import fix

Fixed:
- Job/company-ad/blog HTML sanitization no longer crashes with `Cannot read properties of undefined (reading 'sanitize')` — `isomorphic-dompurify` imported as namespace (`import *`) so CommonJS emit matches the package export.

## 2026-05-31 — In-app invoice detail (fix)

Fixed:
- Nuxt route: moved `fakturacia.vue` → `fakturacia/index.vue` so `/nastavenia/fakturacia/:invoiceId` renders (was conflicting parent without `<NuxtPage />`).
- Invoice lines: `invoices.listLineItems` instead of fragile `expand: ['lines.data']`.
- PWA: use auto-import names `SettingsInvoiceDetailPanel`, `SettingsInvoicePayForm`, `SettingsBillingPaymentMethodForm` (wrong tags rendered blank).

## 2026-05-31 — In-app invoice detail

Added:
- `GET /api/payments/invoices/:invoiceId` — Stripe invoice detail for authenticated customer (lines, totals, supplier/odberateľ, PDF link, pay if `open`).
- `/nastavenia/fakturacia/[invoiceId]` — `InvoiceDetailPanel` + `InvoicePayForm` (Payment Element when `can_pay`).
- `GET /api/billing/config` includes `invoice_supplier` from `BILLING_SUPPLIER_*` env vars.

Changed:
- Fakturácia invoice list links to in-app detail (`settingsInvoiceView`) instead of `invoice.stripe.com` by default; official PDF on detail page.
- `SettingsPageShell` optional `backTo` for subpages.

Docs:
- `docs/payments-credits.md`, `docs/frontend.md`, `docs/stripe-invoice-emails.md`, `docs/changelog.md`.

## 2026-05-31 — Subscription cancel regression (BFF + reconcile)

Fixed:
- Fakturácia / `SubscriptionStatusPanel`: load billing via `user` (BFF cookie auth), not `session.access_token` only — panel no longer skips `GET /api/billing/account` after BFF handoff.
- `reconcileUserSubscription`: missing Stripe subscription id no longer downgrades the user on `GET /api/billing/account` (avoids cancel failing with „Nemáte aktívne platené predplatné“ when test/live keys or webhooks drift).

## 2026-05-31 — In-app billing (no Stripe Customer Portal)

Added:
- Payment method management on `/nastavenia/fakturacia`: `GET /api/payments/payment-method`, `POST /api/payments/payment-method/setup`, `POST /api/payments/payment-method/confirm` (SetupIntent + Payment Element; audit `billing.payment_method_updated`).
- Resume scheduled cancel: `POST /api/payments/resume-subscription` (audit `subscription.resumed_by_user`); CTA in `SubscriptionStatusPanel` when `cancelAtPeriodEnd`.

Changed:
- Removed `POST /api/payments/billing-portal` and Stripe Customer Portal redirect; `BillingPaymentMethodForm`, `useSubscriptionResume`.
- `past_due`: hint + link to `#billing-payment-method` on Fakturácia.

Docs:
- `docs/payments-credits.md`, `docs/frontend.md`, `docs/changelog.md`.

## 2026-05-31 — Správca uchádzačov detail list UI

Changed:
- `/spravca-uchadzacov/[jobId]`: hub-style green filter (job title in hero, status tabs without Stiahnuté, custom sort dropdown); job actions toolbar below filters; applicant cards replace wide table (`ApplicantsList`).

Docs:
- `docs/frontend.md`, `docs/changelog.md`.

## 2026-05-31 — Správca uchádzačov hub UI

Changed:
- `/spravca-uchadzacov`: filter panel matches `pracovne-ponuky` layout (title in green hero, 3-column desktop search row, custom dropdowns, amber “nové prihlášky” quick toggle).
- Job hub list: card rows with only **Zobraziť uchádzačov** and **Zobraziť ponuku** actions (`ApplicantsJobsList` replaces table).

Docs:
- `docs/frontend.md`, `docs/changelog.md`.

## 2026-05-31 — Subscription cancel feedback

Added:
- Cancel flow asks for a reason (`SubscriptionCancelDialog`) before scheduling end-of-period cancel.
- `POST /api/payments/cancel-subscription` body: `{ reason_code, reason_detail? }`; audit event `subscription.canceled_by_user`; Stripe subscription metadata `cancel_reason_code`.

Changed:
- `useSubscriptionCancel` opens reason dialog instead of generic confirm.

Docs:
- `docs/payments-credits.md`, `docs/changelog.md`.

## 2026-05-31 — Fakturácia layout and subscription cancel

Fixed:
- `/nastavenia/fakturacia`: `content-layout="stacked"` with per-section `settingsCardClass` cards; marketing form styles; subscription hero no longer overlaps section heading.
- User subscription cancel: `POST /api/payments/cancel-subscription` schedules Stripe `cancel_at_period_end` (not immediate cancel); DB column `user_subscriptions.cancel_at_period_end`; immediate sync on cancel + webhook; UI shows pending cancellation and hides cancel button.
- Stale `stripe_subscription_id` (subscription missing in Stripe): cancel reconciles by downgrading to free plan instead of surfacing raw Stripe error.
- `SubscriptionStatusPanel`: pending cancellation shows end-date copy instead of free-plan upsell while paid access remains.
- `GET /api/billing/account`: reconciles `user_subscriptions` with Stripe before returning (fixes stale Plus/free mismatch).

Changed:
- `GET /api/billing/account` returns `cancelAtPeriodEnd`.
- Plan upgrade checkout still uses immediate Stripe cancel for prior subscriptions.

Database:
- Migration `20260531180000_user_subscriptions_cancel_at_period_end.sql`.

Docs:
- `docs/payments-credits.md`, `docs/frontend.md`.

## 2026-05-31 — Privacy toggles UI removed from PWA

Changed:
- Deleted `SettingsPrivacyForm` and all profile privacy toggle UI (public profile, contact visibility, marketing consent, CV search opt-in).
- Removed cross-links to privacy settings from notifications and export pages; `/nastavenia/sukromie` redirects to `/nastavenia/profil`.
- Removed Profil `tab=settings` (legacy URLs redirect via existing watch).

## 2026-05-31 — GDPR data export auth fix

Fixed:
- `GET /api/profiles/me/export` no longer requires `JwksAuthGuard` (Bearer-only); uses BFF session cookies like other protected routes.
- Export download sends the same Bearer/cookie auth as `useApi()` and retries once after BFF session refresh on 401.

## 2026-05-31 — Resend replaced with SMTP (nodemailer)

Changed:
- [`EmailService`](../backend-ts/src/email/email.service.ts) sends HTML mail via `SMTP_*` env vars instead of Resend HTTP API.
- Job/search alert crons gate on `EmailService.isConfigured()` (requires `SMTP_HOST` + `SMTP_FROM`).

Docs:
- [docs/email-smtp.md](email-smtp.md) — env vars, deliverability, callers.

## 2026-05-31 — SMS notification channel removed

Changed:
- `/nastavenia/notifikacie` and public preferences: in-app, e-mail, and push only (no SMS column or phone-verify hint).
- `/nastavenia/bezpecnost`: removed phone verification section used for SMS alerts.
- Backend: `resolveNotificationChannel` and prefs merge always keep `sms: false`; outbound Twilio SMS no longer sent from `NotificationsService`.

Docs:
- [docs/notifications.md](notifications.md) — SMS marked as not offered.

## 2026-05-31 — SK VAT invoice fields (§ 74) on Stripe invoices

Changed:
- Checkout billing: company address (ulica, mesto, PSČ), IČ DPH only as `eu_vat` (DIČ len custom field), Customer address sync.
- Invoices: `automatic_tax`, legal footer, `account_tax_ids` from env; profile address fallback for individuals.
- Docs: [docs/stripe-invoice-sk-vat.md](stripe-invoice-sk-vat.md) — dodávateľ Dashboard + odberateľ checklist.

## 2026-05-31 — Invoice email delivery (receipt_email + customer_email)

Changed:
- Credits/subscription checkout: `receipt_email` on invoice-backed PaymentIntent before pay (receipt includes hosted invoice link per Stripe); Customer `email` kept in sync at checkout and after payment.
- Webhook: sync Customer email from charge billing details after `payment_intent.succeeded` / `invoice.paid`.
- Billing sync keeps Customer `email` when applying company details.

Docs:
- [docs/stripe-invoice-emails.md](stripe-invoice-emails.md) — troubleshooting checklist; `receipt_email` vs Dashboard invoice email.

## 2026-05-31 — `/platba` invoicing + subscription alignment (Stripe docs)

Changed:
- `/platba`: PaymentIntent created on **Pay** with `billing` in body — company IČO/DIČ/VAT applied to Stripe Customer **before** invoice/subscription finalize (invoice PDF `custom_fields`, `preferred_locales: sk`).
- `create-payment-intent-credits` / `create-payment-intent-subscription` accept optional `billing` DTO.
- Webhooks: `invoice.payment_failed` → `past_due` + in-app notification; `invoice.payment_action_required` → in-app notification; `invoice.paid` on subscription invoices sets `active`.

Docs:
- [docs/payments-credits.md](payments-credits.md) — deferred PI flow, webhook list, smoke test steps.
- [docs/stripe-invoice-emails.md](stripe-invoice-emails.md) — webhook events + Stripe doc links.

## 2026-05-31 — Profile settings privacy section removed

Changed:
- `/nastavenia/profil` — privacy toggles and „Verejný profil“ footer link hidden; use `/profil` settings tab or dedicated `/nastavenia/notifikacie` where applicable.

## 2026-05-31 — Company settings UI cleanup

Changed:
- `/nastavenia/firma` — removed manual logo URL field and “Zobraziť verejný profil” link; logo upload via file picker remains.

Fixed:
- `/nastavenia/firma` — auto-reply card was empty because `EmployerApplicantAutoMessages` was not resolved (explicit import; Nuxt name is `ApplicantsEmployerApplicantAutoMessages`).

Added:
- Clickable variable chips (`{{candidateName}}`, `{{jobTitle}}`, …) on company auto-reply templates and per-job reply settings (`ApplicantMessageTemplateVarChips`).

## 2026-05-31 — Stripe-only invoice emails (Dashboard)

Changed:
- Removed Resend-based invoice mail; paid faktúry are sent by Stripe when Dashboard settings are enabled.
- No `receipt_email` on PaymentIntents (avoids receipt-only emails without invoice PDF).

Docs:
- [docs/stripe-invoice-emails.md](stripe-invoice-emails.md) — **Email customers about** vs **Payments** toggles; Billing → finalized invoices.

## 2026-05-31 — Invoice list & customer linking fix

Fixed:
- `ensureStripeCustomer` now upserts `user_subscriptions.stripe_customer_id` (insert when row missing).
- `resolveStripeCustomerId` — DB + Stripe metadata search for users who paid before customer id was saved.
- Subscription `confirm-subscription` — retrieve invoice when expand returns only an id.
- Credit/subscription PaymentIntents get `customer` on update; credits fulfillment persists customer id.
- `GET /api/payments/invoices` returns `total` for display; no silent empty list on Stripe errors.

## 2026-05-31 — Stripe Billing subscriptions documentation

Docs:
- [docs/payments-credits.md](payments-credits.md) — explicit Stripe Billing `Subscription` flow (`default_incomplete`, webhooks) vs one-time credit invoices.
- [docs/stripe-sandbox-catalog.md](stripe-sandbox-catalog.md) — sandbox account `acct_1TA4bmEXgv7DHN4D`, recurring vs one-time Price types.

## 2026-05-31 — Stripe catalog (test + live) and invoice emails

Changed:
- Regenerated test catalog (`create-stripe-test-catalog.mjs`); updated `SANDBOX_*` in `stripe-catalog-prices.ts` (latest test Price IDs).
- Live catalog: Stripe MCP audit + Supabase MCP `execute_sql` applied `stripe_price_id` on hosted DB; live Products tagged with `jobbie_slug` metadata.
- Documented live Price IDs (`LIVE_*` constants + `supabase/scripts/stripe-live-catalog-price-ids.sql`).
- Billing: `collection_method: charge_automatically` on subscriptions; credit invoices include description + `receipt_email` on PI; customer email required for checkout.
- Webhook comment on `invoice.paid` vs credit fulfillment paths.

Added:
- [docs/stripe-invoice-emails.md](stripe-invoice-emails.md) — Dashboard checklist for receipt/invoice emails (test + live).

Docs:
- [docs/stripe-sandbox-catalog.md](stripe-sandbox-catalog.md), [docs/payments-credits.md](payments-credits.md).

## 2026-05-31 — Unified checkout billing (credits invoices + buyer type)

Changed:
- Credits checkout: invoice-backed Payment Intent via shared `ensureStripeCustomer` (Stripe Invoicing) so credit packs issue invoices like subscriptions.
- Renamed `ensureStripeCustomerForSubscription` → `ensureStripeCustomer` (used by credits + subscriptions).
- `/platba`: **Fyzická osoba / Firma** + Stripe **Tax ID Element** (názov firmy, IČ DPH) + IČO/DIČ fields inside `StripePaymentForm` (not above the order summary); billing synced on `confirm-credits` / `confirm-subscription`.
- `@stripe/stripe-js` upgraded for Tax ID Element (`elements_tax_id_1` beta).
- `backend-ts/README.md`: note to rebuild/restart API after new payment routes (avoids `Cannot POST` 404).

Docs:
- `docs/payments-credits.md`, `docs/frontend.md`.

## 2026-05-31 — Cookie banner redesign + GA4/Clarity

Changed:
- PWA cookie consent: replaced `vanilla-cookieconsent` with custom JOBBIE UI (`AppCookieBanner`, `AppCookiePreferences`, `AppCookieConsentHost`); Essential + Analytics categories only; persisted in `jb_consent` cookie.
- Analytics orchestration: PostHog, GA4, and Microsoft Clarity load only after analytics consent (`utils/analytics-consent.ts`); gtag Consent Mode default-denied; cookies cleared on withdraw.

Added:
- Env: `NUXT_PUBLIC_GA_MEASUREMENT_ID`, `NUXT_PUBLIC_CLARITY_PROJECT_ID` (browser tags; separate from admin export API credentials).
- Utils: `ga4-client.ts`, `clarity-client.ts`, `cookie-consent-state.ts`; plugin `0.consent.client.ts`.

Security:
- CSP extended for Google Tag Manager / Analytics and Clarity script/connect hosts.

Docs:
- `docs/deployment.md`, `docs/observability-runbook.md`, `docs/frontend.md`.

## 2026-05-31 — PostHog free-tier optimization

Changed:
- PostHog cloud project: disabled autocapture, heatmaps, web vitals, performance/console/exception capture; event-triggered session replay on checkout/apply flows; input masking; test-account filter default on.
- PWA: lean PostHog init (`utils/posthog-client.ts`), consent-gated load, `advanced_disable_flags` until flags ship; session recording hook on key custom events.
- Cookie consent: PostHog listed in analytics table; `ph_*` cookies auto-cleared on withdraw.

Docs:
- `docs/observability-runbook.md` — GA4/Clarity/PostHog split, billing cap steps, SDK notes.

## 2026-05-31 — Súkromie merged into Profil settings

Changed:
- Removed standalone `/nastavenia/sukromie` page and dashboard card; privacy toggles live on `/nastavenia/profil` via `SettingsPrivacyForm`.
- Old `/nastavenia/sukromie` URL removed; privacy toggles on `/nastavenia/profil` only.
- Cross-links from notifications and export panels point to `/nastavenia/profil`.

## 2026-05-31 — Súkromie settings UI

Changed:
- `/nastavenia/sukromie` — remade `SettingsPrivacyForm`: grouped multi-card layout (`SettingsPageShell` `bare`), iOS-style toggles (`SettingsToggleRow`), sections for public profile, visible data, communication, CV database (individual only), and marketing; dependent disabled states; save error surfacing; links to export and danger zone.
- New components: `SettingsToggleRow`, `SettingsSectionCard`; `SettingsPageShell` gains optional `bare` prop for multi-card pages.
- Slovak copy for privacy sections and hints in `utils/strings.ts`.

Docs:
- `docs/features.md` — privacy settings UX note.

## 2026-05-31 — Profil settings UX

Changed:
- `/nastavenia/profil` — `SettingsPageShell` stacked layout + `ProfileSettingsForm` (marketing section cards, role toggles, footer links); `SettingsProfileForm` grouped sections, avatar hero row, `AppButton` save, loading skeleton.
- `/profil` — settings tab and inline editor use shared `ProfileSettingsForm` props (`wrapCards`, `showRolesSection`, `showCancel`); removed redundant outer card on settings tab.
- `SettingsPageShell` — `contentLayout` prop (`card` | `stacked`) replaces `bare`; `/nastavenia/firma` uses `stacked`.

Docs:
- `docs/frontend.md` — profil settings route.

## 2026-05-31 — Kredity settings UX

Changed:
- `/nastavenia/kredity` — remade `SettingsCreditsPanel`: balance summary, expiring-soon warning, usage costs, segmented ledger filters, polished transaction rows, error/retry via `AppAsyncListState`; Slovak labels in `utils/credit-ledger-labels.ts`.
- `/cennik` — `?tab=credits` / `?tab=plans` deep link; buy-credits CTA from settings uses `/cennik?tab=credits` (replaces broken `/cennik/kredity` link).
- Checkout return flash on kredity page when `success` or `payment_intent` query is present.

Docs:
- `docs/frontend.md` — Kredity settings section.

## 2026-05-31 — Danger zone settings UX

Changed:
- `/nastavenia/nebezpecna-zona` — structured export recommendation + danger card, typed-confirmation modal aligned with app dialogs, step-up auth before account delete.

## 2026-05-31 — Fakturácia settings UI

Changed:
- `/nastavenia/fakturacia`: remade `SettingsBillingPanel` — five sections (subscription via embedded `ProfileSubscriptionStatusPanel`, plan usage, Stripe payments, billing details, invoices); `AppButton` CTAs; localized copy in `utils/strings.ts`.
- `SubscriptionStatusPanel`: `embedded` prop for use inside `SettingsPageShell`; `refreshed` emit after subscription cancel.

## 2026-05-31 — GDPR export settings UX

Changed:
- `/nastavenia/export-udajov` — structured panel (included data checklist, format/limitations, rate-limit copy) aligned with other settings pages.

## 2026-05-31 — Bezpečnosť settings UI

Changed:
- `/nastavenia/bezpecnost`: remade `SettingsSecurityPanel` — security summary strip, grouped sections (`SettingsSection`), `AppButton` actions, password/TOTP confirm dialogs, two-step phone verification UI, link to zariadenia; copy centralized in `utils/strings.ts`.

## 2026-05-31 — Notification settings UI

Changed:
- `/nastavenia/notifikacie`: grouped sections (Komunikácia, Práca a ponuky, Účet, …), per-category channel switches (`AppSettingsSwitch`), browser-push callout card; replaces checkbox matrix table.
- `/preferences/[token]`: same components; PATCH merges edited categories into existing `notification_preferences` (preserves off-form categories).

Added:
- `useNotificationPreferencesMatrix`, `AppSettingsSwitch`, `SettingsNotificationCategoryRow`.

Docs:
- `docs/frontend.md` (settings notifications).

## 2026-05-30 — Admin desktop support console & ops

Added:
- **Podpora** (`/support`, job/ad/user detail routes): UUID hub, job/ad unpublish with audit, user billing tab (ledger + Stripe gaps), applications & chat room lists.
- `POST /api/admin/users/:id/grant-credits`, `export-data`, `close-account`; `GET .../billing`; moderation SLA columns + `POST .../reports/:id/claim`.
- Overview KPI `failed_payments_count` (Stripe webhook failures, 7d); operator-scoped recent audit on Prehľad.
- `profiles.admin_role` enum + `AdminScopeGuard` (analyst / moderator / super_admin).
- `GET /health` returns `version`; runbook drawer (`?`); `scripts/admin-smoke.ps1`.

Database:
- `20260530170000_content_reports_sla.sql`, `20260530170100_profiles_admin_role.sql`.

Docs:
- `docs/admin-desktop.md`, `jobbie-admin/README.md`.

Deferred:
- Reporter email on report resolve (no admin mailer); job impressions analytics KPI; PostHog divergence note; scheduled blog email/PDF; code signing / electron-updater (documented manual).

## 2026-05-30 — Subscription checkout: Payment Element (same as credits)

Added:
- `POST /api/payments/create-payment-intent-subscription` + `confirm-subscription` — in-page Payment Element on `/platba` with `locale: sk`.
- Buyer type toggle **Fyzická osoba / Firma**; company flow syncs profile VAT/company name to Stripe Customer.

Changed:
- `/platba` subscriptions match credits UX (`StripePaymentForm`) instead of embedded/hosted redirect.

## 2026-05-30 — Embedded subscription checkout fix

Fixed:
- `POST /api/payments/checkout-subscription` with `embedded: true` now reliably returns `client_secret` (boolean coercion on DTO, embedded session without conflicting `branding_settings`, retrieve fallback).
- PWA CSP: Stripe embedded Checkout (`checkout.stripe.com` script/frame/connect, `hooks.stripe.com`, `*.stripe.com` images).
- `/platba` auth shell: `clipCard=false` so embedded iframe is not clipped; remount logic in `StripeEmbeddedCheckout`.
- Hosted Stripe Checkout fallback button when embedded mount fails.

## 2026-05-30 — Auth-style checkout page (`/platba`)

Added:
- `/platba` with `AuthMarketingSplitShell` (login/register visual pattern): credit packs via Payment Element, paid plans via Stripe Embedded Checkout.
- `POST /api/payments/checkout-subscription` supports `embedded: true` + `return_url` (returns `client_secret`).
- `ROUTES.checkoutCredits` / `ROUTES.checkoutPlan`; cennik and profile flows navigate to `/platba` instead of inline/hosted-only payment UI.

Changed:
- `StripePaymentForm` `variant="auth"` for checkout page CTAs and DM Sans Stripe appearance.

Docs:
- `docs/frontend.md`, `docs/payments-credits.md`.

## 2026-05-30 — Stripe test/live price resolution

Fixed:
- `sk_test_` with hosted Supabase live `stripe_price_id` values caused Stripe “No such price” — `resolveCreditPackStripePriceId` / `resolveSubscriptionStripePriceId` in `stripe-catalog-prices.ts` map to sandbox Price IDs in test mode.

## 2026-05-30 — Stripe sandbox catalog

Added:
- `backend-ts/scripts/create-stripe-test-catalog.mjs` — creates test-mode Products/Prices via `sk_test_`.
- `docs/stripe-sandbox-catalog.md` — test `price_...` IDs and local dev notes (live IDs remain in hosted Supabase).

## 2026-05-30 — Stripe catalog checkout hardening

Fixed:
- Credits checkout no longer accepts `null` `price_id` from the API (`listCreditPacks` filters rows without `stripe_price_id`; clearer validation and 503 when catalog is empty).
- Subscription checkout error message references `start` / `plus` / `pro` and `STRIPE_PRICE_ID_SUBSCRIPTION_START` / `_PLUS` / `_PRO`.

Changed:
- PWA: only purchasable credit packs shown; config message when DB rows exist but lack Stripe Price IDs (`utils/credit-packs.ts`).

Docs:
- `docs/payments-credits.md` — Stripe catalog setup runbook; `supabase/scripts/stripe-catalog-price-ids.sql.template`; `backend-ts/README.md`.

## 2026-05-30 — Supabase disk: job impressions + search logs

Database:
- Migration `20260530160000_job_impressions_dedupe_and_unique.sql`: dedupe to one row per `(user_id, job_id)`, unique constraint, drop `list_session_id`, index `(job_id, shown_at desc)`, revoke client DML on `job_impressions`, grant `DELETE` on `search_query_logs` for service_role.

Changed:
- `POST /api/jobs/impressions`: upsert (max 100 job IDs per request) instead of append-only insert.
- Employer job stats: impressions = unique users with list impression in period; label “Zobrazenia v zozname (unikátne)”.
- Feed scoring: `loadImpressions` respects `ENGAGEMENT_RETENTION_DAYS` (default 90).
- `AuditRetentionService`: purge `job_impressions` (by `shown_at`) and `search_query_logs` (by `created_at`).

Docs:
- `docs/database.md`, `docs/database-operations-runbook.md`, `docs/deployment.md`, `backend-ts/.env.example`.

## 2026-05-30 — Admin desktop step-up window

Changed:
- `jobbie-admin` API: `ADMIN_RECENT_LOGIN_MINUTES` (default **120**) for `@RequireRecentLogin()` / `BearerRecentLoginGuard`; `GET /health` returns `recentLoginMinutes`.
- `AdminMfaBanner` and audit export error copy read the configured window from `/health`.
- Docs: `docs/admin-desktop.md`, `jobbie-admin/README.md`.

Note: `backend-ts` recent-login step-up remains **15 minutes** (unchanged).

## 2026-05-30 — Admin desktop operations UX

Added:
- **Prehľad** (`/overview`): KPI cards (signups, jobs published, open reports), recent audit events, quick links; default route after login.
- `GET /api/admin/overview`, `GET /api/admin/moderation/reports/count`, `GET /api/admin/users/search`, `GET /api/admin/users/:id`.
- Moderation: report previews + public PWA URLs (`PWA_PUBLIC_URL`), `POST …/dismiss` with `moderation.report.dismissed` audit, `POST …/hide` for `job_offer` / `company_profile` / `banner_ad`.
- Notifications: audience filter (`all` | `company` | `individual`), `GET …/broadcast/count`.
- Analytics: prior-period KPI % change, saved date presets (localStorage), summary CSV export, `GET /api/admin/analytics/external/test`.
- Audit: event-type prefix chips, `subject_id` filter, row actions (filter actor/subject, public deep links).
- `GET /api/admin/jobs/:id`, `GET /api/admin/company-ads/:id`; MFA step-up banner; `AppConfirmDialog` for destructive actions.

Changed:
- **Účty**: search table + detail panel, suspend/unsuspend with confirm, link to audit by `user_id`.
- **Moderácia** sidebar badge (open reports count).

Docs:
- `docs/admin-desktop.md`, `jobbie-admin/README.md`.

Deferred:
- `failed_payments` on overview (no Stripe failures table) — returns `null`.
- Hide for `company_review` / `chat_message` (unsupported target types).
- Dedicated admin UI routes for job/ad read-only detail (API only).

## 2026-05-30 — Job post plat typ pills

Changed:
- `/vytvorit-ponuku` Plat section: Hodinová mzda / Mesačná mzda / Dohodou use wizard pills (same as Typ úväzku) instead of segmented toggle.

## 2026-05-30 — CV znalosti catalog autocomplete

Added:
- `sk_cv_skills` table + `search_sk_cv_skills` / `ensure_sk_cv_skill` RPCs; `GET/POST /api/locations/sk-cv-skills`.
- PWA `AppSkCvSkillCombobox` + `useSkCvSkillSearch` in CV builder Znalosti section (search catalog, add custom name for reuse).

Changed:
- Saving a CV skill (`addSkill` / `updateSkill`) and the Znalosti combobox both call `ensure_sk_cv_skill` so any new label is inserted into `sk_cv_skills` for other users.
- `ensure_sk_cv_skill` insert uses `unique_violation` handler (fixes failed inserts); skill combobox commits typed text when the panel closes; RPC row parsing accepts single-object responses.

## 2026-05-30 — Job post hub and wizard (CV parity)

Changed:
- `/vytvorit-ponuku`: hub layout aligned with `/zivotopisy` (`pt-0`, `mt-[30px]`, no Profil back link, `jobHubPageDescription`, single-card empty state).
- `JobPostShell`: `cv-form`, step nav active-state fix, `overflow-hidden`, padding parity with CV shell.
- `JobPostSectionCard` + `JobPostWizard`: `wizard-ui.ts` fields/pills, `AppSkMunicipalityCombobox`, `AppFormDropdown`; removed scoped `.addjob-input` override.

## 2026-05-30 — Job email alert wizard (CV field CSS)

Changed:
- `JobEmailAlertWizardShell`: `cv-form` wrapper so inputs/dropdowns get the same bordered `addjob-input` styling as the CV builder.
- `JobEmailAlertCreateWizard`: CV field-row markup (`wizard-ui.ts` section cards, label + `gap-2` stacks, `grid gap-5` between sections).

## 2026-05-30 — Job email alert wizard (CV form parity)

Changed:
- `JobEmailAlertCreateWizard`: CV-aligned toggle pills (`utils/wizard-ui.ts`), `AppFormDropdown` for radius/category, `AppSkMunicipalityCombobox` for location, `cv-field` inputs; page wrapper matches `CvCreateWizard` (`pt-0`, single mint shell).
- `JobEmailAlertWizardShell`: main panel `overflow-hidden` (same as CV shell).

## 2026-05-30 — Profile hub UI cleanup

Changed:
- `/profil`: removed sidebar links (Moje ponuky, Životopisy, Kúpiť kredity) and personal-tab CTAs; Uložené tab (`SavedPanel`); Predplatné tab (`SubscriptionStatusPanel`); Recenzie tab (`ReviewsPanel`); provider stats navigates to `/dashboard/poskytovatel`.
- `PublicProfileCard`: `reviewsOnly` prop; owner buy-credits link points to `/cennik`.
- `useProfileTab`: dropped `provider` and `buy-credits` tabs; `?tab=reviews` aliases to `public-profile`.

Added:
- `composables/useSubscriptionCancel.ts`, `components/profile/SubscriptionStatusPanel.vue`.

## 2026-05-30 — Cenník marketing redesign (tabs)

Changed:
- `/cennik`: hero with segmented tabs (kredity | plány); dedicated `PricingCreditPacksGrid`, `PricingPlansGrid`, `PricingCvCompareTable` (CV limits in one comparison block below plans).
- Composables `usePricingCreditCheckout`, `usePricingPlanCheckout`; shared `pricing-cv-limits.ts`.

## 2026-05-30 — Pricing: hide Agentúra + cennik polish

Changed:
- Public catalog whitelists only `zadarmo|start|plus|pro` (API `.in('slug', …)`, checkout rejects `agentura`); cache keys `catalog:plans-list:v3`, `catalog:billing-config:v3`.
- `/cennik`: removed account summary card; section titles outside cards; credit packs match profile.html (amount + „kreditov“ + price); Plus plan highlighted.

Docs:
- Flush Redis `catalog:plans-list`, `catalog:plans-list:v3`, `catalog:billing-config:v2`, `catalog:billing-config:v3` after deploy.

## 2026-05-30 — Pricing page (/cennik) v2

Changed:
- `/cennik`: homepage-style gradient hero; profile-card layout (`max-w-[1300px]`); **kredity before predplatné**; pack cards show **X kreditov** + **za Y €** with per-pack **Kúpiť** CTA.
- `GET /api/billing/config`: cache key `catalog:billing-config:v2`; removed `creditUsageGroups` and `creditCosts` from public payload (per-action costs only in wizards via `billing-config.ts`).
- PWA `useCatalogBilling` state key bumped to avoid stale client cache.

Removed:
- `PricingCreditUsageTable` and all usage tables on cennik (Zverejnenie, Propagácia, banner, email, CV DB no longer listed on pricing).

Docs:
- After deploy, flush Redis keys `catalog:billing-config` and `catalog:billing-config:v2`.

## 2026-05-30 — Pricing page (/cennik) remake

Changed:
- Plan cards: CV databáza matrix (browse free; unlock/contact/PDF limits per tier).
- Four credit packs (5/€5 … 75/€45); `agentura` pack/plan deactivated in catalog.

Added:
- Migration `20260530140000_pricing_catalog_cleanup.sql`: CV quota columns, `employer_cv_monthly_usage`, `subscription_plans.active`.
- `CvDatabaseQuotaService` and `GET /api/employer/cv-database/:cvId/pdf`.

Removed:
- `BannerAdsController` registration; `POST /api/employer/cv-database/bulk-contact`.

## 2026-05-30 — Job hub delete action

Added:
- `DELETE /api/jobs/:job_id` — owner soft-delete (`is_deleted`, deindex Typesense); audit `job_offer.deleted`.
- Job hub row ⋮ menu and individual job wizard header menu: **Vymazať inzerát** with confirm dialog.

## 2026-05-30 — PWA chat URL slug

Changed:
- Chat moved from `/app/chat` to `/chat` (`pages/chat/*`); `/app/messages` redirects to `/chat`. Legacy `/app/chat/*` → 301; push/in-app notification deep links use `/chat/:roomId`.

## 2026-05-30 — PWA home and profile URL slugs

Changed:
- Marketing home moved from `/app` to `/` (`pages/index.vue`); profile hub `/app/profile` → `/profil`; public profiles `/app/profile/[userId]` → `/profil/[userId]`.
- Legacy `/app` and `/app/profile` included in redirect middleware; auth/post-login defaults and push notification fallbacks use `/` and `/profil`.

## 2026-05-30 — PWA marketing URL slugs

Changed:
- Canonical routes: `/pracovne-ponuky`, `/zivotopisy`, `/vytvorit-ponuku`, `/spravca-uchadzacov`, `/profesionali`, `/moje-reklamy` (and child wizard paths). Central constants in `app-pwa/utils/app-routes.ts`; backend mirror `backend-ts/src/common/app-paths.ts`.
- Legacy `/app/find`, `/app/add`, `/app/firmy/*`, `/app/profile/zivotopis/*`, `/app/zaujemcovia/*` → 301 via `server/middleware/legacy-app-routes.ts` + global route middleware.
- Job alert / search alert emails and default notification `link_path` use `/pracovne-ponuky`.

## 2026-05-30 — PWA global 404 / error page

Added:
- `app-pwa/error.vue`, `AppHttpErrorPage`, `utils/not-found.ts` (`showNotFound`) — branded 404 with CTAs to `/app` and `/pracovne-ponuky`.

Changed:
- Missing jobs, firmy ads, blog posts, profiles, email-alert edits, and wizard loads call `showNotFound` instead of inline “not found” text.
- `useBlog.fetchPost` returns `{ data, status }` so blog distinguishes slug 404 from API/load failures.

## 2026-05-30 — Admin analytics custom range + external sources

Changed:
- `jobbie-admin` Analytics: **Vlastné obdobie** (date pickers, max 366 days); summary validates date range server-side.
- New **Web & marketing** section: PostHog, GA4, Microsoft Clarity, Google Search Console via `GET /api/admin/analytics/external` (optional `api/.env` credentials).

## 2026-05-30 — Mark all notifications read on bell open

Changed:
- Opening the Upozornenia dropdown calls `PATCH /api/notifications/read-all` and clears the unread badge.

## 2026-05-30 — Hide security alerts from Upozornenia

Changed:
- New device / suspicious IP no longer create `security_alert` in-app notifications.
- `GET /api/notifications` excludes `security_alert` from list and unread count (existing rows hidden in the bell).

## 2026-05-30 — Admin audit log UX

Changed:
- `jobbie-admin` Audit log: filters, detailed table (subject, IP, payload, actor names), row expand, cursor pagination, Export CSV/JSONL buttons, chain verify.
- `GET /api/admin/audit/events`: returns `actor_label`; `GET /api/admin/audit/event-types` for filter hints.
- Audit CSV export: full columns including payload and actor metadata.

## 2026-05-30 — Search query analytics logging

Fixed:
- `search_query_logs`: `grant insert, select to service_role` (inserts were failing with permission denied; Supabase client does not throw).
- `SearchService.logSearchQuery`: log `{ error }` from insert; log Typesense zero-result searches.
- Admin analytics search window aligns with summary `from` date.

## 2026-05-30 — Admin analytics hire timestamp fix

Fixed:
- `admin_analytics_timeseries_daily`: CTEs renamed (`applications_daily`, `hires_daily`) so `applications` table is not shadowed; use `public.applications` for hire/application counts by `created_at`.

## 2026-05-30 — Admin analytics dashboard

Changed:
- `jobbie-admin` Analytics: KPI grid, funnel steps + chart, growth/cohort/search/latency charts (Chart.js), revenue/marketplace/users sections, date presets (7/30/90d).
- `GET /api/admin/analytics/summary`: typed DTO; always loads search KPIs via service_role (no `SEARCH_ANALYTICS_SECRET` gate).

Added:
- Migration `20260530120000_admin_analytics_extended.sql`: `admin_analytics_timeseries_daily`, `marketplace_snapshot`, `users_breakdown`, `revenue_period`, `search_analytics_summary`, `search_analytics_daily`.

## 2026-05-29 — Dashboard titles clarity (SK)

Changed:
- Customer vs provider dashboard titles and tabs renamed to match profile roles: „Štatistiky pracovných ponúk“ (ponuky) vs „Štatistiky verejného profilu“ (profil); subtitles on dashboard pages.

## 2026-05-29 — PWA dashboard visual redesign

Changed:
- `/dashboard/zakaznik` and `/dashboard/poskytovatel`: aligned with profile/settings design (DM Sans, `marketing-*` tokens, white shell, surface stat cards, `JaSegmentedToggle` periods).
- Shared `components/dashboard/*`, `utils/dashboard-chart-theme.ts`, `utils/dashboard-display.ts`; `JobStatsPanel` uses the same primitives.
- Chart.js theme: marketing green/amber, DM Sans axes; load error + retry on dashboard pages.

## 2026-05-29 — PWA singular blog layout

Changed:
- `/blog/[slug]`: layout aligned with `Jobbie design/singularblog.html` — author meta row, tags, author box, sidebar TOC/related/newsletter, article prose (blockquote, highlight-box), sticky sidebar scroll.
- `GET /api/blog/:slug`: returns `author_*` and `tags` for the public detail page.
- `sanitizeBlogBodyForDisplay`: allows `class="highlight-box"` on divs; lazy/async images in body.

## 2026-05-29 — PWA blog 404 (stale API)

Fixed:
- Root cause: Nest on port 8000 started before `BlogModule` returns `404` for `GET /api/blog`; PWA showed load error. **Restart** `backend-ts` (`npm run start:dev`) after pulling blog changes.
- `useBlog`: dev-only console hints on failure (404 → restart API, 503 → check base URL); validate list response shape before returning.

## 2026-05-29 — Firmy ad create/edit fix

Fixed:
- `GET /api/company-ads/:id/for-edit` — authenticated owner-only load for drafts (wizard no longer uses public optional `GET :id`).
- Company ad `POST`/`PATCH`/`DELETE` rely on `SessionAuthGuard` only (removed redundant `JwksAuthGuard` that blocked BFF cookie sessions).
- PWA wizard at `/app/firmy/add/[adId]` (mirrors `/app/add/[jobId]`); `/app/firmy/[id]/edit` redirects; `novy` uses provider gate + single draft create.

## 2026-05-29 — PWA blog list empty

Fixed:
- `useBlog`: call `GET /api/blog` (was `/blog`, 404) and unwrap `useApi()` `{ data }` response (was treating `ApiResponse` as list payload).
- Admin blog edit: hint that **Publikovať** (or status Publikovaný + Uložiť) is required for `/blog` in PWA.
- Public post by slug: require `published_at` in addition to `status = published`.

## 2026-05-29 — jobbie-admin API reachability

Changed:
- Electron waits for `GET /health` before loading the UI (up to 2 min in dev); `npm run dev` sets `JOBBIE_ADMIN_SKIP_API_SPAWN=1` so Electron does not start a second Nest process on port 3099.
- Admin API: startup validation for `api/.env` with clear console errors; bootstrap failures exit with a logged stack trace.
- Admin UI: banner + retry when `/health` fails; README troubleshooting (Windows port 3099, `Failed to fetch`).

## 2026-05-29 — Admin blog save 500

Fixed:
- `jobbie-admin` API: `sanitizeBlogBodyHtml` used a default import of `isomorphic-dompurify`; under CommonJS the package has no `.default`, so `DOMPurify.sanitize` threw and every blog create/update returned HTTP 500. Switched to namespace import.
- Blog create: `created_by` is set only when the admin user has a `profiles` row (avoids FK 500).

## 2026-05-29 — jobbie-admin API boot fix

Fixed:
- `AdminStorageModule` now imports `AdminAuthModule` + `SupabaseModule` so Nest can resolve `JwksAuthGuard` / `JwtVerifyService` (API previously crashed on startup after blog storage routes were added).
- Admin app: `adminApi` catches network errors; Analytics, Audit, Moderation, Blog list/edit clear loading state in `finally` and show API error text.

## 2026-05-29 — Blog inline images + rich editor

Changed:
- `jobbie-admin`: TipTap editor — inline images (upload → `blog-content` bucket), HR, code block; toolbar polish.
- Blog HTML sanitizers (admin API, PWA display, `backend-ts` util): allow trusted `img` from `blog-content` / `blog-covers` Supabase URLs; `loading="lazy"` on display.

Database:
- `20260529190200_blog_content_storage_bucket.sql` — public `blog-content` bucket (admin signed upload only).

## 2026-05-29 — Blog admin UX + public slim API

Changed:
- `jobbie-admin`: Jobbie-branded shell (sidebar, DM Sans, green tokens); blog list with search, status badges, dates.
- Blog edit: TipTap WYSIWYG (headings, lists, links, blockquote); cover file upload via `POST /api/admin/storage/uploads/*` → `blog-covers` bucket.
- Removed admin fields: author, perex, tags, accent color; public DTOs omit `excerpt`, author block, and tags.
- `20260529190000_blog_posts_relax_author_fields.sql`, `20260529190100_blog_covers_storage_bucket.sql`.

## 2026-05-29 — Marketing blog

Added:
- `blog_posts` table + indexes (`20260529180000_blog_posts.sql`); service_role DML only.
- Public API: `GET /api/blog` (keyset pagination, category filter, featured card), `GET /api/blog/:slug`.
- `jobbie-admin` Blog CRUD (`/api/admin/blog/*`) with HTML sanitization and audit events.
- PWA `/blog`, `/blog/[slug]` (Tailwind layouts from static designs); nav link + home blog teaser from API.

Docs:
- `docs/features.md`, `docs/frontend.md`, `docs/backend.md`, `docs/admin-desktop.md`.

## 2026-05-29 — Firmy hub + wizard (CV-style)

Added:
- `GET /api/company-ads?my=true` — owner's ads (all statuses) for hub.
- `/app/firmy/add` hub (`CompanyAdHubRow`), `/app/firmy/novy` draft bootstrap, `CompanyAdWizard` on `/app/firmy/[id]/edit` with `JobPostShell` steps.

Changed:
- `JobPostShell` accepts optional `steps` prop (company ads + jobs).

Docs:
- `docs/frontend.md`

## 2026-05-29 — Company ad builder simplified (firmy)

Changed:
- `CompanyAdForm` (add/edit): removed profile type, tagline, services block, street/PSČ/exact-address, preferred contact + public phone/email toggles, and business registry fields from the UI.
- `CompanyAdPublicSection` and `CompanyAdListCard`: no longer display tagline, profile type, services, certifications, business stats, or direct tel/mailto CTAs (website link kept).
- Publish validation (PWA + Nest): services and profile type no longer required for publish.

Docs:
- `docs/frontend.md`

## 2026-05-29 — Benefits (Výhody) multi-select

Added:
- `AppIdLabelMultiCombobox` — searchable multi-select for stable ID catalogs (`BENEFITS`).
- Job post wizard step 4: **Výhody** section (`job_offers.benefits`).
- Job email alert wizard step 2: **Výhody** filter (`job_email_alerts.benefits`; Typesense `benefitsAll`).

Docs:
- `docs/features.md`, `docs/notifications.md`.

## 2026-05-28 — CV builder PDF export

Added:
- CV builder step 3: **Stiahnuť PDF** (html2pdf, same HTML as Náhľad / in-memory drafts).

Fixed:
- PDF export rendered unstyled (plain text): CSS variables moved from `:root` to `.cv-page-export` inside the captured subtree; DM Sans font link + longer iframe settle before capture.
- PDF no longer captures wizard step 3 UI (mount export DOM in main document, not off-screen iframe).
- PDF drops job-search-only block (typ úväzku, nástup, plat); `min-height: auto` + `avoid-all` page breaks fix spurious second page.

## 2026-05-28 — CV builder work preferences

Changed:
- Step 3 **Pracovné preferencie**: zmeny/víkendy, noc, presťahovanie/dochádzanie, práca z domu (`open_to_relocate_commute`, `remote_work_only` on `cv_job_preferences`).
- Invalidita presunutá do doplňujúcich častí; e-mailové ponuky pod preferenciami.

Database:
- `20260528140000_cv_job_preferences_relocate_remote.sql`

## 2026-05-28 — Spurious session_expired redirect

Fixed:
- `shouldPreferBffCookieAuth` no longer drops Bearer when BFF CSRF is in memory (caused 401 → false logout on CV and other pages).
- `handleSessionExpired` re-checks `GET /api/auth/me` after refresh before redirect; skipped while `auth-loading`.
- Auth plugin keeps `auth-loading` true until background `/auth/me` finishes on cached-shell boot.

## 2026-05-28 — Auth survives page refresh (BFF)

Fixed:
- Cold boot: restore session via `POST /api/auth/session/refresh` when auth cache exists but Supabase storage was cleared after BFF login (`jb_csrf` is not readable on PWA routes because `Path=/api`).
- Auth plugin: cookie-only `/api/auth/me` after refresh; ignore `INITIAL_SESSION` with null token; do not sign out while BFF restore is still plausible.

## 2026-05-28 — Production session logout (same page)

Fixed:
- PWA: `useApi()` applies tokens from `POST /api/auth/session/refresh` before retry; awaits session expiry handler with a pre-request snapshot so `fetchUser` clearing `user` no longer skips redirect (fixes “same page, logged out”).
- PWA: omit `Authorization: Bearer` when `jb_sid` cookie is on the PWA origin (cookie-first Nest auth).
- API: `SessionAuthGuard` uses valid Bearer **or** valid `jb_at` (expired Bearer no longer blocks refreshed cookie).

Changed:
- Shared [`bff-session-refresh.ts`](../app-pwa/utils/bff-session-refresh.ts), [`session-expiry.ts`](../app-pwa/utils/session-expiry.ts); docs production session checklist in [auth-security.md](./auth-security.md).

## 2026-05-28 — CV builder start date option

Added:
- **Termín možného nástupu:** third chip **Dátum** with date picker; stores ISO `YYYY-MM-DD` in `start_availability` (preview/employer cards show Slovak formatted date).

## 2026-05-28 — CV builder employment type chips

Changed:
- CV builder **Druh pracovného pomeru** uses `JOB_POST_EMPLOYMENT_OPTIONS` (job post creator labels/values) with driving-license chip styling (`h-[54px]`, soft/green toggle).

Fixed:
- Restored original `JOB_POST_EMPLOYMENT_OPTIONS` (Brigáda, Stáž, Jednorázová práca) — only CV builder was meant to align, not job post.
- Selected chips use mutually exclusive `bg-marketing-green` vs `bg-marketing-soft` classes (no Tailwind override).

## 2026-05-28 — MFA login page UX

Changed:
- `/auth/mfa` — same marketing split layout as login; 6-box OTP input (`AuthOtpDigitInput`); settings TOTP confirm reuses component.

## 2026-05-28 — TOTP duplicate factor / resume enroll

Fixed:
- **TOTP:** „friendly name already exists“ when a prior enroll left an unverified `JOBBIE TOTP` factor — resume pending verification on load, auto-remove stale unverified before new enroll, **Znova vygenerovať QR** action.

## 2026-05-28 — Supabase TOTP enrollment config

Docs:
- `supabase/AUTH-MFA.md`, `supabase/config.toml.example` — enable `auth.mfa.totp.enroll_enabled` (Dashboard or local CLI).

Changed:
- Settings security panel maps `MFA enroll is disabled for TOTP` to a Slovak hint pointing at the runbook.

## 2026-05-28 — TOTP enroll after BFF session

Fixed:
- **TOTP / MFA:** `invalid claim: missing sub claim` when enabling TOTP while logged in via BFF cookies only — `ensureSupabaseAuthSession()` bridges HttpOnly session to `supabase-js` via `POST /api/auth/session/refresh` (now returns `access_token` / `refresh_token` in JSON).

Changed:
- `SettingsSecurityPanel`, passkeys, auth plugin cold boot use the bridge before Supabase Auth calls.

Fixed:
- **TOTP QR:** enrollment QR image no longer double-wraps `data.totp.qr_code` when Supabase already returns a full `data:image/svg+xml` URL.

Docs:
- `docs/auth-security.md`.

## 2026-05-28 - jobbie-admin Windows release clean

- `npm run clean:release` (stops JOBBIE Admin / project Electron, clears `release-fresh/`, best-effort `release/`).
- `prebuild:win` + Windows builds output to `release-fresh/`, copy installer to `release/`.
- `jobbie-admin/README.md` troubleshooting for locked `app.asar` (including Cursor).
# Changelog

Human-readable log of important codebase changes. When you ship code changes, add an entry here and update the relevant doc under `docs/`.

## 2026-05-28 â€” Admin desktop Windows NSIS sharing

Added:
- `npm run build:win:unsigned` for friend distribution without Authenticode signing.
- NSIS polish: guided installer, Start Menu + optional desktop shortcut, uninstaller display name, installer/uninstaller icons from `build/icon.ico`.

Docs:
- `jobbie-admin/README.md` â€” â€œShare with a friend (Windows)â€, SmartScreen / `%APPDATA%\jobbie-admin\.env`.
- `docs/admin-desktop.md` â€” Windows share steps and unsigned build row.

## 2026-05-28 â€” Admin desktop icons & Mac DMG sharing

Added:
- `jobbie-admin/build/icon.{svg,ico,icns,png}` and `npm run icons:generate` (sharp + png-to-ico + png2icons).
- `npm run build:mac:unsigned` for ad-hoc distribution without Apple signing.
- electron-builder icons, DMG layout, `directories.app: "."` (Vue `app/` folder name clash), Windows `signAndEditExecutable: false`.

Docs:
- `jobbie-admin/README.md` â€” â€œShare with a friend (Mac)â€, Gatekeeper / `xattr`.
- `docs/admin-desktop.md`.

## 2026-05-28 â€” Admin desktop extraction (follow-up)

Added:
- `POST /api/admin/notifications/broadcast` on the local admin API (`jobbie-admin/api`) with admin + MFA + recent-login guards; **Upozornenia** screen in the desktop UI.
- Packaged Electron `.env` resolution (executable dir â†’ userData â†’ resources template) and production API spawn via `ELECTRON_RUN_AS_NODE`.
- Production-ready `electron-builder` config (`asarUnpack` for API bundle, NSIS/dmg artifact names).

Changed:
- Removed unused `isAdmin` from `app-pwa/composables/useAuth.ts`.

Docs:
- `jobbie-admin/README.md`, `docs/admin-desktop.md`.

## 2026-05-28 â€” Admin desktop app split

Changed:
- Removed `/admin/*` pages and `admin` middleware from `app-pwa`.
- Removed admin-only Nest controllers/modules from `backend-ts` (`/api/admin/*`); user content reports stay on `POST /api/reports` via `ContentReportsService`.

Added:
- [`jobbie-admin/`](../jobbie-admin/) â€” Electron + Vue 3 UI + local Nest admin API (port 3099, `127.0.0.1` only).
- [docs/admin-desktop.md](./admin-desktop.md).

Docs:
- `docs/README.md`, `docs/features.md`, `docs/frontend.md`, `docs/backend.md`, `docs/observability-runbook.md`.

## 2026-05-28 â€” Typesense CV school search

Changed:
- `GET /api/locations/sk-schools` uses Typesense (`sk_schools` collection) when `TYPESENSE_HOST` + `TYPESENSE_API_KEY` are set; falls back to Postgres `search_sk_education_institutions` on miss or error.

Added:
- Typesense indexing for `sk_education_institutions` (`indexAllSkEducationInstitutions`, `npm run search:reindex -- --schools-only` in `backend-ts`).
- Env: `TYPESENSE_COLLECTION_SCHOOLS`, `TYPESENSE_SCHOOLS_NUM_TYPOS`.

Docs:
- `docs/scalability.md`, `docs/backend.md`, `backend-ts/.env.example`.

Format:

```markdown
## YYYY-MM-DD â€” Short title

Changed:
- ...

Added:
- ...

Fixed:
- ...

Security:
- ...

Database:
- ...

Docs:
- ...
```

Omit sections that do not apply.

## 2026-05-28 â€” Employer CV database detail 404

Fixed:
- `GET /api/employer/cv-database/:cvId` no longer requires positions/skills/experience when the CV already appears in the employer list (`isCvEligibleForEmployerDatabase` aligned with list privacy gates).
- PWA CV database modal shows API `message` text instead of raw JSON on errors; list/detail/chat use `useApi()` (BFF cookies + CSRF).

## 2026-05-23 â€” CV school name search

Added:
- `sk_education_institutions` catalog + `search_sk_education_institutions` RPC; **~722 secondary schools** from CVTI SR Excel registers (`fetch_cvti_sk_schools.py`); universities via `build_sk_schools_csv.py` + `generate_sk_schools_seed.py`. Migration `20260623160200` refreshes DBs that got the initial small Wikipedia-only seed.
- `GET /api/locations/sk-schools?level=secondary|university` â€” local Postgres search (SK secondary; SK+CZ universities).
- `AppSkSchoolCombobox` on CV education â€žStrednÃ¡ Å¡kolaâ€œ / â€žVysokÃ¡ Å¡kolaâ€œ fields.

## 2026-05-23 â€” Login BFF session + post-auth bootstrap

Fixed:
- `POST /api/auth/session` rejected Supabase refresh tokens (~12 chars) because DTO required `MinLength(20)` â€” BFF cookies never established after login.
- Login `syncSession` validates `GET /api/auth/me` before clearing old BFF cookies; bootstrap flag kept through navigation; auth plugin no longer calls `signOut()` on `/auth/login` when `/auth/me` fails during handoff.
- After BFF handoff, clearing persisted Supabase storage emitted `SIGNED_OUT` and the auth plugin wiped `user` â€” stay signed in via `hasActiveBffSession()` / `bff-session-active`; only clear Supabase storage when `establishSession` succeeds.
- Dev logout (`session_expired`): cross-origin `:3001` â†’ `:8000` did not send `jb_*` cookies while `useApi` skipped Bearer when BFF CSRF existed â€” always send in-memory JWT; client rewrites API base to the PWA origin (Vite `/api` proxy).
- `ECONNRESET` / `nuxt dev` restart loop: disabled `@nuxtjs/tailwindcss` dev config viewer (`/_tailwind`); `modules/dev-stable` wraps Nuxt dev-fork `unhandledRejection` IPC handler so benign TCP resets do not call `process.exit()`; PWA SW off in dev; `fetchApi` returns 503 when API is down.

Security:
- `SessionAuthGuard` still prefers `Authorization: Bearer` over stale `jb_at` cookie (restart-safe).

Docs:
- [auth-security.md](./auth-security.md)

---

## 2026-05-23 â€” CV employer combobox (local RPO cache)

Added:
- `sk_companies` table + `search_sk_companies` / `upsert_sk_companies_batch` RPCs (migration `20260623150000_sk_companies.sql`).
- `GET /api/locations/sk-companies` â€” Postgres trigram search; RPO write-through only when cache returns fewer than `limit` rows (no Redis required).
- In-process memory cache (15 min) on Nest for repeat queries without Redis.
- `AppSkCompanyCombobox` on CV experience â€žZamestnÃ¡vateÄ¾â€œ (min. 3 characters before search).

Changed:
- `SkRpoLookupService.searchCompaniesByFullName` used only to backfill `sk_companies`, not on every autocomplete keystroke after cache warm-up.

---

## 2026-05-23 â€” Direct-to-Supabase signed uploads

Changed:
- File uploads: PWA sends metadata to `POST /api/storage/uploads/init`, uploads via `uploadToSignedUrl`, then `POST .../finalize` (no multipart file bodies to Nest).
- Multipart routes (`/api/storage/job-photo`, profile-avatar, chat media, CV photo file) return 410 Gone.

Added:
- Table `storage_pending_uploads`; `file-allowlist.ts` (extension/MIME blocklist); expanded chat document types (CSV, XLS, TXT, RTF, ODT, ODS, â€¦).
- Hourly cron: expire stale pending uploads.

Security:
- Server-generated paths; finalize magic-byte sniff + Sharp; SVG and double-extension tricks blocked.

Database:
- `20260623140000_storage_pending_uploads.sql`, `20260623140100_chat_media_mime_expand.sql`

Docs:
- [uploads.md](./uploads.md), security-storage / frontend-security rules.

---

## 2026-05-23 â€” Marketing pages public when logged out

Changed:
- CV hub (`/app/profile/zivotopis/*`), job email alerts (`/ponuky-na-email/*`), employer applicants (`/app/zaujemcovia/*`), and job post wizard entry (`/app/add/novy`, `/app/add/:id`) show `LoggedOutFeatureHero` for guests instead of `auth` middleware redirect.
- `worker-only` / `company-only` middleware skip guests; role checks apply only after sign-in.

## 2026-05-23 â€” Guest browse without forced login redirect

Fixed:
- Removed Nitro redirect `/cennik` â†’ `/app/plans` (plans require auth; pricing stays public on `/cennik`).
- `useApi` no longer sends guests to `/auth/login` on anonymous 401 â€” only signed-in users get session-expired redirect.
- Auth plugin clears stale BFF cookies on failed profile load; BFF bootstrap runs only after `/api/auth/me` succeeds.

## 2026-05-23 â€” Login post-auth bootstrap (fix)

Fixed:
- Auth plugin no longer calls `signOut()` when `/api/profiles/me` fails after `/api/auth/me` succeeded (root cause of â€œlogin OK but app failed to loadâ€).
- Login bootstrap flag stays active until `login.vue` finishes; plugin skips duplicate `SIGNED_IN` refetch when user is already loaded.
- `GET /api/auth/me` uses GlobalAuthGuard only (removed duplicate `JwksAuthGuard` that ignored BFF cookies).
- Shared `normalizePublicApiBase` for plugin `$fetch` URLs; JWT verify uses `maybeSingle()` for profiles.

## 2026-05-23 â€” Login post-auth bootstrap

Fixed:
- Login no longer triggers global sign-out when `/api/auth/me` returns 401 during bootstrap (`auth-login-bootstrap` + `skipSessionExpiry`).
- Auth plugin ignores spurious `SIGNED_OUT` during login (was clearing in-memory session when persisted Supabase storage was cleared).
- `syncSession` uses the session returned from `signInWithPassword` and clears persisted Supabase tokens only after `/api/auth/me` succeeds.
- `SessionAuthGuard` prefers `Authorization: Bearer` over stale `jb_at` cookies (fixes login when API is up and profile exists).

Changed:
- Backend JWT verify: HS256 fallback via `SUPABASE_JWT_SECRET` for legacy Supabase projects; ES256/RS256 via JWKS unchanged.

## 2026-05-23 â€” Global logout on password reset

Added:
- `POST /api/auth/sessions/revoke-all` â€” Supabase `signOut` scope `global` + revoke all `api_user_sessions`; audit `auth.sessions.revoked_all`.

Changed:
- Password reset and settings password change sign the user out on every device; user must log in again with the new password.

## 2026-05-23 â€” Reset password page design

Changed:
- `/auth/reset-password` uses the same two-column layout as login; Supabase errors mapped to Slovak via `map-supabase-reset-error.ts`.

Fixed:
- Recovery link no longer loses Supabase session when Nest `/auth/me` returns 401 (auth plugin skips profile fetch and sign-out on reset-password route).
- Password save succeeds even when BFF `syncSession` fails afterward (warning + login CTA).

## 2026-05-23 â€” Auth login and password reset

Added:
- PWA `/auth/reset-password` â€” set new password after email recovery link (PKCE `code` exchange + `updateUser`).

Fixed:
- Login no longer treats every failure as â€œwrong passwordâ€ (email not confirmed, post-login bootstrap, lockout).
- Login page no longer clears Supabase recovery sessions (`signOut` skipped for recovery URLs; redirect to reset page).
- Forgot-password emails redirect to `/auth/reset-password` instead of settings without a password form.
- `callback.vue` exchanges `?code=` explicitly; supports `redirect=/auth/reset-password`.
- Turnstile on login only after prior failed attempts (`requiresCaptchaForLogin`).

Changed:
- `login-status` response includes `captcha_required`; auth plugin routes `PASSWORD_RECOVERY` to reset page.

Docs:
- `auth-security.md`, `architecture.md`, `README.md` â€” Supabase redirect URL checklist.

## 2026-05-23 â€” CV driving license auto-include

Changed:
- Selecting a license group (e.g. B) auto-adds included lower groups per SK rules (B â†’ B, AM, B1); deselect removes only the tapped chip.

---

## 2026-05-23 â€” CV photo upload

Fixed:
- CV wizard photo upload called undefined `uploadPhoto`; now uses `uploadCvPhoto` multipart via Nest.
- `POST /api/cv/:cvId/photo` ignored multipart `file` (only JSON data URL); added `resolvePhotoUpload` like `me/photo`.
- Upload auth supports BFF cookies + CSRF, not only Bearer token.
- `CvPhotoUpsertDto` no longer requires `data_url`/`file_name` when multipart `file` is sent (fixes validation error on file upload).
- CV photo processing: fixed `sharp` CJS import (`sharp is not a function` at runtime).

---

## 2026-05-23 â€” CV year combobox infinite scroll

Changed:
- Year picker loads calendar years dynamically (`getCvCalendarYear()`), 50 per scroll chunk back to 1900; search + Enter accept any valid 4-digit year in range (not only prebuilt list). Newest year is the current calendar year only (no future year).

---

## 2026-05-23 â€” CV year combobox custom Enter

Fixed:
- Custom year on Enter disappeared when month was still â€žMesiacâ€œ â€” experience save sent `start_date: null`; now defaults to January (start) / December (end) until a month is chosen.
- Enter on year panel ignored input (`type="search"` / reload race); use text field + robust commit; experience/education saves sync draft from PATCH without full reload.

---

## 2026-05-23 â€” Searchable dropdown panel styling

Changed:
- Shared `app-form-dropdown__panel` classes for `AppFormDropdown`, `AppSkMunicipalityCombobox`, and `AppCvYearCombobox` (bordered panel, mint hover, selected state).
- Year field uses the same pill trigger and searchable panel as month/municipality fields in the CV wizard.

---

## 2026-05-23 â€” CV skills multiple rows

Fixed:
- Second+ â€žPridaÅ¥ znalostiâ€œ failed when legacy `unique (cv_id, skill_name)` was still in place (only one empty name allowed). Draft rows now use internal `__jb_draft:` storage keys; API/PDF/employer views show empty until the user names the skill.

Database:
- `20260623120000_cv_skills_multiple_drafts.sql` â€” drop legacy unique on `cv_skills`, partial unique index for non-empty user-facing names only.

---

## 2026-05-23 â€” CV skills add row

Fixed:
- `SkillUpsertDto` rejected empty `skill_name` on `POST /api/cv/:cvId/skills`, so â€žPridaÅ¥ znalostiâ€œ never created a draft row (languages already allowed empty names).

---

## 2026-05-23 â€” CV wizard privacy (step 2)

Changed:
- Removed duplicate â€žSÃºkromie a zdieÄ¾anieâ€œ block from CV wizard step 2 (ZadÃ¡vanie Ãºdajov); employer visibility stays on step 3, contact-details toggle moved to step 3.

---

## 2026-05-23 â€” CV municipality combobox

Added:
- `AppSkMunicipalityCombobox` â€” searchable SK obec picker in CV wizard (personal address + experience city).
- `POST /api/locations/sk-municipalities` â€” ensures user-entered obec exists in `sk_municipalities` (placeholder kraj/okres when new).

Database:
- `ensure_sk_municipality` RPC (service_role only).

---

## 2026-05-21 â€” `/app/add` nav and guest access

Fixed:
- Job post hub (`/app/add`) no longer uses `auth` middleware on the index route â€” guests reach the marketing hero (like `/app/firmy/add`); login/register still redirect back to `/app/add`.
- App nav `onNavItemActivate` allows navigation from `/app/add/:id` back to the hub.

---

## 2026-05-21 â€” Company job create scope fix

Fixed:
- `POST /api/jobs` no longer depends only on `jobs:*` scope guard; uses `assertCompanyUser` (firemnÃ½ `profiles.role`) so company accounts can create drafts even when `app_role` was not backfilled to `employer`.
- `POST /api/jobs` returned 403 â€œInsufficient permission scopeâ€ for company accounts whose `profiles.app_role` was still `user`; JWT scope resolution now maps `profiles.role = company` â†’ employer scopes (same as migration backfill).
- `/app/add/novy` and `/app/add/[jobId]` use `company-only` middleware; clearer API error text on draft create failure.

Security:
- `backend-ts/src/auth/scopes.ts` â€” `effectiveAppRoleForScopes()`; used in `jwt-verify.service.ts` when building `permissionScopes` only (stored `app_role` unchanged).

---

## 2026-05-21 â€” Job post hub and wizard (`/app/add`)

Changed:
- `/app/add` is now a hub (list drafts / published / inactive offers) aligned with `/app/profile/zivotopis`; create flow via `/app/add/novy` â†’ draft POST â†’ `/app/add/:jobId` wizard.
- Job post form moved to `JobPostWizard` + `JobPostShell` (4-step sidebar); publish/draft save returns to the hub.
- Profile: removed `my-offers` tab; sidebar links to `/app/add`; legacy `?tab=my-offers` redirects to the hub.

Added:
- `JobHubRow`, `jobHub*` strings, `pages/app/add/novy.vue`, `pages/app/add/[jobId].vue`.

Docs:
- `docs/frontend.md` route table for job post hub.

---

## 2026-05-21 â€” Job post typ ÃºvÃ¤zku on `/app/add`

Changed:
- `/app/add`: single â€œTyp ÃºvÃ¤zkuâ€ segmented control (5 options; no Å¡tudentskÃ¡ dohoda); removed duplicate employment pill row; `job_type` (tpp/brigada/fuska) derived for date sections.
- `/app/add` plat typ: hourly/monthly/negotiable for plnÃ½/skrÃ¡tenÃ½/brigÃ¡da/stÃ¡Å¾; one_time/hourly/negotiable for jednorÃ¡zovÃ¡ prÃ¡ca.
- `/app/add`: removed â€œPoÄet voÄ¾nÃ½ch miestâ€ field (API still defaults `workers_needed` to 1).
- `/app/add`: removed â€œPracovnÃ© miesto vhodnÃ© aj preâ€ (`suitable_for` still sent as `[]` when empty).
- `/app/add`: removed redundant â€œPlat dohodouâ€ checkbox (use plat typ **Dohodou**).
- `/app/add`: removed â€œPonÃºkanÃ© vÃ½hodyâ€ section (`benefits` still sent as `[]` when empty).
- `/app/add`: â€œZruÄnostiâ€ free-text tags (`skill_tags`) replace digitÃ¡lne zruÄnosti dropdown (`pc_skills` cleared on save).
- `/app/add`: vodiÄskÃ½ preukaz limited to main skupiny A, B, C, D, E, T (`Skupina E` id 17).
- `/app/add`: removed â€œPracovnÃ½ reÅ¾imâ€ section (`work_shift_modes` still sent as `[]` when empty).
- `/app/add`: prihlÃ¡senie â€” removed portfÃ³lio and certifikÃ¡t from required documents.
- Publish validation copy: â€œTyp ÃºvÃ¤zku je povinnÃ½.â€

## 2026-05-21 â€” Employer applicants spreadsheet tables

Changed:
- `/app/zaujemcovia` and `/app/zaujemcovia/[jobId]` use spreadsheet-style tables instead of card grids.
- Filter bars match `/app/find`: green hero, pill search, `h-[60px]` soft selects, `ListMobileFiltersDropdown` on mobile, â€œZruÅ¡iÅ¥ filtreâ€.

Added:
- `ApplicantsJobsTable.vue`, `ApplicantsListTable.vue`, `utils/applicants-table-styles.ts`.
- Slovak column header strings for both tables.

Docs:
- `docs/frontend.md` â€” table components.

---

## 2026-05-21 â€” Employer applicants UX completion

Changed:
- Applicant detail modal: CV preview (`ApplicantCvPreview`), auto-reply history, contact fields per API rules.
- Shared status changes via `useApplicantStatusAction` (auto-reply confirm in list, cards, detail, bulk).
- Job applicant page: listing status badge, `StatusDropdown` on cards and bulk bar, mobile filters on jobs hub.

Added:
- `composables/useApplicantStatusAction.ts`, `components/applicants/ApplicantCvPreview.vue`, `StatusDropdown.vue`.
- Backend tests: notes, bulk status, print list filter, duplicate auto-reply skip.

Docs:
- `docs/frontend.md` â€” applicant management components.

---

## 2026-05-21 â€” Firmy detail marketing layout

Fixed:
- `/app/firmy/[id]` uses `PublicProfileCard` (company profile hero, reviews, sidebar) instead of legacy `detail-page-*` styling.
- Linked company ad content shown in marketing-styled `CompanyAdPublicSection` below profile sections; back link goes to Firmy list.

Docs:
- `docs/frontend.md` â€” Firmy detail route behavior.

---

## 2026-05-21 â€” Billing step-up for password logins

Fixed:
- BFF `establishSession` now sets `last_step_up_at` on every successful login (not only MFA `aal2`), so credit/subscription checkout works for accounts without TOTP.
- `POST /api/auth/session/step-up` accepts `aal1` when the user has no verified TOTP factor; MFA accounts still require `aal2`.
- `RecentLoginGuard` reads `jb_sid` from cookies (runs before `GlobalAuthGuard`); payment routes no longer use `JwksAuthGuard` (BFF cookie auth only).
- `assertRecentLogin` resolves the latest active `api_user_sessions` row when `jb_sid` is missing (Bearer-only) and heals missing `last_step_up_at` for recently active sessions.
- PWA stores `csrf_token` from `establishSession` in memory (cross-origin dev cannot read `jb_csrf` from `document.cookie`); bootstraps BFF on load and before checkout.
- PWA billing: no silent redirect on buy; shows errors and retries step-up only when API returns `step_up_required`.
- Migration `20260622120500_backfill_api_session_step_up.sql` backfills `last_step_up_at` for existing active API sessions.

---

## 2026-05-20 â€” Employer applicants (UchÃ¡dzaÄi) rebuild

Added:
- PWA `/app/zaujemcovia`, `/app/zaujemcovia/[jobId]`, `/app/zaujemcovia/print/[jobId]` (find-inspired layout)
- `components/applicants/*`, `composables/useEmployerApplicants.ts`
- Migration `20260622140000_employer_applicants_v2.sql` (`reviewing`, notes, per-job reply settings, auto-reply log fields)
- Employer API: jobs hub, enriched applicants, detail, bulk status, notes, reply settings, print DTO

Changed:
- Auto-reply sends only when `send_auto_reply: true` (chat and optional email)
- Nav â€œSpravuj uchÃ¡dzaÄovâ€ links to `/app/zaujemcovia`
- `EmployerApplicantAutoMessages` restored on `/nastavenia/firma`

Database:
- `application_notes`, `job_applicant_reply_settings`; RPC allows `reviewing`

Docs:
- `docs/features.md`, `docs/frontend.md`, `docs/backend.md`, `docs/database.md`

## 2026-05-20 â€” Remove employer applicants PWA routes

Removed:
- PWA routes `/app/zaujemcovia`, `/app/zaujemcovia/[jobId]`, print view; `components/applicants/*`; `useEmployerApplicants` composable
- Profile sidebar tab `?tab=applicants`

Changed:
- App nav â€œSpravuj uchÃ¡dzaÄovâ€ remains as a non-navigating menu item (label + description only)

Docs:
- `docs/features.md` â€” employer applicants PWA section updated

## 2026-05-19 â€” Structured documentation system

Added:
- `docs/README.md` â€” documentation hub and codebase inventory
- `docs/architecture.md` â€” system diagram, modules, data flows, crons
- `docs/frontend.md` â€” Nuxt PWA structure, auth, API client
- `docs/backend.md` â€” NestJS API, guards, routes
- `docs/database.md` â€” schema domains, RLS, credit RPCs
- `docs/auth-security.md` â€” sessions, roles, CSRF, MFA
- `docs/payments-credits.md` â€” plans, packs, ledger, Stripe flows
- `docs/features.md` â€” product features map
- `docs/uploads.md` â€” storage pipeline
- `docs/notifications.md` â€” in-app, email, push, SMS, alerts
- `docs/deployment.md` â€” local dev and production deployment
- `docs/changelog.md` â€” this file

Docs:
- Root `README.md` updated for `app-pwa` (replaces stale `app-rn` references)
- `DEPLOYMENT.md` points to `docs/deployment.md`
- `AGENTS.md` and `.cursor/rules/documentation.mdc` â€” require doc updates on code changes
- Cross-links from `docs/SECURITY.md` and `docs/database-schema-conventions.md` to the doc hub

