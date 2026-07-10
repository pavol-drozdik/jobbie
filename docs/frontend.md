# JOBBIE frontend (PWA)

The user-facing app lives in [`app-pwa/`](../app-pwa/) (Nuxt 3, client-rendered SPA with Capacitor; **hybrid SSR** on public routes when `NUXT_PUBLIC_ALLOW_INDEXING` is set).

**Performance:** [frontend-performance.md](./frontend-performance.md) — bundle analysis, budgets, lazy-load patterns.

## SEO (production)

- **Enable indexing** on the public apex only: `NUXT_PUBLIC_ALLOW_INDEXING=1` and `NUXT_PUBLIC_SITE_URL=https://…` (no trailing slash). Staging/dev stay `noindex`.
- **Metadata:** `usePageSeo()` in [`composables/usePageSeo.ts`](../app-pwa/composables/usePageSeo.ts) — title, description, canonical, OG/Twitter, optional JSON-LD.
- **Sitemap:** `GET /sitemap.xml` (PWA Nitro) → `GET /api/seo/sitemap` (Nest). **Robots:** `GET /robots.txt` (dynamic).
- **Job detail URL:** `/ponuka/:id` (`ROUTES.jobDetail`); legacy `/app/jobs/:id` → 301.
- **Config helpers:** [`utils/seo-config.ts`](../app-pwa/utils/seo-config.ts), [`utils/seo-route-policy.ts`](../app-pwa/utils/seo-route-policy.ts), [`utils/seo-json-ld.ts`](../app-pwa/utils/seo-json-ld.ts).
- **Verification:** [seo-implementation.md](./seo-implementation.md) (matrix, curl, tests).
- **Build:** set `NUXT_PUBLIC_ALLOW_INDEXING` and `NUXT_PUBLIC_SITE_URL` at **build and runtime** for SSR `routeRules`; align API `PUBLIC_APP_URL` with the same host.

## Local development

- PWA dev server: **http://localhost:3001** (`devServer.port` in `nuxt.config.ts`).
- Nest API: `NUXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`). In dev, browser API calls use the PWA origin; Vite proxies `/api` and `/socket.io` to Nest.
- Realtime plugin checks Nest `GET /health` on the **configured** API origin before opening Socket.IO.
- Font Awesome (legacy CV wizard toolbar): `@fortawesome/fontawesome-free` via `assets/css/font-awesome.css`. **Prefer `AppIcon`** for new UI (`utils/app-icons.ts`); register wizard and CV shell are migrating off FA.

## Marketing layout tokens

Shared long Tailwind strings live in [`utils/marketing-ui.ts`](../app-pwa/utils/marketing-ui.ts):

| Export | Use |
|--------|-----|
| `authMarketingPanelClass` | Auth split-layout green panel |
| `authMarketingPanelRegisterClass` | Register wizard left panel |
| `catalogFilterHeroClass` | Green filter hero on catalog pages |
| `chatPageRootClass` / `chatShellCardClass` | Chat list + room shells |

Avatar fallback colors (no generic violet): [`utils/avatar-palette.ts`](../app-pwa/utils/avatar-palette.ts) — `avatarFallbackColor`, `CHAT_AVATAR_PALETTE`.

Tailwind extends `rounded-card`, `shadow-card`, `shadow-dropdown`, `shadow-hero`. Cursor utilities: `.is-clickable` / `.is-disabled-cursor` in `main.css` (avoids `cursor-pointer` in HTML for static scanners).


| Area | Role |
|------|------|
| `pages/` | Routes (`/app/*` authenticated app, `/auth/*`, `/nastavenia/*`, marketing) |
| `components/` | Feature UI grouped by folder (`cv/`, `firmy/`, `cv-database/`, `settings/`, …) |
| `composables/` | Shared state and API helpers (`useApi`, `useAuth`, form composables) |
| `utils/` | Pure helpers (validation, sanitize, upload policy, filter query builders) |
| `middleware/` | Client route guards (`auth`, `customer-only`, `worker-only`, `provider-only`, …) — **not** API authorization |
| `plugins/` | Boot: Supabase client, auth cache hydrate, consent, realtime, analytics |

