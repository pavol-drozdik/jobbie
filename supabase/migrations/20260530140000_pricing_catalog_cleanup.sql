-- Pricing catalog cleanup: deactivate agentura tiers, CV DB monthly quotas, usage tracking.

-- ---------------------------------------------------------------------------
-- credit_packs: hide agentura pack
-- ---------------------------------------------------------------------------
update public.credit_packs
set active = false, updated_at = now()
where slug = 'agentura';

-- ---------------------------------------------------------------------------
-- subscription_plans: public catalog flag + CV monthly limits
-- ---------------------------------------------------------------------------
alter table public.subscription_plans
  add column if not exists active boolean not null default true;

alter table public.subscription_plans
  add column if not exists max_cv_unlocks_monthly integer;

alter table public.subscription_plans
  add column if not exists max_cv_contacts_monthly integer;

alter table public.subscription_plans
  add column if not exists max_cv_pdf_downloads_monthly integer;

comment on column public.subscription_plans.active is
  'When false, plan is hidden from public pricing/checkout (existing subscribers may retain plan_id).';

comment on column public.subscription_plans.max_cv_unlocks_monthly is
  'Included unlocks per calendar month on free tier; NULL = unlimited included (paid plans).';

update public.subscription_plans set
  active = false,
  updated_at = now()
where slug = 'agentura';

update public.subscription_plans set
  max_cv_unlocks_monthly = 10,
  max_cv_contacts_monthly = 5,
  max_cv_pdf_downloads_monthly = 5
where slug = 'zadarmo';

update public.subscription_plans set
  max_cv_unlocks_monthly = null,
  max_cv_contacts_monthly = null,
  max_cv_pdf_downloads_monthly = null
where slug in ('start', 'plus', 'pro');

-- ---------------------------------------------------------------------------
-- employer_cv_monthly_usage (service_role only)
-- ---------------------------------------------------------------------------
create table if not exists public.employer_cv_monthly_usage (
  company_id uuid not null references public.profiles (id) on delete cascade,
  period_month date not null,
  unlocks_count integer not null default 0 check (unlocks_count >= 0),
  contacts_count integer not null default 0 check (contacts_count >= 0),
  pdf_downloads_count integer not null default 0 check (pdf_downloads_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (company_id, period_month)
);

create index if not exists idx_employer_cv_monthly_usage_period
  on public.employer_cv_monthly_usage (period_month);

drop trigger if exists employer_cv_monthly_usage_updated_at on public.employer_cv_monthly_usage;
create trigger employer_cv_monthly_usage_updated_at
  before update on public.employer_cv_monthly_usage
  for each row execute function public.set_updated_at();

alter table public.employer_cv_monthly_usage enable row level security;

drop policy if exists "deny all employer_cv_monthly_usage" on public.employer_cv_monthly_usage;
create policy "deny all employer_cv_monthly_usage"
  on public.employer_cv_monthly_usage for all using (false) with check (false);

revoke all on public.employer_cv_monthly_usage from anon, authenticated;
grant select, insert, update, delete on public.employer_cv_monthly_usage to service_role;
