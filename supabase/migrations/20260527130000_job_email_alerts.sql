-- Job email alerts: per-user saved criteria + sent job dedupe for digest emails.

alter table public.job_offers
  add column if not exists work_mode text;

update public.job_offers
set work_mode = 'on_site'
where work_mode is null;

alter table public.job_offers
  alter column work_mode set default 'on_site';

alter table public.job_offers
  alter column work_mode set not null;

alter table public.job_offers
  drop constraint if exists job_offers_work_mode_check;

alter table public.job_offers
  add constraint job_offers_work_mode_check
  check (work_mode in ('on_site', 'hybrid', 'remote'));

comment on column public.job_offers.work_mode is 'Work arrangement: on_site, hybrid, remote.';

create table if not exists public.job_email_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  keywords text not null default '',
  location text not null default '',
  category text,
  employment_types text[] not null default '{}'::text[],
  salary_min numeric,
  work_mode text,
  frequency text not null,
  is_active boolean not null default true,
  criteria_hash text not null,
  last_dispatch_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_email_alerts_frequency_check
    check (frequency in ('daily', 'weekly', 'immediate')),
  constraint job_email_alerts_work_mode_check
    check (work_mode is null or work_mode in ('on_site', 'hybrid', 'remote')),
  constraint job_email_alerts_employment_subset_check
    check (
      cardinality(employment_types) = 0
      or employment_types <@ array[
        'full_time',
        'part_time',
        'brigada',
        'zivnost',
        'internship'
      ]::text[]
    ),
  unique (user_id, criteria_hash)
);

create index if not exists idx_job_email_alerts_user_id on public.job_email_alerts (user_id);
create index if not exists idx_job_email_alerts_user_active on public.job_email_alerts (user_id, is_active)
  where is_active = true;

drop trigger if exists job_email_alerts_updated_at on public.job_email_alerts;

create trigger job_email_alerts_updated_at
  before update on public.job_email_alerts
  for each row execute function public.set_updated_at();

create table if not exists public.job_email_alert_sent_jobs (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.job_email_alerts (id) on delete cascade,
  job_id uuid not null references public.job_offers (id) on delete cascade,
  sent_at timestamptz not null default now(),
  unique (alert_id, job_id)
);

create index if not exists idx_job_email_alert_sent_jobs_alert on public.job_email_alert_sent_jobs (alert_id, sent_at desc);

alter table public.job_email_alerts enable row level security;
alter table public.job_email_alert_sent_jobs enable row level security;

drop policy if exists "Users manage own job email alerts" on public.job_email_alerts;

create policy "Users manage own job email alerts"
  on public.job_email_alerts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage sent jobs for own alerts" on public.job_email_alert_sent_jobs;

create policy "Users manage sent jobs for own alerts"
  on public.job_email_alert_sent_jobs
  for all
  using (
    exists (
      select 1
      from public.job_email_alerts a
      where a.id = alert_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.job_email_alerts a
      where a.id = alert_id and a.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.job_email_alerts to anon, authenticated, service_role;
grant select, insert, update, delete on public.job_email_alert_sent_jobs to anon, authenticated, service_role;

comment on table public.job_email_alerts is 'User-defined job alert criteria; backend dispatches emails and records sent jobs.';
comment on table public.job_email_alert_sent_jobs is 'Dedupe: which job_ids were emailed for which alert.';