## Cookie consent

- UI: [`components/consent/`](../app-pwa/components/consent/) — `AppCookieConsentHost` in [`app.vue`](../app-pwa/app.vue) hosts banner + preferences modal; cookie table from [`utils/cookie-inventory.ts`](../app-pwa/utils/cookie-inventory.ts).
- Store: `useCookieConsentStore()` — persists `jb_consent` v2 (`necessary`, `analytics`, `marketing`, `personalization`, `policy`, `ts`); visitor id `jb_consent_vid` for audit correlation.
- Re-open: footer / `layouts/default.vue` via `openCookiePreferences('footer')`.
- Logging: each choice → `POST /api/consent/cookie` (public, throttled) → `cookie_consent_log` (admin: jobbie-admin **Cookie súhlas**).
- Orchestration: [`utils/analytics-consent.ts`](../app-pwa/utils/analytics-consent.ts) — gtag Consent Mode + PostHog + Sentry (when DSN set) after **analytics** consent; GTM loads only after analytics consent (`loadGtm`); withdraw tears down GTM bootstrap + injected tags.

## Auth flow

Auth routes: `/auth/login`, `/auth/register/*`, `/auth/mfa`, `/auth/callback`, `/auth/reset-password` (email recovery). See [auth-security.md](./auth-security.md) for Supabase redirect URL setup.

1. User signs in with Supabase (`useSupabase`).
2. `useAuth().syncSession()` calls `useBffSession().establishSession()` → HttpOnly API cookies + readable `jb_csrf`.
3. Persisted Supabase tokens are cleared from storage after BFF bootstrap.
4. Nest calls use `useApi()` with `credentials: 'include'` and `X-CSRF-Token` on mutations.
5. In-memory Bearer is used only when `jb_csrf` is not yet present (mid-login) or for explicit `token` options (audit, step-up).

See [SECURITY.md](./SECURITY.md) and [`.cursor/rules/frontend-security.mdc`](../.cursor/rules/frontend-security.mdc).

## Permissions in the UI

- `useCan(action)` — hide/disable controls by role; **backend must enforce** every mutation.
- Route middleware — same limitation; redirects only.

## Confirms

- `useConfirm()` + `AppConfirmHost` in layout — settings, billing cancel, account delete (first step).
- Local `AppConfirmDialog` — flows with custom copy (e.g. job publish credits in `components/job-post/JobPostWizard.vue`).

## Form controls

- Native square checkboxes: `components/ui/AppCheckbox.vue` (`variant="default"` on light backgrounds, `variant="onDark"` on dark panels). Site footer newsletter uses `default` on the white footer panel. Supports `v-model`, `indeterminate`, and `required`.
- Boolean toggles (settings, cookies): `AppSettingsSwitch` / `SettingsToggleRow` — not `AppCheckbox`.

## Rich text (job & company ad body)

- Editor: `components/AppRichTextEditor.vue` (TipTap) — job post (`JobPostWizard`) and company ad (`CompanyAdWizard`).
- Persist with `utils/sanitize-job-description-html.ts`; display sanitized HTML with `.rich-html-content` in `assets/css/main.css` (editor ProseMirror + job detail `app/jobs/[id].vue` + `CompanyAdDetailMainColumn`).

## Uploads

- Never `supabase.storage.upload` from the PWA.
- `useStorageUpload()` and chat multipart → Nest (`/api/storage/*`, `/api/cv/:id/photo`, chat media).
- Client: `utils/upload-policy.ts` + `validateImageUpload` / `compressImageFileToJpeg` before upload.

## Complex feature entry points

