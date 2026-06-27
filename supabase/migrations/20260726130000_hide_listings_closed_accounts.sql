-- Hide job offers and company ads from public catalogs when the owner account was closed.

-- Backfill: deactivate jobs still marked active for deleted employers.
update public.job_offers jo
set
  is_active = false,
  employer_name = coalesce(
    nullif(trim(jo.employer_name), ''),
    'Zamestnávateľ — účet ukončený'
  ),
  updated_at = now()
from public.profiles p
where jo.company_id = p.id
  and p.is_deleted = true
  and jo.is_deleted = false
  and jo.is_active = true;

-- Backfill: archive active company ads for deleted owners.
update public.company_ads ca
set status = 'archived', updated_at = now()
from public.profiles p
where ca.owner_id = p.id
  and p.is_deleted = true
  and ca.status = 'active';

-- Public job catalog: exclude listings from closed employer accounts.
create or replace view public.job_offers_public
with (security_invoker = true)
as
select
  jo.id,
  jo.company_id,
  jo.title,
  jo.description,
  jo.location,
  jo.location_address,
  jo.location_lat,
  jo.location_lng,
  jo.contract_type,
  jo.requirements,
  jo.salary,
  jo.job_type,
  jo.work_mode,
  jo.expires_at,
  jo.is_draft,
  jo.is_active,
  jo.is_deleted,
  jo.created_at,
  jo.updated_at,
  jo.category,
  jo.is_urgent,
  jo.is_featured,
  jo.compensation_type,
  jo.compensation_amount,
  jo.workers_needed,
  jo.application_deadline,
  jo.completion_deadline,
  jo.employer_name,
  jo.photos,
  jo.applications_count,
  jo.work_from_home,
  jo.salary_type,
  jo.salary_min,
  jo.salary_max,
  jo.education_levels,
  jo.benefits,
  jo.suitable_for,
  jo.driver_licenses,
  jo.work_shift_modes,
  jo.languages,
  jo.pc_skills,
  jo.start_type,
  jo.start_date,
  jo.employment_types,
  jo.work_modes,
  jo.city,
  jo.postal_code,
  jo.show_exact_address,
  jo.salary_negotiable,
  jo.required_experience,
  jo.weekly_hours,
  jo.estimated_hours,
  jo.own_car_required,
  jo.application_method,
  jo.contact_person,
  jo.show_phone_publicly,
  jo.application_url,
  jo.required_documents,
  jo.responsibilities,
  jo.requirements_text,
  jo.offer_text,
  jo.skill_tags
from public.job_offers jo
inner join public.profiles p on p.id = jo.company_id and p.is_deleted = false
where jo.is_active = true
  and jo.is_deleted = false
  and (jo.is_draft is not true);

comment on view public.job_offers_public is
  'Active public job catalog without employer_email/contact fields; excludes closed employer accounts.';

-- Public company ads: exclude ads from closed owner accounts.
create or replace view public.company_ads_public
with (security_invoker = true)
as
select
  ca.id,
  ca.owner_id,
  ca.thumbnail_url,
  ca.title,
  ca.body,
  ca.category,
  ca.status,
  ca.starts_at,
  ca.ends_at,
  ca.created_at,
  ca.updated_at,
  ca.profile_type,
  ca.tagline,
  ca.region,
  ca.city,
  ca.street_address,
  ca.postal_code,
  ca.show_exact_address,
  ca.price_type,
  ca.price_min,
  ca.price_max,
  ca.price_negotiable,
  ca.price_note,
  ca.availability,
  ca.works_weekends,
  ca.evening_hours,
  ca.emergency_service,
  ca.contact_person,
  ca.website,
  ca.preferred_contact_method,
  ca.show_phone_publicly,
  ca.show_email_publicly,
  ca.founded_year,
  ca.employee_count,
  ca.duration_months,
  ca.services,
  ca.specializations,
  ca.certifications,
  ca.service_areas,
  ca.custom_service_areas,
  ca.gallery_items
from public.company_ads ca
inner join public.profiles p on p.id = ca.owner_id and p.is_deleted = false
where ca.status = 'active'
  and ca.ends_at is not null
  and ca.ends_at > now();

comment on view public.company_ads_public is
  'Active company ads without contact/tax identifiers; excludes closed owner accounts.';
