-- Public catalog: safe views + restrict direct reads of contact/tax columns via anon.
-- Nest API remains primary; this blocks PostgREST anon scraping of sensitive fields.

-- Job offers: public browse (no employer/contact email/phone)
create or replace view public.job_offers_public
with (security_invoker = true)
as
select
  id,
  company_id,
  title,
  description,
  location,
  location_address,
  location_lat,
  location_lng,
  contract_type,
  requirements,
  salary,
  job_type,
  work_mode,
  expires_at,
  is_draft,
  is_active,
  is_deleted,
  created_at,
  updated_at,
  category,
  is_urgent,
  is_featured,
  compensation_type,
  compensation_amount,
  workers_needed,
  application_deadline,
  completion_deadline,
  employer_name,
  photos,
  applications_count,
  work_from_home,
  salary_type,
  salary_min,
  salary_max,
  education_levels,
  benefits,
  suitable_for,
  driver_licenses,
  work_shift_modes,
  languages,
  pc_skills,
  start_type,
  start_date,
  employment_types,
  work_modes,
  city,
  postal_code,
  show_exact_address,
  salary_negotiable,
  required_experience,
  weekly_hours,
  estimated_hours,
  own_car_required,
  application_method,
  contact_person,
  show_phone_publicly,
  application_url,
  required_documents,
  responsibilities,
  requirements_text,
  offer_text,
  skill_tags
from public.job_offers
where is_active = true
  and is_deleted = false
  and (is_draft is not true);

comment on view public.job_offers_public is
  'Active public job catalog without employer_email, contact_email, or contact_phone.';

-- Company ads: public browse (no contact/tax identifiers)
create or replace view public.company_ads_public
with (security_invoker = true)
as
select
  id,
  owner_id,
  thumbnail_url,
  title,
  body,
  category,
  status,
  starts_at,
  ends_at,
  created_at,
  updated_at,
  profile_type,
  tagline,
  region,
  city,
  street_address,
  postal_code,
  show_exact_address,
  price_type,
  price_min,
  price_max,
  price_negotiable,
  price_note,
  availability,
  works_weekends,
  evening_hours,
  emergency_service,
  contact_person,
  website,
  preferred_contact_method,
  show_phone_publicly,
  show_email_publicly,
  founded_year,
  employee_count,
  duration_months,
  services,
  specializations,
  certifications,
  service_areas,
  custom_service_areas,
  gallery_items
from public.company_ads
where status = 'active'
  and ends_at is not null
  and ends_at > now();

comment on view public.company_ads_public is
  'Active company ads without contact_email, contact_phone, ico, dic, or ic_dph.';

-- Anon: read only via safe views (not base tables)
revoke select on public.job_offers from anon;
revoke select on public.company_ads from anon;
grant select on public.job_offers_public to anon;
grant select on public.company_ads_public to anon;

-- Authenticated: hide sensitive columns on base tables (owners use Nest API for full rows)
revoke select (employer_email, contact_email, contact_phone) on public.job_offers from authenticated;
revoke select (contact_email, contact_phone, ico, dic, ic_dph) on public.company_ads from authenticated;
grant select on public.job_offers_public to authenticated;
grant select on public.company_ads_public to authenticated;