| Feature | Primary files |
|---------|----------------|
| Job post hub & builder | `pages/vytvorit-ponuku/*`, `pages/vytvorit-zahranicnu-ponuku/*` (foreign, `JobPostWizard` `variant="foreign"`), `components/job-post/JobPostWizard.vue`, `JobPostShell.vue` (`cv-form`), `JobHubRow.vue`, `composables/useJobPostForm.ts`; hub layout matches `zivotopisy` |
| Job detail (public) | `pages/ponuka/[id].vue` (canonical; `/app/jobs/[id]` redirects), `components/job/JobSingularDetailsSections.vue`, `utils/job-detail-display.ts` — schedule (`requirements` JSON), location, requirements (education, languages, skills, licenses, shift), benefits, application info; meta pills use builder schedule; gallery skips cover photo; abuse report via `ContentReportMenu` (⋮ → Nahlásiť, `useContentReport`) |
| Company/service ad | `pages/profesionali/*` (catalog), `pages/moje-reklamy/*` (hub, `/novy`, wizard `[adId]`; legacy `/profesionali/[id]/edit` redirects), `components/firmy/CompanyAdWizard.vue`, `CompanyAdDetailMainColumn.vue` (`ContentReportMenu` on public detail), `CompanyAdHubRow.vue`, `composables/useCompanyAdForm.ts`, `useProfileMyCompanyAds.ts` |
| CV editor | `pages/zivotopisy/*`, `components/cv/CvPrototypeShell.vue`, `composables/useCv.ts`, `composables/useCvPrototypePreview.ts`, `composables/useCvRichTextField.ts`, `utils/rich-text-plain-length.ts`, `utils/cv-section-order.ts` (preview/PDF via shared `#cv-document` → `backend-ts/src/cv/document/`) — templates **Atlas**, **Redakčný**, **Minimalistický**, **Monochrómny** (stored as `modern` / `elegant` / `minimal` / `professional`). Rich-text fields (hobbies, summary, extra info, exp/edu description) use `AppRichTextEditor` + `sanitizeJobDescriptionHtml` on save; preview/PDF render sanitized HTML via `renderCvRichField`. Work experience and education rows can be reordered with up/down buttons (`reorderSection` → `sort_order`). |
| CV database (employer) | `components/cv-database/CvDatabasePage.vue`, `components/find/FindFiltersDropdownGrid.vue` (`gridVariant: cv-database`), `utils/cv-database-query.ts`, `utils/domestic-location-filter.ts` — green hero matches jobs catalog (9 pill filters: experience, job type, location, salary max, availability, sort, skills via `JobPostSkillTagsField`, languages + CEFR, education level); no advanced modal |
| Job search | `pages/pracovne-ponuky.vue`, `pages/zahranicne-pracovne-ponuky.vue`, `components/find/FindJobsCatalogPage.vue`, `components/find/find-list-filters-context.ts` — pay filter uses `salary_type` + `salary_min` query params (`utils/job-post-options.ts` labels); legacy `compensation_type` in URLs is mapped on read; **Typ úväzku** filter labels from `utils/employment-types.ts` |
| Employment type labels | `utils/employment-types.ts` — canonical SK labels for `employment_types` / catalog filters; consumed by job post (`job-post-options.ts`), find (`job.ts`), alerts, CV DB |
| Employer applicants | `pages/spravca-uchadzacov/*`, `composables/useEmployerApplicants.ts`, `composables/useApplicantStatusAction.ts`, `components/applicants/*` (`ApplicantsJobsList`, `ApplicantsJobsFiltersBar`, `ApplicantCard`, `ApplicantsList`, `ApplicantsListFiltersBar`, filter contexts, `StatusDropdown`, `ApplicantAutoReplyConfirm` for resend only). Name / **Zobraziť CV** → `CvCandidateDetailModal` or `/profil/:id`. Company auto-reply templates: `/nastavenia/firma` (`EmployerApplicantAutoMessages`); when enabled, invite/reject status changes send the template automatically. Bulk status capped at 50 IDs. |
| Job email alerts | `pages/ponuky-na-email/*`, `components/job-alerts/JobEmailAlertCreateWizard.vue`, `JobEmailAlertWizardShell.vue`, `composables/useJobEmailAlertFormModel.ts`, `utils/wizard-ui.ts` (shared pill/label tokens with CV builder) |
| Chat | `pages/chat/index.vue`, `pages/chat/[roomId].vue`, `composables/useChatSocket.ts`, `composables/useChatRooms.ts` |
| Marketing blog | `pages/blog/index.vue`, `pages/blog/[slug].vue`, `components/blog/*`, `composables/useBlog.ts`, `utils/sanitize-blog-html.ts` |
| Public profile | `components/profile/PublicProfileCard.vue`, `components/profile/ProfileReviewForm.vue`, `pages/profil/[userId].vue` — visitors can submit/edit/delete a review (1–5 stars + optional comment) when logged in |
| Role dashboards | `pages/dashboard/zakaznik.vue`, `pages/dashboard/profesional.vue`, `components/dashboard/*`, `components/JobStatsPanel.vue`, `utils/dashboard-chart-theme.ts`, `utils/dashboard-display.ts`, `composables/useDashboardPeriod.ts` |
| Account settings | `pages/nastavenia/*`, `components/settings/SettingsPageShell.vue` (`content-layout="stacked"` for multi-card pages), `SettingsSection.vue`, `useSettingsFormStyles.ts`; profile at `/nastavenia/profil` (`ProfileSettingsForm`); company at `/nastavenia/firma` (`SettingsCompanyForm` + `EmployerApplicantAutoMessages`) |

