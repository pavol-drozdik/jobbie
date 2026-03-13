-- Remove looking_for_work and offering_work from profiles.
drop index if exists idx_profiles_looking_for_work;
drop index if exists idx_profiles_offering_work;
alter table public.profiles drop column if exists looking_for_work;
alter table public.profiles drop column if exists offering_work;
