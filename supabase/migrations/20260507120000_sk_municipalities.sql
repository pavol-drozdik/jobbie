-- Slovak municipalities reference table for job location search.
-- Seed: 20260507120100_sk_municipalities_seed.sql (from supabase/seeds/municipalities-slovakia.csv).

create table if not exists public.sk_municipalities (
  id bigint generated always as identity primary key,
  name text not null,
  kraj text not null,
  okres text not null,
  constraint sk_municipalities_name_okres_key unique (name, okres)
);

comment on table public.sk_municipalities is 'Slovak obce/mestá for add-job location picker; accent-insensitive search via jobbie_unaccent + trgm.';

create index if not exists idx_sk_municipalities_name_unaccent_trgm
  on public.sk_municipalities
  using gin (public.jobbie_unaccent(name) gin_trgm_ops);

alter table public.sk_municipalities enable row level security;

create policy sk_municipalities_select_authenticated
  on public.sk_municipalities
  for select
  to authenticated
  using (true);

create policy sk_municipalities_select_anon
  on public.sk_municipalities
  for select
  to anon
  using (true);

grant select on public.sk_municipalities to anon, authenticated, service_role;
