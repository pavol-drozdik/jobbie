-- Worki-style fields on job_offers (job postings) and job_email_alerts (saved criteria).
-- Adds rich filterable attributes so email alerts can match on them end-to-end.

-- ---------------------------------------------------------------------------
-- 1. job_offers: new columns capturing rich job attributes
-- ---------------------------------------------------------------------------

alter table public.job_offers
  add column if not exists work_from_home boolean not null default false,
  add column if not exists salary_type text,
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric,
  add column if not exists education_levels int[] not null default '{}'::int[],
  add column if not exists benefits int[] not null default '{}'::int[],
  add column if not exists suitable_for int[] not null default '{}'::int[],
  add column if not exists driver_licenses int[] not null default '{}'::int[],
  add column if not exists work_shift_modes int[] not null default '{}'::int[],
  add column if not exists languages jsonb not null default '[]'::jsonb,
  add column if not exists pc_skills jsonb not null default '[]'::jsonb,
  add column if not exists start_type text,
  add column if not exists start_date date;

alter table public.job_offers
  drop constraint if exists job_offers_salary_type_check;

alter table public.job_offers
  add constraint job_offers_salary_type_check
  check (salary_type is null or salary_type in ('monthly', 'hourly'));

alter table public.job_offers
  drop constraint if exists job_offers_start_type_check;

alter table public.job_offers
  add constraint job_offers_start_type_check
  check (start_type is null or start_type in ('asap', 'by_agreement', 'date'));

comment on column public.job_offers.work_from_home is 'Position can be performed (partly) from home.';
comment on column public.job_offers.salary_type is 'Pay period of salary_min/salary_max: monthly or hourly.';
comment on column public.job_offers.salary_min is 'Minimum gross salary in salary_type units.';
comment on column public.job_offers.salary_max is 'Maximum gross salary in salary_type units.';
comment on column public.job_offers.education_levels is 'Required education levels (stable IDs 1-9 per app/utils/job-alert-options).';
comment on column public.job_offers.benefits is 'Offered benefits (stable IDs per app/utils/job-alert-options).';
comment on column public.job_offers.suitable_for is 'Groups the position is suitable for (stable IDs).';
comment on column public.job_offers.driver_licenses is 'Required driver license categories (stable IDs).';
comment on column public.job_offers.work_shift_modes is 'Work shift modes (one/two/three-shift, continuous, flexible, etc.).';
comment on column public.job_offers.languages is 'Required languages as [{language_id, level}].';
comment on column public.job_offers.pc_skills is 'Required digital skills as [{skill_id, level}].';
comment on column public.job_offers.start_type is 'Start: asap, by_agreement, or date (use start_date when date).';
comment on column public.job_offers.start_date is 'Concrete start date when start_type = date.';

create index if not exists idx_job_offers_work_from_home on public.job_offers (work_from_home) where work_from_home = true;
create index if not exists idx_job_offers_salary_type on public.job_offers (salary_type);
create index if not exists idx_job_offers_start_type on public.job_offers (start_type);
create index if not exists idx_job_offers_education_levels_gin on public.job_offers using gin (education_levels);
create index if not exists idx_job_offers_benefits_gin on public.job_offers using gin (benefits);
create index if not exists idx_job_offers_suitable_for_gin on public.job_offers using gin (suitable_for);
create index if not exists idx_job_offers_driver_licenses_gin on public.job_offers using gin (driver_licenses);
create index if not exists idx_job_offers_work_shift_modes_gin on public.job_offers using gin (work_shift_modes);

-- ---------------------------------------------------------------------------
-- 2. job_email_alerts: mirror criteria fields (all nullable / empty defaults)
-- ---------------------------------------------------------------------------

alter table public.job_email_alerts
  add column if not exists salary_type text,
  add column if not exists salary_max numeric,
  add column if not exists work_from_home boolean not null default false,
  add column if not exists education_levels int[] not null default '{}'::int[],
  add column if not exists benefits int[] not null default '{}'::int[],
  add column if not exists suitable_for int[] not null default '{}'::int[],
  add column if not exists driver_licenses int[] not null default '{}'::int[],
  add column if not exists work_shift_modes int[] not null default '{}'::int[],
  add column if not exists language_filters jsonb not null default '[]'::jsonb,
  add column if not exists pc_skill_filters jsonb not null default '[]'::jsonb,
  add column if not exists start_types text[] not null default '{}'::text[],
  add column if not exists start_date_from date,
  add column if not exists newsletter boolean not null default false;

alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_salary_type_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_salary_type_check
  check (salary_type is null or salary_type in ('monthly', 'hourly'));

alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_start_types_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_start_types_check
  check (
    cardinality(start_types) = 0
    or start_types <@ array['asap', 'by_agreement']::text[]
  );

-- Relax the employment_subset check to include the extended set used by the
-- new Worki-style alert form (parity with /app/add).
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
      'volunteer'
    ]::text[]
  );

comment on column public.job_email_alerts.salary_type is 'Pay period that salary_min/salary_max are expressed in.';
comment on column public.job_email_alerts.salary_max is 'Upper bound on salary (in salary_type units).';
comment on column public.job_email_alerts.work_from_home is 'Match only jobs that allow home office.';
comment on column public.job_email_alerts.education_levels is 'Match jobs whose required education_levels intersect with this set.';
comment on column public.job_email_alerts.benefits is 'Match jobs whose benefits include all of these.';
comment on column public.job_email_alerts.suitable_for is 'Match jobs whose suitable_for intersects with this set.';
comment on column public.job_email_alerts.driver_licenses is 'Match jobs requiring any of these driver license categories.';
comment on column public.job_email_alerts.work_shift_modes is 'Match jobs whose work_shift_modes intersects with this set.';
comment on column public.job_email_alerts.language_filters is 'Required languages with minimum level [{language_id, level}].';
comment on column public.job_email_alerts.pc_skill_filters is 'Required digital skills with minimum level [{skill_id, level}].';
comment on column public.job_email_alerts.start_types is 'Accepted job start types (asap / by_agreement).';
comment on column public.job_email_alerts.start_date_from is 'Earliest acceptable concrete start date.';
comment on column public.job_email_alerts.newsletter is 'Subscribe to marketing newsletter alongside alert emails.';
