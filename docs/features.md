# Product features

Map of major JOBBIE features to PWA routes and backend modules. Privacy rules for CVs, addresses, and contact fields: [GDPR-PRIVACY.md](./GDPR-PRIVACY.md).

## Profile: account type vs activity roles

| Field | Meaning | Gates |
|-------|---------|--------|
| `profiles.role` | `individual` or `company` (Jednotlivec / Firma · SZČO) | Firma settings (`/nastavenia/firma`), IČO, company public profile fields — **not** product nav |
| `customer_role` | „Potrebujem pomoc s prácou“ | Job posts, applicants, CV database (`customer-only` middleware, Nest `ProfileActivityAuthorizationService`) |
| `worker_role` | „Hľadám malé práce“ | CV builder, job email alerts (`worker-only`) |
| `provider_role` | „Chcem aby ma klienti našli“ | Company/service ads (`provider-only`) |

Users can enable multiple activity roles. PWA toggles: **Nastavenia → Profil** → „Čo chcete robiť?“ (`SettingsRolesSection`). Nav filtering: `app-pwa/utils/account-nav-access.ts`.

**Signup:** The registration wizard (`RegisterSignupWizard`) writes `customer_role`, `worker_role`, and `provider_role` into Supabase signup metadata (`buildRegistrationSignUpMeta` in `useRegistration.ts`). The `handle_new_user` trigger copies them onto `profiles` at user creation (including before email confirmation). When signup returns an immediate session, `useRegistrationSignUp` also PATCHes `/api/profiles/me` as a redundant path.

## Marketing blog

| Aspect | Location |
|--------|----------|
| **Purpose** | Public articles (tips, career, news); managed by operators |
| **PWA** | `/blog`, `/blog/[slug]`; home section loads latest 3 via `GET /api/blog` |
| **Backend** | [`blog/`](../backend-ts/src/blog/) — public read (`@Public()`, paginated) |
| **Admin** | `jobbie-admin` → Blog — CRUD + TipTap editor + cover upload (`/api/admin/storage/uploads/*` → `blog-covers`) |
| **Data** | `blog_posts` (service_role DML only; RLS enabled, no client policies) |

**Flow:** Admin creates draft (title, optional perex, category, WYSIWYG body, optional cover image) → server sanitizes `body_html` and injects `h2` ids for TOC → publish sets `published_at` → PWA list shows title/cover/meta; detail page shows perex under the title (falls back to SEO popis or body snippet when empty).

## Job posts and search

| Aspect | Location |
|--------|----------|
| **Purpose** | Companies publish job offers; users search, view, apply |
| **PWA** | `/pracovne-ponuky`, `/zahranicne-pracovne-ponuky`, `/app/jobs/[id]`, `/app/jobs/[id]/edit`, `/vytvorit-ponuku`, `/vytvorit-zahranicnu-ponuku`, `/app/offers` |
| **Backend** | [`jobs/`](../backend-ts/src/jobs/), [`search/`](../backend-ts/src/search/) (Typesense) |
| **Credits** | Publish/renew/promotions — [payments-credits.md](./payments-credits.md) |
| **Data** | `job_offers` (`is_foreign`, `employment_types` includes `turnus`), `job_offers_public`, `applications` |

**Foreign listings:** Domestic catalog (`/pracovne-ponuky`) and foreign catalog (`/zahranicne-pracovne-ponuky`) are mutually exclusive via `is_foreign` on search and create. Foreign post wizard adds **Turnusová práca** with Obdobie Od/Do.

**Flow:** Draft → validate → spend credits → activate → listing expiry cron deactivates when `ends_at` passes.

**Abuse reports:** Logged-in users open ⋮ on public job detail (`/ponuka/:id`) → Nahlásiť → `POST /api/reports` (`target_type=job_offer`). Admin queue: jobbie-admin **Moderácia**.

**Industry categories:** Ten slugs (`stavba`, `domacnost`, … `ine`) and Slovak labels are defined in `app-pwa/utils/job.ts` (`CATEGORIES`, `getCategoryLabel`). Server mirror: `backend-ts/src/common/job-categories.constants.ts` (`JOB_CATEGORY_SLUGS`, `getJobCategoryLabel`). Used for job offers, find filters, company ads, and job email alerts (not blog or CV driving-license categories).

