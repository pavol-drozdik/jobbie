-- Slovak company names for CV employer picker (ORSR / živnostenský register via RPO sync).
-- Search: accent-insensitive trigram on name; populated by Nest write-through from RPO API.

create table if not exists public.sk_companies (
  id bigint generated always as identity primary key,
  rpo_id bigint not null,
  name text not null,
  ico char(8) null,
  municipality text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sk_companies_rpo_id_key unique (rpo_id),
  constraint sk_companies_name_len check (char_length(trim(name)) >= 2 and char_length(name) <= 500),
  constraint sk_companies_ico_format check (ico is null or ico ~ '^[0-9]{8}$')
);

create unique index if not exists sk_companies_ico_key
  on public.sk_companies (ico)
  where ico is not null;

comment on table public.sk_companies is
  'Cached RPO company names for fast employer autocomplete; filled on search via Nest upsert_sk_companies_batch.';

create index if not exists idx_sk_companies_name_unaccent_trgm
  on public.sk_companies
  using gin (public.jobbie_unaccent(name) gin_trgm_ops);

create index if not exists idx_sk_companies_ico
  on public.sk_companies (ico)
  where ico is not null;

alter table public.sk_companies enable row level security;

create policy sk_companies_select_authenticated
  on public.sk_companies
  for select
  to authenticated
  using (true);

create policy sk_companies_select_anon
  on public.sk_companies
  for select
  to anon
  using (true);

grant select on public.sk_companies to anon, authenticated, service_role;

-- Prefix-prioritized name search (same pattern as sk_municipalities).
create or replace function public.search_sk_companies(p_query text, p_limit int)
returns table (id bigint, rpo_id bigint, name text, ico text, municipality text)
language sql
stable
parallel safe
as $$
  select c.id, c.rpo_id, c.name, c.ico::text, c.municipality
  from public.sk_companies c
  where length(trim(coalesce(p_query, ''))) >= 2
    and public.jobbie_unaccent(c.name) ilike '%' || public.jobbie_unaccent(trim(p_query)) || '%'
  order by
    case
      when public.jobbie_unaccent(c.name) ilike public.jobbie_unaccent(trim(p_query)) || '%' then 0
      else 1
    end,
    c.name
  limit least(greatest(coalesce(p_limit, 50), 1), 80);
$$;

comment on function public.search_sk_companies(text, int) is
  'Accent-insensitive company name search over sk_companies (RPO cache).';

grant execute on function public.search_sk_companies(text, int) to anon, authenticated, service_role;

-- Service-role batch upsert after RPO search (Nest write-through cache).
create or replace function public.upsert_sk_companies_batch(p_rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return 0;
  end if;

  insert into public.sk_companies (rpo_id, name, ico, municipality, updated_at)
  select
    (elem->>'rpo_id')::bigint,
    trim(elem->>'name'),
    nullif(trim(elem->>'ico'), ''),
    nullif(trim(elem->>'municipality'), ''),
    now()
  from jsonb_array_elements(p_rows) as elem
  where coalesce((elem->>'rpo_id')::bigint, 0) > 0
    and length(trim(coalesce(elem->>'name', ''))) >= 2
  on conflict (rpo_id) do update set
    name = excluded.name,
    ico = coalesce(excluded.ico, public.sk_companies.ico),
    municipality = coalesce(excluded.municipality, public.sk_companies.municipality),
    updated_at = now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.upsert_sk_companies_batch(jsonb) is
  'Upsert RPO search hits into sk_companies; service_role only.';

revoke all on function public.upsert_sk_companies_batch(jsonb) from public;
grant execute on function public.upsert_sk_companies_batch(jsonb) to service_role;