## Form controls (canonical)

Text, number, email, password, tel, date, search, and textarea fields use the **CV builder** pill design globally:

| Piece | Location |
|-------|----------|
| CSS | `assets/css/main.css` — `.addjob-input`, `.addjob-textarea`, `.cv-field` (subtle border), modifiers `--inset` (borderless inside a shell), `--compact`, `--danger` |
| Class strings | `utils/form-field-ui.ts` — `formTextInputClass`, `formTextareaClass`, `formFieldLabelClass`, `formFieldRowClass` |
| Wizards | `utils/wizard-ui.ts` re-exports the same tokens (`wizardTextInputClass`, …) |
| Settings | `useSettingsFormStyles()` — returns canonical classes (no `legacy` variant) |
| List search bars | `.list-search-shell` + `.list-search-input` on jobs, firmy, CV DB, applicants filters |
| Selects | `AppFormDropdown` (`bordered` + `cv-field`), `AppNativeSelect` `variant="field"` |

New screens: prefer `form-field-ui.ts` or `useSettingsFormStyles()` over inline Tailwind on `<input>`/`<textarea>`. Section headings may still use `.form-label` (small caps style). Legacy `.form-input` / `.jobbie-input` are deprecated.

## Job & professional category icons

- Slug → icon map: [`utils/app-icons.ts`](../app-pwa/utils/app-icons.ts) (`getCategoryIconName`, `normalizeCategorySlug`, `LEGACY_CATEGORY_SLUG_ALIASES`); keys match [`utils/job.ts`](../app-pwa/utils/job.ts) `CATEGORIES`. Transport slug `auto` uses the truck icon (not passenger `car`). Legacy Base44/English slugs (`construction`, `moving`, …) normalize to canonical slugs before icon lookup; API read paths in Nest apply the same aliases ([`job-categories.constants.ts`](../backend-ts/src/common/job-categories.constants.ts)).
- Presentational: [`components/CategoryIcon.vue`](../app-pwa/components/CategoryIcon.vue) — category badges; [`components/CategoryHubGlyph.vue`](../app-pwa/components/CategoryHubGlyph.vue) — hub list rows (mint panel + green icon).
- Surfaces: home category grid (below hero), job catalog cards, job detail, saved jobs, public profile job list, profesionáli list/detail, find/firmy filters, job/company-ad/email-alert publish wizards (`AppFormDropdown` `categorySlug` option), job hub (`vytvorit-ponuku`), company-ad hub (`moje-reklamy`), email-alert hub (`ponuky-na-email`).
- Urgent jobs: category pill keeps the category icon; urgent is a separate badge (not `CategoryIcon` `urgent` on catalog cards).
- DB: migration `20260531210000_normalize_work_category_slugs.sql` backfills legacy `category` values on `job_offers`, `company_ads`, and `job_email_alerts`.

