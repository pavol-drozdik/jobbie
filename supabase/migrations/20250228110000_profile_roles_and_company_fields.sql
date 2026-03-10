-- User schema: role flags (looking_for_work, offering_work) and company/individual profile fields.
-- role = account type (individual | company). Step 3 sets looking_for_work/offering_work via PATCH.

alter table public.profiles
  add column if not exists looking_for_work boolean not null default false,
  add column if not exists offering_work boolean not null default false,
  add column if not exists experience text,
  add column if not exists registration_number text,
  add column if not exists website text,
  add column if not exists logo_url text;

comment on column public.profiles.looking_for_work is 'User is looking for work (can apply to jobs).';
comment on column public.profiles.offering_work is 'User offers work (can post job offers).';
comment on column public.profiles.experience is 'Experience description (individual, seeking work).';
comment on column public.profiles.registration_number is 'Company registration number (optional).';
comment on column public.profiles.website is 'Company or user website.';
comment on column public.profiles.logo_url is 'Company logo URL (or avatar for individual).';

create index if not exists idx_profiles_looking_for_work on public.profiles(looking_for_work) where looking_for_work = true;
create index if not exists idx_profiles_offering_work on public.profiles(offering_work) where offering_work = true;
