-- Monthly subscription credits per plan + idempotent grant ledger + default free subscription on signup.

alter table public.subscription_plans
  add column if not exists monthly_credits integer not null default 0;

comment on column public.subscription_plans.monthly_credits is
  'Credits granted each billing cycle (paid via Stripe invoice.paid) or monthly for free (cron).';

update public.subscription_plans set monthly_credits = 5 where slug = 'zadarmo';
update public.subscription_plans set monthly_credits = 10 where slug = 'basic';
update public.subscription_plans set monthly_credits = 20 where slug = 'standard';
update public.subscription_plans set monthly_credits = 45 where slug = 'premium';

create table if not exists public.subscription_period_credit_grants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  credits integer not null check (credits > 0),
  grant_source text not null check (grant_source in ('stripe_invoice', 'free_monthly_cron')),
  stripe_invoice_id text,
  period_yyyymm text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_subscription_credit_grants_stripe_invoice
  on public.subscription_period_credit_grants (stripe_invoice_id)
  where stripe_invoice_id is not null;

create unique index if not exists idx_subscription_credit_grants_free_month
  on public.subscription_period_credit_grants (user_id, period_yyyymm)
  where grant_source = 'free_monthly_cron';

create index if not exists idx_subscription_credit_grants_user_id
  on public.subscription_period_credit_grants (user_id);

comment on table public.subscription_period_credit_grants is
  'Idempotent log of monthly subscription credit grants (Stripe invoice id or calendar month for free).';

alter table public.subscription_period_credit_grants enable row level security;

grant select, insert on public.subscription_period_credit_grants to service_role;

-- Default free subscription for existing profiles missing a row.
insert into public.user_subscriptions (user_id, plan_id, status)
select p.id, sp.id, 'active'
from public.profiles p
cross join lateral (
  select id from public.subscription_plans where slug = 'zadarmo' limit 1
) sp
where not exists (
  select 1 from public.user_subscriptions us where us.user_id = p.id
);

-- Signup: attach zadarmo plan after profile insert.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  user_role text;
  meta jsonb;
  v_display_name text;
  v_company_name text;
  v_first_name text;
  v_last_name text;
  v_registered_office text;
  v_registration_number text;
  v_tax_id text;
  v_vat_id text;
  v_job_interests text;
  v_location text;
  v_sector text;
begin
  set local row_security = off;
  meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  user_role := coalesce(meta->>'role', 'individual');
  if user_role not in ('company', 'individual') then
    user_role := 'individual';
  end if;

  v_display_name := coalesce(
    meta->>'display_name',
    meta->>'name',
    trim(coalesce(meta->>'first_name', '') || ' ' || coalesce(meta->>'last_name', ''))
  );
  v_company_name := nullif(trim(meta->>'company_name'), '');
  v_first_name := nullif(trim(meta->>'first_name'), '');
  v_last_name := nullif(trim(meta->>'last_name'), '');
  v_registered_office := nullif(trim(meta->>'registered_office'), '');
  v_registration_number := nullif(trim(meta->>'ico'), '');
  v_tax_id := nullif(trim(meta->>'dic'), '');
  v_vat_id := nullif(trim(meta->>'ic_dph'), '');
  v_job_interests := nullif(trim(meta->>'job_interests'), '');
  v_location := nullif(trim(meta->>'location'), '');
  v_sector := nullif(trim(meta->>'sector'), '');

  insert into public.profiles (
    id,
    role,
    display_name,
    company_name,
    first_name,
    last_name,
    registered_office,
    registration_number,
    tax_id,
    vat_id,
    job_interests,
    location,
    sector
  )
  values (
    new.id,
    user_role,
    nullif(trim(v_display_name), ''),
    v_company_name,
    v_first_name,
    v_last_name,
    v_registered_office,
    v_registration_number,
    v_tax_id,
    v_vat_id,
    v_job_interests,
    v_location,
    v_sector
  )
  on conflict (id) do update set
    role = excluded.role,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    company_name = coalesce(excluded.company_name, profiles.company_name),
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    registered_office = coalesce(excluded.registered_office, profiles.registered_office),
    registration_number = coalesce(excluded.registration_number, profiles.registration_number),
    tax_id = coalesce(excluded.tax_id, profiles.tax_id),
    vat_id = coalesce(excluded.vat_id, profiles.vat_id),
    job_interests = coalesce(excluded.job_interests, profiles.job_interests),
    location = coalesce(excluded.location, profiles.location),
    sector = coalesce(excluded.sector, profiles.sector),
    updated_at = now();

  insert into public.user_subscriptions (user_id, plan_id, status)
  select new.id, p.id, 'active'
  from public.subscription_plans p
  where p.slug = 'zadarmo'
  limit 1
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer;
