-- Privacy toggles and billing details for account settings.

alter table public.profiles
  add column if not exists public_profile_enabled boolean not null default true,
  add column if not exists public_show_phone boolean not null default false,
  add column if not exists public_show_address boolean not null default true,
  add column if not exists public_allow_platform_contact boolean not null default true,
  add column if not exists public_show_in_company_search boolean not null default true,
  add column if not exists marketing_processing_consent boolean not null default false,
  add column if not exists billing_details jsonb not null default '{}'::jsonb;

comment on column public.profiles.public_profile_enabled is
  'When false, public profile endpoint returns minimal/disabled visibility.';
comment on column public.profiles.public_show_phone is
  'When true and phone is verified, phone_e164 may appear on public profile.';
comment on column public.profiles.public_show_address is
  'When true, registered_office may appear on public profile.';
comment on column public.profiles.billing_details is
  'Invoice billing address and contact fields (JSON).';
