-- Cenník: credit packs, plan updates, credit lots, ledger extensions, unlocks, promotions, banners.

-- ---------------------------------------------------------------------------
-- credit_packs (referenced by Nest StripeService)
-- Table may already exist from an older/partial schema without slug — align columns.
-- ---------------------------------------------------------------------------
create table if not exists public.credit_packs (
  id uuid primary key default gen_random_uuid()
);

alter table public.credit_packs add column if not exists slug text;
alter table public.credit_packs add column if not exists name text;
alter table public.credit_packs add column if not exists name_sk text;
alter table public.credit_packs add column if not exists credits integer;
alter table public.credit_packs add column if not exists unit_amount integer;
alter table public.credit_packs add column if not exists currency text default 'eur';
alter table public.credit_packs add column if not exists stripe_price_id text;
alter table public.credit_packs add column if not exists badge text;
alter table public.credit_packs add column if not exists sort_order integer default 0;
alter table public.credit_packs add column if not exists active boolean default true;
alter table public.credit_packs add column if not exists created_at timestamptz default now();
alter table public.credit_packs add column if not exists updated_at timestamptz default now();

-- Legacy table may require stripe_price_id; fill Stripe Price IDs after dashboard setup.
alter table public.credit_packs alter column stripe_price_id drop not null;

-- Legacy column "name" (predates name_sk).
alter table public.credit_packs alter column name drop not null;

-- Legacy rows without slug cannot be upserted; remove before seeding.
delete from public.credit_packs where slug is null;

create unique index if not exists idx_credit_packs_slug on public.credit_packs (slug);

drop trigger if exists credit_packs_updated_at on public.credit_packs;
create trigger credit_packs_updated_at
  before update on public.credit_packs
  for each row execute function public.set_updated_at();

alter table public.credit_packs enable row level security;

drop policy if exists "Anyone can read active credit_packs" on public.credit_packs;
create policy "Anyone can read active credit_packs"
  on public.credit_packs for select using (active = true);

grant select on public.credit_packs to anon, authenticated, service_role;
grant insert, update, delete on public.credit_packs to service_role;

insert into public.credit_packs (slug, name, name_sk, credits, unit_amount, currency, badge, sort_order, active)
values
  ('starter', 'Starter', 'Starter', 5, 500, 'eur', null, 0, true),
  ('popular', 'Najpopulárnejšie', 'Najpopulárnejšie', 12, 1000, 'eur', 'popular', 1, true),
  ('value', 'Výhodné', 'Výhodné', 30, 2000, 'eur', 'value', 2, true),
  ('firmy', 'Pre firmy', 'Pre firmy', 75, 4500, 'eur', null, 3, true),
  ('agentura', 'Agentúra', 'Agentúra', 150, 8000, 'eur', null, 4, true)
on conflict (slug) do update set
  name = excluded.name,
  name_sk = excluded.name_sk,
  credits = excluded.credits,
  unit_amount = excluded.unit_amount,
  badge = excluded.badge,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();

update public.credit_packs
set active = false, updated_at = now()
where slug = 'agentura';

-- ---------------------------------------------------------------------------
-- subscription_plans: rename slugs + new limits (preserve stripe_price_id)
-- ---------------------------------------------------------------------------
update public.subscription_plans set slug = 'start' where slug = 'basic';
update public.subscription_plans set slug = 'plus' where slug = 'standard';
update public.subscription_plans set slug = 'pro' where slug = 'premium';

update public.subscription_plans set
  name_sk = 'Zadarmo',
  price_monthly_cents = 0,
  monthly_credits = 2,
  max_active_jobs = 1,
  sort_order = 0
where slug = 'zadarmo';

update public.subscription_plans set
  name_sk = 'Štart',
  price_monthly_cents = 499,
  monthly_credits = 10,
  max_active_jobs = 3,
  sort_order = 1
where slug = 'start';

update public.subscription_plans set
  name_sk = 'Plus',
  price_monthly_cents = 999,
  monthly_credits = 25,
  max_active_jobs = 6,
  sort_order = 2
where slug = 'plus';

update public.subscription_plans set
  name_sk = 'Pro',
  price_monthly_cents = 1999,
  monthly_credits = 60,
  max_active_jobs = 15,
  sort_order = 3
where slug = 'pro';

insert into public.subscription_plans (slug, name_sk, price_monthly_cents, max_active_jobs, monthly_credits, sort_order)
values ('agentura', 'Agentúra', 3999, 40, 150, 4)
on conflict (slug) do update set
  name_sk = excluded.name_sk,
  price_monthly_cents = excluded.price_monthly_cents,
  max_active_jobs = excluded.max_active_jobs,
  monthly_credits = excluded.monthly_credits,
  sort_order = excluded.sort_order;

update public.subscription_plans
set active = false, updated_at = now()
where slug = 'agentura';

update public.subscription_plans set
  max_cv_unlocks_monthly = null,
  max_cv_contacts_monthly = null,
  max_cv_pdf_downloads_monthly = null
where slug in ('start', 'plus', 'pro');

-- ---------------------------------------------------------------------------
-- credit_lots (FIFO spend + expiration)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_remaining integer not null check (amount_remaining >= 0),
  amount_initial integer not null check (amount_initial > 0),
  source text not null check (source in ('purchase', 'subscription_grant', 'free_grant', 'adjustment')),
  expires_at timestamptz,
  grant_period text,
  stripe_invoice_id text,
  payment_intent_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_lots_user_expires
  on public.credit_lots (user_id, expires_at nulls last, created_at);

alter table public.credit_lots enable row level security;
create policy "deny all credit_lots" on public.credit_lots for all using (false) with check (false);
grant select, insert, update, delete on public.credit_lots to service_role;

