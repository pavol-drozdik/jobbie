-- Base44-style fields on job_offers for 1:1 replication (Supabase + TypeScript backend).
-- category, is_urgent, is_featured, compensation_type, compensation_amount, workers_needed,
-- location_address (alias/sync with location), location_lat/lng, application_deadline, completion_deadline,
-- employer_email, employer_name, photos, applications_count.

alter table public.job_offers
  add column if not exists category text,
  add column if not exists is_urgent boolean not null default false,
  add column if not exists is_featured boolean not null default false,
  add column if not exists compensation_type text,
  add column if not exists compensation_amount numeric,
  add column if not exists workers_needed integer not null default 1,
  add column if not exists location_address text,
  add column if not exists location_lat numeric,
  add column if not exists location_lng numeric,
  add column if not exists application_deadline timestamptz,
  add column if not exists completion_deadline text,
  add column if not exists employer_email text,
  add column if not exists employer_name text,
  add column if not exists photos jsonb default '[]',
  add column if not exists applications_count integer not null default 0;

comment on column public.job_offers.category is 'base44: construction, moving, cleaning, etc.';
comment on column public.job_offers.compensation_type is 'hourly, fixed, on_request, auction';
comment on column public.job_offers.location_address is 'Display address (base44).';
comment on column public.job_offers.photos is 'Array of image URLs.';

create index if not exists idx_job_offers_category on public.job_offers(category);
create index if not exists idx_job_offers_is_urgent on public.job_offers(is_urgent) where is_urgent = true;
create index if not exists idx_job_offers_employer_email on public.job_offers(employer_email);

-- Increment job_offers.applications_count when an application is inserted
create or replace function public.increment_job_applications_count()
returns trigger as $$
begin
  update public.job_offers
  set applications_count = applications_count + 1
  where id = new.job_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists applications_increment_count on public.applications;
create trigger applications_increment_count
  after insert on public.applications
  for each row execute function public.increment_job_applications_count();
