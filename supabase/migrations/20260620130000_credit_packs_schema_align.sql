-- Fix credit_packs when table existed before 20260620120000 (missing slug column).
-- Safe to re-run.

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

-- Legacy table required stripe_price_id; packs are seeded before Stripe Price IDs exist.
alter table public.credit_packs alter column stripe_price_id drop not null;

-- Legacy column "name" (predates name_sk).
alter table public.credit_packs alter column name drop not null;

update public.credit_packs
set name = coalesce(name_sk, name, slug)
where name is null and (name_sk is not null or slug is not null);

delete from public.credit_packs where slug is null;

create unique index if not exists idx_credit_packs_slug on public.credit_packs (slug);

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
