-- GDPR / privacy defense-in-depth: CV contact column grants, consent audit, public catalog address redaction.

-- ---------------------------------------------------------------------------
-- profiles.deleted_at + is_deleted retention comment
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists deleted_at timestamptz;

comment on column public.profiles.is_deleted is
  'Soft-delete flag: profile PII scrubbed, auth user banned, job offers deactivated. CV rows remain for FK integrity but must be hidden from employer discovery (visible_to_employers=false). Hard auth.users delete is optional and separate.';
comment on column public.profiles.deleted_at is
  'Timestamp when account closure completed (GDPR erasure request tracking).';

-- ---------------------------------------------------------------------------
-- Employer CV discovery index
-- ---------------------------------------------------------------------------
create index if not exists idx_cvs_employer_visible_user
  on public.cvs (visible_to_employers, user_id)
  where visible_to_employers = true;

-- ---------------------------------------------------------------------------
-- Unlock helper (used by Nest; documents unlock semantics in DB)
-- ---------------------------------------------------------------------------
create or replace function public.employer_has_cv_contact_unlock(
  p_company_id uuid,
  p_cv_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cv_contact_unlocks u
    where u.company_id = p_company_id
      and u.cv_id = p_cv_id
  );
$$;

comment on function public.employer_has_cv_contact_unlock(uuid, uuid) is
  'True when company paid to unlock CV contact. Nest API enforces unlock before returning email/phone; direct PostgREST cannot read contact columns (column grants).';

revoke all on function public.employer_has_cv_contact_unlock(uuid, uuid) from public;
grant execute on function public.employer_has_cv_contact_unlock(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- cv_personal_info: column-level revoke for contact / special-category fields
-- Owners and employers reach contact only via Nest (service_role).
-- ---------------------------------------------------------------------------
revoke select (
  email,
  phone,
  linkedin_url,
  birth_date,
  birth_day,
  birth_month,
  birth_year,
  gender,
  address_street,
  address_postal_code
) on public.cv_personal_info from anon, authenticated;

-- Replace employer read policy (row visibility only; sensitive cols revoked above)
drop policy if exists "Owner or employer can read cv_personal_info" on public.cv_personal_info;

create policy "Owner can read own cv_personal_info"
  on public.cv_personal_info for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_personal_info.cv_id
        and c.user_id = auth.uid()
    )
  );

create policy "Employer can read visible cv_personal_info browse columns"
  on public.cv_personal_info for select
  using (
    exists (
      select 1 from public.cvs c
      where c.id = cv_personal_info.cv_id
        and c.visible_to_employers = true
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.is_deleted = false
            and (
              p.customer_role = true
              or p.provider_role = true
              or p.role = 'company'
            )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- consent_events (GDPR accountability; service_role writes only)
-- ---------------------------------------------------------------------------
create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_type text not null,
  granted boolean not null,
  source text,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_consent_events_user_recorded
  on public.consent_events (user_id, recorded_at desc);

comment on table public.consent_events is
  'Append-only consent grant/withdrawal log. Inserts via Nest service_role only.';

alter table public.consent_events enable row level security;

create policy "Users read own consent_events"
  on public.consent_events for select
  using (auth.uid() = user_id);

create policy "deny consent_events mutations for clients"
  on public.consent_events for all
  using (false)
  with check (false);

grant select on public.consent_events to authenticated;
grant select, insert on public.consent_events to service_role;

revoke insert, update, delete on public.consent_events from anon;
revoke insert, update, delete on public.consent_events from authenticated;

-- ---------------------------------------------------------------------------
-- Public catalog views: redact exact address when show_exact_address is false
-- ---------------------------------------------------------------------------
create or replace view public.job_offers_public
with (security_invoker = true)
as
select
  id,
  company_id,
  title,
  description,
  location,
  case when show_exact_address then location_address else null end as location_address,
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
  case when show_exact_address then street_address else null end as street_address,
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