**Structured fields:** Job post wizard step 4 includes **Výhody** (`job_offers.benefits` int[], catalog in `app-pwa/utils/job-alert-options.ts`) via searchable multi-select `AppIdLabelMultiCombobox`.

## Company / service ads (Firmy)

| Aspect | Location |
|--------|----------|
| **Purpose** | Company or professional service profiles as listings |
| **PWA** | `/profesionali`, `/moje-reklamy`, `/profesionali/[id]`, `/moje-reklamy/[adId]` |
| **Backend** | [`company-ads/`](../backend-ts/src/company-ads/) |
| **Credits** | `publishServiceProfile30Days`, renew, promotions |
| **Data** | `company_ads`, `company_ads_public` |

**Abuse reports:** ⋮ → Nahlásiť on `/profesionali/:id` → `target_type=company_ad`; Moderácia can pause the listing without disabling the owner’s public profile.

## Applications and employer applicants

| Aspect | Location |
|--------|----------|
| **Purpose** | Candidates apply to jobs; employers manage applicants per job (status, notes, auto-replies, print/export) |
| **PWA** | `/spravca-uchadzacov`, `/spravca-uchadzacov/[jobId]`, `/spravca-uchadzacov/print/[jobId]`; **company-wide** auto-reply templates in `/nastavenia/firma` (**Plus / Pro** only); per-job overrides exist in API (`job_applicant_reply_settings`) but no dedicated PWA editor yet; name opens CV profile modal; card list + bulk bar via `ApplicantCard` / `useApplicantStatusAction` (bulk max 50) |
| **Backend** | [`applications/`](../backend-ts/src/applications/), `employer-applicants.controller.ts` |
| **Data** | `applications` (incl. `reviewing`), `application_status_history`, `application_notes`, `job_applicant_reply_settings`, `company_applicant_message_templates`, `application_auto_messages` |

## CV builder

| Aspect | Location |
|--------|----------|
| **Purpose** | Multi-CV editor for job seekers |
| **PWA** | `/zivotopisy`, `/zivotopisy/novy`, `/zivotopisy/[cvId]` |
| **Backend** | [`cv/`](../backend-ts/src/cv/) |
| **Data** | `cvs`, `cv_personal_info`, section tables |
| **Privacy** | `visible_to_employers`, `show_contact_details` toggles in UI |

## CV database (employer)

| Aspect | Location |
|--------|----------|
| **Purpose** | Employers browse candidates who opted in |
| **PWA** | `/app/databaza-zivotopisov`, marketing `/databaza-zivotopisov` |
| **Backend** | `employer-cv-database.controller.ts` |
| **Credits** | Contact unlock, PDF, bulk contact — [payments-credits.md](./payments-credits.md) |
| **Privacy** | No gender/disability/birth date in employer DTOs; contact gated |
| **Filters** | Nine hero pill filters via `FindFiltersDropdownGrid` (search, location, job type, experience, availability, salary max, sort, skills catalog, languages + CEFR, education level). No advanced modal. Platform-only filters (activity, CV quality, contact presence) removed from the PWA. |

## Job email alerts (Ponuky na e-mail)

| Aspect | Location |
|--------|----------|
| **Purpose** | Users receive matching jobs by email on a schedule |
| **PWA** | `/ponuky-na-email/*`, profile hub rows, wizard components |
| **Backend** | [`job-alerts/`](../backend-ts/src/job-alerts/) |
| **Notifications** | [notifications.md](./notifications.md) |
| **Data** | `job_email_alerts`, `job_email_alert_sent_jobs` |

Wizard criteria include **Výhody** (`benefits` int[]; job must match all selected IDs). Shared picker: `AppIdLabelMultiCombobox`.

Public token routes for pause/unsubscribe: `public/job-alerts`.

## Chat and messaging

