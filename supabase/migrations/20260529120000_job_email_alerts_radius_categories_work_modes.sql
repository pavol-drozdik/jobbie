-- Job email alerts: radius (metadata + matching hints), multi work mode, multi category.

alter table public.job_email_alerts
  add column if not exists radius_km int,
  add column if not exists work_modes text[] not null default '{}'::text[],
  add column if not exists categories text[] not null default '{}'::text[];

alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_radius_km_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_radius_km_check
  check (radius_km is null or radius_km in (0, 10, 25, 50, 100));

alter table public.job_email_alerts
  drop constraint if exists job_email_alerts_work_modes_subset_check;

alter table public.job_email_alerts
  add constraint job_email_alerts_work_modes_subset_check
  check (
    cardinality(work_modes) = 0
    or work_modes <@ array['on_site', 'hybrid', 'remote']::text[]
  );

comment on column public.job_email_alerts.radius_km is
  'Search radius from location: 0 exact city, 10/25/50/100 km, null = whole Slovakia (no location filter).';
comment on column public.job_email_alerts.work_modes is
  'Match jobs whose work_mode is any of these (OR). Empty = any.';
comment on column public.job_email_alerts.categories is
  'Match jobs in any of these categories (OR). Empty falls back to legacy category column.';

update public.job_email_alerts
set work_modes = array[work_mode]::text[]
where cardinality(work_modes) = 0
  and work_mode is not null
  and trim(work_mode) <> '';

update public.job_email_alerts
set categories = array[trim(category)]::text[]
where cardinality(categories) = 0
  and category is not null
  and trim(category) <> ''
  and trim(category) <> 'all';
