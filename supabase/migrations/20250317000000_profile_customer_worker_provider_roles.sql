-- Add explicit marketplace role flags to profiles.
-- Safe migration: only adds missing columns.

alter table public.profiles
  add column if not exists customer_role boolean not null default false,
  add column if not exists worker_role boolean not null default false,
  add column if not exists provider_role boolean not null default false;

comment on column public.profiles.customer_role is 'User wants to post jobs as customer.';
comment on column public.profiles.worker_role is 'User wants to browse/apply as worker.';
comment on column public.profiles.provider_role is 'User wants to be discoverable as provider.';
