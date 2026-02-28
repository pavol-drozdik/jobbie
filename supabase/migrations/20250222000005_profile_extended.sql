-- Add extended profile fields for seekers and suppliers (Slovak app).
-- display_name = Celé meno; company_name = Názov firmy (supplier).
-- New: bio, education, skills, job_interests, location, description, sector.

alter table public.profiles
  add column if not exists bio text,
  add column if not exists education text,
  add column if not exists skills text,
  add column if not exists job_interests text,
  add column if not exists location text,
  add column if not exists description text,
  add column if not exists sector text;

comment on column public.profiles.bio is 'Bio (seeker).';
comment on column public.profiles.education is 'Vzdelanie (seeker).';
comment on column public.profiles.skills is 'Skills (seeker).';
comment on column public.profiles.job_interests is 'O aký druh práce má záujem (seeker).';
comment on column public.profiles.location is 'Lokácia.';
comment on column public.profiles.description is 'Popis firmy alebo krátky popis (supplier).';
comment on column public.profiles.sector is 'Sektor / oblasť pôsobenia (supplier).';
