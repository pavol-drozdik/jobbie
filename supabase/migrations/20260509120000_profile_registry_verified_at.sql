-- RPO-backed employer verification: set by Nest after ŠÚ SR register lookup; never client-writable.
alter table public.profiles
  add column if not exists registry_verified_at timestamptz null;

comment on column public.profiles.registry_verified_at is
  'When set, the employer IČO was found as an active subject in the Slovak RPO (api.statistics.sk). Cleared when registration_number changes.';
