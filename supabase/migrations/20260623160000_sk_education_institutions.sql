-- Slovak/Czech education institutions for CV school name picker (static catalog).

create table if not exists public.sk_education_institutions (
  id bigint generated always as identity primary key,
  name text not null,
  level text not null,
  country char(2) not null default 'SK',
  municipality text null,
  constraint sk_education_institutions_level_check
    check (level in ('secondary', 'university')),
  constraint sk_education_institutions_country_check
    check (country in ('SK', 'CZ')),
  constraint sk_education_institutions_name_len
    check (char_length(trim(name)) >= 2 and char_length(name) <= 500),
  constraint sk_education_institutions_name_level_country_key
    unique (name, level, country)
);

comment on table public.sk_education_institutions is
  'Cached school/university names for CV education autocomplete; seeded from CVTI SR / MSMT lists.';

create index if not exists idx_sk_education_institutions_name_unaccent_trgm
  on public.sk_education_institutions
  using gin (public.jobbie_unaccent(name) gin_trgm_ops);

create index if not exists idx_sk_education_institutions_level_country
  on public.sk_education_institutions (level, country);

alter table public.sk_education_institutions enable row level security;

create policy sk_education_institutions_select_authenticated
  on public.sk_education_institutions
  for select
  to authenticated
  using (true);

create policy sk_education_institutions_select_anon
  on public.sk_education_institutions
  for select
  to anon
  using (true);

grant select on public.sk_education_institutions to anon, authenticated, service_role;

create or replace function public.search_sk_education_institutions(
  p_query text,
  p_level text,
  p_limit int
)
returns table (id bigint, name text, level text, country text, municipality text)
language sql
stable
parallel safe
as $$
  select i.id, i.name, i.level, i.country::text, i.municipality
  from public.sk_education_institutions i
  where length(trim(coalesce(p_query, ''))) >= 2
    and i.level = case
      when p_level = 'secondary' then 'secondary'
      when p_level = 'university' then 'university'
      else ''
    end
    and (
      (p_level = 'secondary' and i.level = 'secondary' and i.country = 'SK')
      or (p_level = 'university' and i.level = 'university' and i.country in ('SK', 'CZ'))
    )
    and public.jobbie_unaccent(i.name) ilike '%' || public.jobbie_unaccent(trim(p_query)) || '%'
  order by
    case
      when public.jobbie_unaccent(i.name) ilike public.jobbie_unaccent(trim(p_query)) || '%' then 0
      else 1
    end,
    case when i.country = 'SK' then 0 else 1 end,
    i.name
  limit least(greatest(coalesce(p_limit, 50), 1), 80);
$$;

comment on function public.search_sk_education_institutions(text, text, int) is
  'Accent-insensitive school search; p_level secondary (SK only) or university (SK+CZ).';

grant execute on function public.search_sk_education_institutions(text, text, int)
  to anon, authenticated, service_role;