**Dashboards (`/dashboard/zakaznik`, `/dashboard/profesional`):** white card shell on `bg-marketing-mint` (profile/settings pattern): back link, `JaSegmentedToggle` period presets, `DashboardMetricCard` tiles on `marketing-surface`, Chart.js via shared `dashboard-chart-theme.ts` (DM Sans, marketing green). Per-job stats on `/app/jobs/[id]` reuse the same components in `JobStatsPanel`.

**Profesionáli catalog (`/profesionali`):** grid uses `CompanyAdListCard` with the same shell as job catalog cards (category chip, optional **Nové** badge, three meta rows — location, availability, price — and owner initials footer).

**Profesionáli detail (`/profesionali/[id]`):** dedicated listing page (`CompanyAdDetailView` + `CompanyAdDetailMainColumn`), layout mirrors job detail (`app/jobs/[id]`): hero, title/meta pills, sticky contact sidebar (price, **Napísať správu** via `CompanyAdOwnerOpenChatActions` → `POST /api/company-ads/:id/open-chat`, phone/email, website), posted-by card with platform message + link to `/profil/[ownerId]`, description, services, location, gallery. Respects owner `public_allow_platform_contact` on the API. `GET /api/company-ads/:id` includes owner snapshot fields for the posted-by card. Public **profile** (reviews, jobs list) stays on `/profil/[userId]` only. Back link returns to `/profesionali`.

**Moje reklamy (`/moje-reklamy`):** CV/job-style mint page listing the provider's ads via `GET /api/company-ads?my=true` (draft / active / inactive sections). Create flow: `/moje-reklamy/novy` posts a draft → `/moje-reklamy/[adId]` multi-step wizard (`CompanyAdWizard` + `JobPostShell`). Wizard loads via `GET /api/company-ads/:id/for-edit` (owner session required).

**Home:** marketing landing at `/` (`pages/index.vue`) — A/B hero via [`HomeHeroSection.vue`](../app-pwa/components/home/HomeHeroSection.vue) (dual-field search, role cards; phone column uses `<picture>` with `jobbie-mobile-hero-760.webp` on mobile and full `jobbie-mobile-hero.webp` on desktop; media-scoped preload + 663×960 intrinsic size for CLS); feature sections use `<picture>` with `phone-image-400.webp` / `spotlight-400.webp` on mobile and full WebPs on desktop (`scripts/optimize-home-marketing-images.mjs`). SSR payload from `fetchPublicJobsHome()` in [`utils/fetch-public-jobs-home.ts`](../app-pwa/utils/fetch-public-jobs-home.ts) includes latest jobs, grid jobs, and category counts. Homepage accent buttons/text use bright `marketing-green` (`#22c55e`). Global CSS: Font Awesome + CV mini-sheets load only on CV/register routes; DM Sans normal from `/public/fonts/` (preload-aligned); italic deferred. `nuxt.config` preconnects API/Supabase/CDN and preloads latin + latin-ext DM Sans WOFF2 (Slovak diacritics). Rollback hero: [`HomeHeroSection.legacy.vue`](../app-pwa/components/home/HomeHeroSection.legacy.vue). Download section: `public/img/jobbie-app.webp`. **Profile hub:** `/profil` — sidebar tabs: Môj profil, Uložené (`SavedPanel`), Predplatné (status + cancel via `SubscriptionStatusPanel`, upgrade link to `/cennik` on free plan), Recenzie (`ReviewsPanel`, read-only received reviews), Nastavenia účtu; provider stats link goes to `/dashboard/profesional`. Legacy `?tab=provider` → dashboard, `?tab=buy-credits` → `/cennik`. Full public profiles at `/profil/[userId]` include `ProfileReviewForm` (POST/PATCH/DELETE `/api/profiles/:id/reviews`; `GET /api/profiles/:id` returns `viewer_review` for authenticated visitors). Sidebar **Napísať správu** calls `POST /api/profiles/:id/open-chat` and navigates to `/chat/:roomId` (or shows an application picker when several job threads exist); respects `public_allow_platform_contact`.

