-- Subscription free trial: Stripe `trialing` status + one-time trial consumption marker.

alter table public.user_subscriptions
  drop constraint if exists user_subscriptions_status_check;

alter table public.user_subscriptions
  add constraint user_subscriptions_status_check
  check (status in ('active', 'canceled', 'past_due', 'unpaid', 'trialing'));

alter table public.profiles
  add column if not exists subscription_trial_used_at timestamptz null;

comment on column public.profiles.subscription_trial_used_at is
  'Set when user started a Stripe subscription with a promotional trial (first-time only).';
