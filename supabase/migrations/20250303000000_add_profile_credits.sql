-- Add credits to user profiles (purchased via Stripe, spent e.g. per job post).
alter table public.profiles
  add column if not exists credits integer not null default 0;

comment on column public.profiles.credits is 'User credits (bought via Stripe, can be spent on actions).';