-- ---------------------------------------------------------------------------
-- credit_ledger extensions
-- ---------------------------------------------------------------------------
alter table public.credit_ledger
  add column if not exists lot_id uuid references public.credit_lots (id) on delete set null;

alter table public.credit_ledger
  add column if not exists transaction_type text;

update public.credit_ledger
set transaction_type = case
  when delta > 0 and reason like '%purchase%' then 'purchase'
  when delta > 0 and reason like '%grant%' then 'subscription_grant'
  when delta < 0 then 'spend'
  else 'adjustment'
end
where transaction_type is null;

-- ---------------------------------------------------------------------------
-- cv_contact_unlocks
-- ---------------------------------------------------------------------------
create table if not exists public.cv_contact_unlocks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.profiles (id) on delete cascade,
  cv_id uuid not null,
  unlocked_at timestamptz not null default now(),
  contacted_at timestamptz,
  unique (company_id, cv_id)
);

create index if not exists idx_cv_contact_unlocks_company on public.cv_contact_unlocks (company_id);

alter table public.cv_contact_unlocks enable row level security;
create policy "deny all cv_contact_unlocks" on public.cv_contact_unlocks for all using (false) with check (false);
grant select, insert, update on public.cv_contact_unlocks to service_role;

-- ---------------------------------------------------------------------------
-- job_promotions
-- ---------------------------------------------------------------------------
create table if not exists public.job_promotions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_offers (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'urgent_badge', 'highlighted_card', 'top_category', 'homepage_featured'
  )),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  credits_spent integer not null check (credits_spent > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_job_promotions_job_kind on public.job_promotions (job_id, kind, ends_at desc);

alter table public.job_promotions enable row level security;
create policy "deny all job_promotions" on public.job_promotions for all using (false) with check (false);
grant select, insert on public.job_promotions to service_role;

-- ---------------------------------------------------------------------------
-- banner_ads (stub)
-- ---------------------------------------------------------------------------
create table if not exists public.banner_ads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  image_url text,
  target_url text,
  placement text not null check (placement in (
    'homepage_large', 'job_list', 'category_page', 'service_directory', 'email'
  )),
  status text not null default 'draft' check (status in (
    'draft', 'pending_review', 'active', 'rejected', 'expired'
  )),
  starts_at timestamptz,
  ends_at timestamptz,
  credits_cost integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger banner_ads_updated_at
  before update on public.banner_ads
  for each row execute function public.set_updated_at();

alter table public.banner_ads enable row level security;
create policy "deny all banner_ads" on public.banner_ads for all using (false) with check (false);
grant select, insert, update on public.banner_ads to service_role;

-- ---------------------------------------------------------------------------
-- Migrate existing profile balances into purchase lots (one-time)
-- ---------------------------------------------------------------------------
insert into public.credit_lots (user_id, amount_remaining, amount_initial, source, expires_at)
select p.id, p.credits, p.credits, 'purchase', null
from public.profiles p
where p.credits > 0
  and not exists (
    select 1 from public.credit_lots cl
    where cl.user_id = p.id and cl.source = 'purchase'
  );

-- ---------------------------------------------------------------------------
-- RPC: spend_credits (FIFO by expires_at nulls last, then created_at)
-- ---------------------------------------------------------------------------
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_audit_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer := p_amount;
  v_lot record;
  v_take integer;
  v_balance integer;
  v_ledger_id uuid;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  for v_lot in
    select id, amount_remaining
    from credit_lots
    where user_id = p_user_id
      and amount_remaining > 0
      and (expires_at is null or expires_at > now())
    order by expires_at nulls last, created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_lot.amount_remaining, v_remaining);
    update credit_lots set amount_remaining = amount_remaining - v_take where id = v_lot.id;
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  update profiles set credits = v_balance where id = p_user_id;

  insert into credit_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, audit_event_id, transaction_type)
  values (p_user_id, -p_amount, v_balance, p_reason, p_ref_type, p_ref_id, p_audit_event_id, 'spend')
  returning id into v_ledger_id;

  return jsonb_build_object('balance_after', v_balance, 'ledger_id', v_ledger_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: grant_credits
-- ---------------------------------------------------------------------------
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_source text,
  p_reason text,
  p_expires_at timestamptz default null,
  p_grant_period text default null,
  p_stripe_invoice_id text default null,
  p_payment_intent_id text default null,
  p_audit_event_id uuid default null,
  p_ref_type text default null,
  p_ref_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot_id uuid;
  v_balance integer;
  v_tx text;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;
  if p_source not in ('purchase', 'subscription_grant', 'free_grant', 'adjustment') then
    raise exception 'INVALID_SOURCE' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  insert into credit_lots (
    user_id, amount_remaining, amount_initial, source,
    expires_at, grant_period, stripe_invoice_id, payment_intent_id
  ) values (
    p_user_id, p_amount, p_amount, p_source,
    p_expires_at, p_grant_period, p_stripe_invoice_id, p_payment_intent_id
  ) returning id into v_lot_id;

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  update profiles set credits = v_balance where id = p_user_id;

  v_tx := case p_source
    when 'purchase' then 'purchase'
    when 'free_grant' then 'subscription_grant'
    else 'subscription_grant'
  end;

  insert into credit_ledger (
    user_id, delta, balance_after, reason, ref_type, ref_id,
    audit_event_id, lot_id, transaction_type, payment_intent_id
  ) values (
    p_user_id, p_amount, v_balance, p_reason, p_ref_type, p_ref_id,
    p_audit_event_id, v_lot_id, v_tx, p_payment_intent_id
  );

  return jsonb_build_object('balance_after', v_balance, 'lot_id', v_lot_id);
end;
$$;

grant execute on function public.spend_credits to service_role;
grant execute on function public.grant_credits to service_role;
