-- Paid TOP listing via credits (not subscription plan). Allow 0-credit tier promos.

alter table public.job_promotions
  drop constraint if exists job_promotions_credits_spent_check;

alter table public.job_promotions
  add constraint job_promotions_credits_spent_check check (credits_spent >= 0);

create table if not exists public.company_ad_promotions (
  id uuid primary key default gen_random_uuid(),
  company_ad_id uuid not null references public.company_ads (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('top_category')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  credits_spent integer not null check (credits_spent >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_company_ad_promotions_ad_kind
  on public.company_ad_promotions (company_ad_id, kind, ends_at desc);

alter table public.company_ad_promotions enable row level security;

drop policy if exists "deny all company_ad_promotions" on public.company_ad_promotions;

create policy "deny all company_ad_promotions"
  on public.company_ad_promotions for all using (false) with check (false);

grant select, insert on public.company_ad_promotions to service_role;
