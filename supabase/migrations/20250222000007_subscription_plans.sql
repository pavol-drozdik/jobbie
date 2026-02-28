-- Subscription plans and user subscriptions for JOBBIE.
-- Plans: free + paid tiers. user_subscriptions links user to plan (Stripe subscription).

create table if not exists public.subscription_plans (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name_sk text not null,
  price_monthly_cents int not null default 0,
  stripe_price_id text,
  max_active_jobs int not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'unpaid')),
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_user_subscriptions_user_id on public.user_subscriptions(user_id);
create index if not exists idx_user_subscriptions_status on public.user_subscriptions(status);

alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;

create policy "Anyone can read subscription_plans"
  on public.subscription_plans for select using (true);

create policy "Users can read own user_subscriptions"
  on public.user_subscriptions for select using (auth.uid() = user_id);

create policy "Service role can manage user_subscriptions"
  on public.user_subscriptions for all using (false)
  with check (false);

-- Trigger updated_at for subscription_plans
create trigger subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

-- Insert default plans (Slovak). stripe_price_id filled in after creating Stripe Products/Prices.
insert into public.subscription_plans (slug, name_sk, price_monthly_cents, max_active_jobs, sort_order)
values
  ('zadarmo', 'Zadarmo', 0, 1, 0),
  ('basic', '4,99 €/mesiac', 499, 3, 1),
  ('standard', '9,99 €/mesiac', 999, 5, 2),
  ('premium', '14,99 €/mesiac', 1499, 10, 3)
on conflict (slug) do nothing;
