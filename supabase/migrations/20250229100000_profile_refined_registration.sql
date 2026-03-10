-- Refined registration: first_name, last_name (individual); registered_office, tax_id, vat_id (company).
-- registration_number = ICO; tax_id = DIC; vat_id = IC DPH.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists registered_office text,
  add column if not exists tax_id text,
  add column if not exists vat_id text;

comment on column public.profiles.first_name is 'Meno (individual).';
comment on column public.profiles.last_name is 'Priezvisko (individual).';
comment on column public.profiles.registered_office is 'Sídlo firmy / adresa (company).';
comment on column public.profiles.tax_id is 'DIČ (company).';
comment on column public.profiles.vat_id is 'IČ DPH (company, optional).';