| Aspect | Location |
|--------|----------|
| **Purpose** | Employer–candidate messaging per application/room |
| **PWA** | `/chat`, `/chat/[roomId]`; legacy `/app/messages` → `/chat` |
| **Backend** | [`chat/`](../backend-ts/src/chat/) + Socket.IO |
| **Uploads** | Chat media via Nest — [uploads.md](./uploads.md) |
| **Data** | `chat_rooms`, `chat_messages` |

## In-app notifications

| Aspect | Location |
|--------|----------|
| **Purpose** | Bell feed for chat, applications, system events |
| **PWA** | `AppNotificationBell`, `/nastavenia/notifikacie` |
| **Backend** | [`notifications/`](../backend-ts/src/notifications/) |
| **Data** | `user_notifications`, `profiles.notification_preferences` |

## Public profiles and reviews

| Aspect | Location |
|--------|----------|
| **Purpose** | Shareable user/company profile; visitors leave one review per profile (1–5 stars, optional comment) |
| **PWA** | `/profil/[userId]` — `ProfileReviewForm` in `PublicProfileCard`; owner hub tab Recenzie is read-only (`ReviewsPanel`) |
| **Backend** | `GET/POST/PATCH/DELETE /api/profiles/:id/reviews`; `GET /api/profiles/:id` includes `viewer_review` when the caller already reviewed |
| **Data** | `profile_reviews` (service-role writes via Nest; unique per reviewer/reviewee) |
| **Rules** | Logged-in users only; not self; reviewee must have `public_profile_enabled`; mutations throttled |

## Settings and account

| Aspect | Location |
|--------|----------|
| **Purpose** | Profile, security, billing, privacy, devices, export/delete |
| **PWA** | `/nastavenia/*` (profil, bezpecnost, kredity, export-udajov, …) |
| **Backend** | [`profiles/`](../backend-ts/src/profiles/), billing, consent |
| **GDPR** | Export `GET /api/profiles/me/export`; delete `POST /api/profiles/me/delete` |

## Billing and plans

| Aspect | Location |
|--------|----------|
| **Purpose** | Buy credits, manage subscription, view usage |
| **PWA** | `/cennik` (public pricing + plans tab), `/app/buy-credits`, settings billing panels; `/app/plans` → 301 `/cennik?tab=plans` |
| **Backend** | [`billing/`](../backend-ts/src/billing/), [`payments/`](../backend-ts/src/payments/) |

## Saved searches and saved jobs

| Aspect | Location |
|--------|----------|
| **Purpose** | Persist filters; email when new matches (saved search alerts) |
| **Backend** | [`saved-searches/`](../backend-ts/src/saved-searches/), [`saved/`](../backend-ts/src/saved/) |
| **Cron** | `search-alerts` every 15 min |

## Newsletter

| Aspect | Location |
|--------|----------|
| **Purpose** | Marketing list signup |
| **PWA** | Home/marketing components |
| **Backend** | [`newsletter/`](../backend-ts/src/newsletter/) — `POST /api/subscribe` |
| **Data** | `subscribers` + MailerLite sync |

## Admin and moderation

| Aspect | Location |
|--------|----------|
| **Purpose** | Platform admin analytics, user enforcement, audit |
| **Desktop** | [`jobbie-admin/`](../jobbie-admin/) — Electron app (not in public PWA) |
| **Backend** | Local admin API in `jobbie-admin/api/`; main API keeps `POST /api/reports` only |
| **Security** | `AppRoleGuard`, `@RequireRecentLogin()` (Bearer JWT step-up on desktop API) |

## Dashboards (role-specific)

| Route | Middleware | Purpose |
|-------|------------|---------|
| `/dashboard/zakaznik` | `dashboard-zakaznik` | Customer dashboard |
| `/dashboard/profesional` | `dashboard-profesional` | Professional dashboard |
| **Backend** | `analytics.controller` | `/api/dashboard/*` |

## How to modify safely

1. New feature → add row to this doc, PWA route, Nest module, and GDPR impact if PII.
2. Public catalog fields → update `*_public` views and public mappers.
3. Employer-visible CV fields → follow [GDPR-PRIVACY.md](./GDPR-PRIVACY.md).
4. Update [changelog.md](./changelog.md).
