-- Track scheduled subscription cancellation (Stripe cancel_at_period_end).
alter table public.user_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;