**Checkout (`/platba`):** auth-style split layout (`AuthMarketingSplitShell`, `rounded-[24px]` clipped card like login). Query: `type=credits&pack=<slug>` or `type=subscription&plan_id=<uuid>`. `StripePaymentForm` (`locale: sk`, `collectBusinessBilling`, deferred amount): billing fields use canonical `form-field-ui` classes; required legal checkboxes (obchodné podmienky, immediate digital service, withdrawal notice with link to `/poucenie-odstupenie-od-zmluvy`); Stripe **Payment Element** + **Tax ID Element** on one screen with a single **Zaplatiť** (card, Google Pay, Apple Pay when enabled). Settings invoice pay and default payment method use the same Stripe appearance helper. Entry from `/cennik`, `/app/buy-credits`, profile buy-credits tab, and plan grids; optional `return` query (default `/cennik`). After payment (inline or 3DS return), users land on **`/platba/vysledok`** — same split shell as login/confirm-email — with success or failure state; Stripe `return_url` points there; `useCheckoutResult` confirms via API and strips Stripe secrets from the URL.

**Pricing (`/cennik`):** public page (`pages/cennik.vue`), `max-w-[1400px]`, green gradient hero with tab toggle (kredity | plány | doplnkové služby) and logged-in credit balance card; **Kredity** tab: `PricingCreditsUsageSection` (4 payable wizard actions + plan-tier costs from `GET /api/billing/config` → `planTierCreditCosts`, user plan from `GET /api/billing/account`) then `PricingCreditPacksGrid` white list panel; plans as one four-column white panel + `PricingCvCompareTable` (monthly credits, active offers, CV limits, and plan-tier publish/top costs); **Doplnkové služby** tab only (`PricingAddonServicesGrid` + split `PricingContactSection` → `POST /api/pricing-inquiries`). Job post wizard uses the same tier matrix for publish cost. Deep links: `?tab=credits` | `?tab=plans` | `?tab=addons`.

**Withdrawal rights notice (`/poucenie-odstupenie-od-zmluvy`):** marketing legal page (`MarketingContentPage`, `withdrawal-rights-notice-content.ts`); linked from checkout consent checkbox.

**Contract withdrawal (`/odstupenie-od-zmluvy`):** public auth-style split page (`AuthMarketingSplitShell`, `ContractWithdrawalForm`); footer link next to obchodné podmienky; submits via `POST /api/contract-withdrawals` (`useContractWithdrawal`). Prefills name/e-mail when logged in.

**Legacy URLs:** `/app`, `/app/profile`, `/app/chat`, `/app/messages`, `/app/find`, `/app/add`, `/app/firmy/*`, `/app/profile/zivotopis/*`, `/app/zaujemcovia/*` redirect (301) via `server/middleware/legacy-app-routes.ts` and `middleware/legacy-app-routes.global.ts` using `utils/app-routes.ts`.

**Firmy wizard:** four steps — základ, lokalita, cenník/kontakt/galéria, publikovanie. Simplified fields only (no profile type, services block, street/PSČ, business IDs in UI).

**Job email alerts wizard** (`/ponuky-na-email/novy`, `/ponuky-na-email/[id]`): same shell layout as the CV builder (`JobEmailAlertWizardShell` with `cv-form` for scoped field borders); section cards and fields use `utils/wizard-ui.ts` (`wizardFieldRowClass`, `wizardTextInputClass`, pills), `AppFormDropdown` (`bordered`), and `AppSkMunicipalityCombobox`.

