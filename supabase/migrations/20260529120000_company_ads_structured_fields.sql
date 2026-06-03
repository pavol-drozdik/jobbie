-- Structured fields for company/service ads (Firmy builder upgrade).

-- Drop old status check and replace with expanded lifecycle.
alter table public.company_ads
  drop constraint if exists company_ads_status_check;

alter table public.company_ads
  add column if not exists profile_type text not null default 'company',
  add column if not exists tagline text,
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists street_address text,
  add column if not exists postal_code text,
  add column if not exists show_exact_address boolean not null default false,
  add column if not exists price_type text default 'negotiable',
  add column if not exists price_min numeric,
  add column if not exists price_max numeric,
  add column if not exists price_negotiable boolean not null default false,
  add column if not exists price_note text,
  add column if not exists availability text,
  add column if not exists works_weekends boolean not null default false,
  add column if not exists evening_hours boolean not null default false,
  add column if not exists emergency_service boolean not null default false,
  add column if not exists contact_person text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists website text,
  add column if not exists preferred_contact_method text not null default 'platform',
  add column if not exists show_phone_publicly boolean not null default false,
  add column if not exists show_email_publicly boolean not null default false,
  add column if not exists ico text,
  add column if not exists dic text,
  add column if not exists ic_dph text,
  add column if not exists founded_year int,
  add column if not exists employee_count text,
  add column if not exists duration_months int,
  add column if not exists services text[] not null default '{}'::text[],
  add column if not exists specializations text[] not null default '{}'::text[],
  add column if not exists certifications text[] not null default '{}'::text[],
  add column if not exists service_areas text[] not null default '{}'::text[],
  add column if not exists custom_service_areas text[] not null default '{}'::text[],
  add column if not exists gallery_items jsonb not null default '[]'::jsonb;

alter table public.company_ads
  add constraint company_ads_status_check
  check (status in ('draft', 'active', 'paused', 'archived', 'expired'));

alter table public.company_ads
  drop constraint if exists company_ads_profile_type_check;

alter table public.company_ads
  add constraint company_ads_profile_type_check
  check (profile_type in ('company', 'sole_trader', 'freelancer'));

alter table public.company_ads
  drop constraint if exists company_ads_price_type_check;

alter table public.company_ads
  add constraint company_ads_price_type_check
  check (
    price_type is null
    or price_type in ('hourly', 'per_sqm', 'per_project', 'per_unit', 'negotiable', 'hidden')
  );

alter table public.company_ads
  drop constraint if exists company_ads_availability_check;

alter table public.company_ads
  add constraint company_ads_availability_check
  check (
    availability is null
    or availability in ('immediate', '7d', '14d', '30d', 'by_agreement', 'busy')
  );

alter table public.company_ads
  drop constraint if exists company_ads_preferred_contact_method_check;

alter table public.company_ads
  add constraint company_ads_preferred_contact_method_check
  check (
    preferred_contact_method in ('platform', 'phone', 'email', 'website')
  );

alter table public.company_ads
  drop constraint if exists company_ads_employee_count_check;

alter table public.company_ads
  add constraint company_ads_employee_count_check
  check (
    employee_count is null
    or employee_count in ('1', '2-5', '6-10', '11-50', '51-200', '200+')
  );

alter table public.company_ads
  drop constraint if exists company_ads_title_length_check;

alter table public.company_ads
  add constraint company_ads_title_length_check
  check (char_length(title) <= 120);

comment on column public.company_ads.profile_type is 'company | sole_trader | freelancer';
comment on column public.company_ads.services is 'Offered services (tags) for search and cards.';
comment on column public.company_ads.service_areas is 'local_city | region | slovakia | online | custom';
comment on column public.company_ads.gallery_items is 'Portfolio images: [{url, caption?}].';

create index if not exists idx_company_ads_region on public.company_ads (region);
create index if not exists idx_company_ads_city on public.company_ads (city);
create index if not exists idx_company_ads_price_type on public.company_ads (price_type);
create index if not exists idx_company_ads_availability on public.company_ads (availability);
create index if not exists idx_company_ads_profile_type on public.company_ads (profile_type);
create index if not exists idx_company_ads_services_gin on public.company_ads using gin (services);
create index if not exists idx_company_ads_service_areas_gin on public.company_ads using gin (service_areas);
