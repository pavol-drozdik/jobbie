-- Address and sensitive CV column revokes (GDPR follow-up to
-- 20260622120000_gdpr_privacy_enforcement.sql).
--
-- The 2026-06-22 GDPR migration introduced the public views
-- `job_offers_public` and `company_ads_public` that null the exact address
-- when `show_exact_address` is false, but it did NOT revoke SELECT on the
-- underlying address columns from `authenticated`. Any authenticated user
-- could still bypass the public view via direct PostgREST or the
-- `search_jobs_hybrid` RPC and read exact addresses.
--
-- Similarly, `cv_job_preferences.has_disability` and `cv_references.email`
-- / `cv_references.phone` remained readable by employer-role users via
-- PostgREST without a `cv_contact_unlocks` row.
--
-- This migration forces every read of these sensitive columns to go through
-- Nest (which uses `service_role` and applies the unlock / address-visibility
-- rules).

-- ---------------------------------------------------------------------------
-- Exact addresses: revoke base-table SELECT; clients must use *_public views
-- ---------------------------------------------------------------------------
revoke select (location_address)
  on public.job_offers from anon, authenticated;

revoke select (street_address)
  on public.company_ads from anon, authenticated;

comment on column public.job_offers.location_address is
  'Exact street address. Redacted by job_offers_public view when '
  'show_exact_address = false. Not readable by anon/authenticated directly.';

comment on column public.company_ads.street_address is
  'Exact street address. Redacted by company_ads_public view when '
  'show_exact_address = false. Not readable by anon/authenticated directly.';

-- ---------------------------------------------------------------------------
-- search_jobs_hybrid: restrict execute to service_role only.
--
-- PWA never calls this RPC directly (search goes through Nest at
-- `/api/search/jobs`, which holds the service-role key). Keeping anon/auth
-- execute means an attacker could call the RPC from the browser to bypass
-- address redaction (since the function returns setof job_offers including
-- location_address as a raw column).
-- ---------------------------------------------------------------------------
revoke execute on function public.search_jobs_hybrid(
  text,
  text,
  text,
  text,
  boolean,
  int,
  int,
  numeric,
  numeric,
  timestamptz,
  text,
  boolean
) from anon, authenticated;

-- ---------------------------------------------------------------------------
-- cv_job_preferences.has_disability: sensitive special-category data (GDPR
-- art. 9). Only employer unlocks should expose it; revoke from anon/auth.
-- ---------------------------------------------------------------------------
revoke select (has_disability)
  on public.cv_job_preferences from anon, authenticated;

comment on column public.cv_job_preferences.has_disability is
  'GDPR special-category data. Read via Nest only (service_role) and only '
  'when the employer has a cv_contact_unlocks row for the CV. Direct '
  'PostgREST SELECT denied for anon/authenticated.';

-- ---------------------------------------------------------------------------
-- cv_references.email / phone: third-party PII; must be gated by unlock.
-- ---------------------------------------------------------------------------
revoke select (email, phone)
  on public.cv_references from anon, authenticated;

comment on column public.cv_references.email is
  'Reference contact email (third-party PII). Read via Nest only after '
  'cv_contact_unlocks. Direct PostgREST SELECT denied for anon/authenticated.';

comment on column public.cv_references.phone is
  'Reference contact phone (third-party PII). Read via Nest only after '
  'cv_contact_unlocks. Direct PostgREST SELECT denied for anon/authenticated.';