**Job post wizard** (`/vytvorit-ponuku/[jobId]`): shared `JobPostShell` + `cv-form` (also used by company ads); `JobPostWizard` uses `wizard-ui.ts`, `AppSkMunicipalityCombobox`, `AppFormDropdown`, `JobPostSkillTagsField` (SK skill catalog), `JobPostCvLicensePillGrid` (same 16 categories as CV builder, stored as `driver_licenses` via `cv-driving-license-categories.ts`), and wizard pills for start date, application method, and required documents. Publish summary card: `creditCountLabel` (1 kredit / 3 kredity urgent). Create flow: `/vytvorit-ponuku/novy` POST draft → wizard with in-memory bootstrap (`useJobWizardBootstrap`); edit load via `GET /api/jobs/:id/for-edit` (owner session required). Hub `/vytvorit-ponuku` matches CV hub chrome (`pt-0`, `mt-[30px]`, single-card empty state).

**Settings (`/nastavenia/*`):** hub grid (`SettingsDashboardCard`) + subpages on `SettingsPageShell` (white card, back link; `content-layout="stacked"` when the page renders its own section cards). **Profil** (`/nastavenia/profil`): `ProfileSettingsForm` — sectioned `SettingsProfileForm` (photo, basic, about, professional, links), account-type pills, role toggles, links to súkromie and `/profil`. **Kredity** (`/nastavenia/kredity`): `SettingsCreditsPanel` — balance card from `GET /api/billing/credit-ledger`, usage cost list (`CREDIT_COSTS`), `JaSegmentedToggle` ledger filters, `AppAsyncListState` + localized reasons (`utils/credit-ledger-labels.ts`); buy CTA → `/cennik?tab=credits`, billing link → `/nastavenia/fakturacia`. **Fakturácia** (`/nastavenia/fakturacia`): `SettingsPageShell` with `content-layout="stacked"`; `SettingsBillingPanel` — embedded `ProfileSubscriptionStatusPanel` (own card), plan usage tiles, change plan CTA, in-app payment method (`BillingPaymentMethodForm` + SetupIntent), billing-details form (SK address for `individual`; full company identifiers for `company` accounts), invoice list linking to `/nastavenia/fakturacia/[invoiceId]` (`InvoiceDetailPanel`, `InvoicePayForm` for open invoices, PDF download) — each in separate section cards; resume subscription when `cancelAtPeriodEnd`. **Bezpečnosť** (`/nastavenia/bezpecnost`): `SettingsSecurityPanel` with summary chips, `SettingsSection` blocks (credentials, sign-in methods, phone), `AppButton` CTAs, `useConfirm` on password change and TOTP disable; subcomponents `SettingsSecurityEmailPassword`, `SettingsSecurityPasskeys`, `SettingsSecurityTotp`, `SettingsSecurityPhone`; link to `/nastavenia/zariadenia` for sessions.

## Errors and 404

- Global UI: [`app-pwa/error.vue`](../app-pwa/error.vue) + [`AppHttpErrorPage`](../app-pwa/components/AppHttpErrorPage.vue) inside `layout: app` (header/footer preserved).
- Unknown routes and missing resources: call `showNotFound(message?)` from [`utils/not-found.ts`](../app-pwa/utils/not-found.ts) **after** loading finishes (never while a skeleton is visible).
- Use resource-specific copy (`S.jobNotFound`, `S.profileNotFound`, …) as the optional message; omit for generic unknown URLs.
- Do **not** use `showNotFound` for permission errors (403), transient API failures (retry UI), or “empty content” that is not a missing page (e.g. user without CV).

## Settings — notifications

- Authenticated: `/nastavenia/notifikacie` — [`SettingsNotificationsForm`](../app-pwa/components/settings/SettingsNotificationsForm.vue) with grouped sections, [`AppSettingsSwitch`](../app-pwa/components/ui/AppSettingsSwitch.vue), shared matrix in [`useNotificationPreferencesMatrix`](../app-pwa/composables/useNotificationPreferencesMatrix.ts).
- Public token: `/preferences/[token]` — same row/switch UI; save merges only on-form categories via `mergeNotificationPreferencesPayload` (does not wipe prefs for categories off the public form).

## Lists and filters

- Find / firmy / CV DB keep filter state in the **URL** where possible (shareable searches).
- Debounced reload + `AbortController` on CV database and find wage fields.
- `AppAsyncListState` — standard loading / error / empty for async lists.
