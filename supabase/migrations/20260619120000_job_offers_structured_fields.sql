-- Structured job post fields for filters, alerts, and public display.

alter table public.job_offers
  add column if not exists employment_types text[] not null default '{}'::text[],
  add column if not exists work_modes text[] not null default '{}'::text[],
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists show_exact_address boolean not null default false,
  add column if not exists salary_negotiable boolean not null default false,
  add column if not exists required_experience text,
  add column if not exists weekly_hours numeric,
  add column if not exists estimated_hours numeric,
  add column if not exists own_car_required boolean not null default false,
  add column if not exists application_method text,
  add column if not exists contact_person text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists show_phone_publicly boolean not null default false,
  add column if not exists application_url text,
  add column if not exists required_documents text[] not null default '{}'::text[],
  add column if not exists responsibilities text,
  add column if not exists requirements_text text,
  add column if not exists offer_text text,
  add column if not exists skill_tags text[] not null default '{}'::text[];

alter table public.job_offers
  drop constraint if exists job_offers_salary_type_check;

alter table public.job_offers
  add constraint job_offers_salary_type_check
  check (
    salary_type is null
    or salary_type in ('monthly', 'hourly', 'one_time', 'task_based', 'negotiable')
  );

alter table public.job_offers
  drop constraint if exists job_offers_required_experience_check;

alter table public.job_offers
  add constraint job_offers_required_experience_check
  check (
    required_experience is null
    or required_experience in ('any', 'none', 'lt1', 'y1_2', 'y3_5', 'y6_plus')
  );

alter table public.job_offers
  drop constraint if exists job_offers_application_method_check;

alter table public.job_offers
  add constraint job_offers_application_method_check
  check (
    application_method is null
    or application_method in ('platform', 'email', 'phone', 'external')
  );

alter table public.job_offers
  drop constraint if exists job_offers_employment_types_subset_check;

alter table public.job_offers
  add constraint job_offers_employment_types_subset_check
  check (
    cardinality(employment_types) = 0
    or employment_types <@ array[
      'full_time',
      'part_time',
      'brigada',
      'zivnost',
      'internship',
      'agreement',
      'student_agreement',
      'home_work',
      'volunteer',
      'one_off'
    ]::text[]
  );

alter table public.job_offers
  drop constraint if exists job_offers_work_modes_subset_check;

alter table public.job_offers
  add constraint job_offers_work_modes_subset_check
  check (
    cardinality(work_modes) = 0
    or work_modes <@ array['on_site', 'hybrid', 'remote']::text[]
  );

alter table public.job_offers
  drop constraint if exists job_offers_required_documents_subset_check;

alter table public.job_offers
  add constraint job_offers_required_documents_subset_check
  check (
    cardinality(required_documents) = 0
    or required_documents <@ array[
      'cv',
      'cover_letter',
      'portfolio',
      'certificate',
      'none'
    ]::text[]
  );

-- Backfill work_modes from legacy work_mode
update public.job_offers
set work_modes = array[work_mode]::text[]
where cardinality(work_modes) = 0
  and work_mode is not null
  and work_mode <> '';

-- Backfill city from location (first segment before comma)
update public.job_offers
set city = trim(split_part(location, ',', 1))
where city is null
  and location is not null
  and trim(location) <> '';

create index if not exists idx_job_offers_employment_types_gin
  on public.job_offers using gin (employment_types);

create index if not exists idx_job_offers_work_modes_gin
  on public.job_offers using gin (work_modes);

create index if not exists idx_job_offers_skill_tags_gin
  on public.job_offers using gin (skill_tags);

-- Extend job_email_alerts employment subset for one_off parity
alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_employment_subset_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_employment_subset_check
  check (
    cardinality(employment_types) = 0
    or employment_types <@ array[
      'full_time',
      'part_time',
      'brigada',
      'zivnost',
      'internship',
      'agreement',
      'student_agreement',
      'home_work',
      'volunteer',
      'one_off'
    ]::text[]
  );
