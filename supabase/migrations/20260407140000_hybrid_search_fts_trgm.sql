-- Hybrid search fallback (Postgres FTS + trigram) for jobs and profiles.
create extension if not exists pg_trgm;
create extension if not exists unaccent;

-- `unaccent(text)` is STABLE, so it can't be used directly in an index
-- expression. Wrap the dictionary-qualified overload in an IMMUTABLE SQL
-- function (the classic Postgres pattern for this). The wrapper is also
-- used inside the search functions below so predicates match the GIN index
-- expression exactly (otherwise the planner would fall back to seq scans).
create or replace function public.jobbie_unaccent(text)
returns text
language sql
immutable
parallel safe
as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;

create index if not exists idx_job_offers_search_tsv
  on public.job_offers
  using gin (
    to_tsvector(
      'simple',
      public.jobbie_unaccent(
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(location, '') || ' ' ||
        coalesce(location_address, '')
      )
    )
  );

create index if not exists idx_job_offers_title_trgm
  on public.job_offers using gin (title gin_trgm_ops);
create index if not exists idx_job_offers_description_trgm
  on public.job_offers using gin (description gin_trgm_ops);
create index if not exists idx_job_offers_location_trgm
  on public.job_offers using gin (location gin_trgm_ops);
create index if not exists idx_job_offers_location_address_trgm
  on public.job_offers using gin (location_address gin_trgm_ops);

create index if not exists idx_profiles_search_tsv
  on public.profiles
  using gin (
    to_tsvector(
      'simple',
      public.jobbie_unaccent(
        coalesce(display_name, '') || ' ' ||
        coalesce(company_name, '') || ' ' ||
        coalesce(bio, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(skills, '') || ' ' ||
        coalesce(sector, '') || ' ' ||
        coalesce(location, '')
      )
    )
  );

create index if not exists idx_profiles_display_name_trgm
  on public.profiles using gin (display_name gin_trgm_ops);
create index if not exists idx_profiles_company_name_trgm
  on public.profiles using gin (company_name gin_trgm_ops);
create index if not exists idx_profiles_location_trgm
  on public.profiles using gin (location gin_trgm_ops);

create or replace function public.search_jobs_hybrid(
  p_q text default '',
  p_category text default null,
  p_job_type text default null,
  p_location text default null,
  p_urgent_only boolean default false,
  p_limit int default 20,
  p_offset int default 0
)
returns setof public.job_offers
language sql
stable
as $$
  with base as (
    select j.*
    from public.job_offers j
    where j.is_deleted = false
      and j.is_active = true
      and coalesce(j.is_draft, false) = false
      and (p_category is null or j.category = p_category)
      and (p_job_type is null or j.job_type = p_job_type)
      and (not p_urgent_only or j.is_urgent = true)
      and (
        p_location is null
        or public.jobbie_unaccent(coalesce(j.location, '')) ilike '%' || public.jobbie_unaccent(p_location) || '%'
        or public.jobbie_unaccent(coalesce(j.location_address, '')) ilike '%' || public.jobbie_unaccent(p_location) || '%'
      )
  ),
  ranked as (
    select
      b.*,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else ts_rank_cd(
          to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.title, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.location, '') || ' ' ||
              coalesce(b.location_address, '')
            )
          ),
          websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
        )
      end as fts_score,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else greatest(
          similarity(public.jobbie_unaccent(coalesce(b.title, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.description, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location_address, '')), public.jobbie_unaccent(trim(p_q)))
        )
      end as trigram_score
    from base b
    where
      trim(coalesce(p_q, '')) = ''
      or to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.title, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.location, '') || ' ' ||
              coalesce(b.location_address, '')
            )
         ) @@ websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
      or similarity(public.jobbie_unaccent(coalesce(b.title, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.description, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location_address, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
  )
  select j.*
  from ranked r
  join public.job_offers j on j.id = r.id
  order by
    (0.75 * r.fts_score + 0.25 * r.trigram_score + case when j.is_urgent then 0.03 else 0 end) desc,
    j.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

create or replace function public.search_profiles_hybrid(
  p_q text default '',
  p_location text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table(
  id uuid,
  role text,
  display_name text,
  company_name text,
  avatar_url text,
  logo_url text,
  bio text,
  description text,
  location text,
  skills text,
  sector text,
  customer_role boolean,
  worker_role boolean,
  provider_role boolean,
  created_at timestamptz,
  rating_average numeric,
  rating_count int
)
language sql
stable
as $$
  with base as (
    select
      p.id,
      p.role,
      p.display_name,
      p.company_name,
      p.avatar_url,
      p.logo_url,
      p.bio,
      p.description,
      p.location,
      p.skills,
      p.sector,
      p.customer_role,
      p.worker_role,
      p.provider_role,
      p.created_at
    from public.profiles p
    where p.provider_role = true
      and (
        p_location is null
        or public.jobbie_unaccent(coalesce(p.location, '')) ilike '%' || public.jobbie_unaccent(p_location) || '%'
      )
  ),
  ranked as (
    select
      b.*,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else ts_rank_cd(
          to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.display_name, '') || ' ' ||
              coalesce(b.company_name, '') || ' ' ||
              coalesce(b.bio, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.skills, '') || ' ' ||
              coalesce(b.sector, '') || ' ' ||
              coalesce(b.location, '')
            )
          ),
          websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
        )
      end as fts_score,
      case
        when trim(coalesce(p_q, '')) = '' then 0::float
        else greatest(
          similarity(public.jobbie_unaccent(coalesce(b.display_name, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.company_name, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.skills, '')), public.jobbie_unaccent(trim(p_q))),
          similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q)))
        )
      end as trigram_score
    from base b
    where
      trim(coalesce(p_q, '')) = ''
      or to_tsvector(
            'simple',
            public.jobbie_unaccent(
              coalesce(b.display_name, '') || ' ' ||
              coalesce(b.company_name, '') || ' ' ||
              coalesce(b.bio, '') || ' ' ||
              coalesce(b.description, '') || ' ' ||
              coalesce(b.skills, '') || ' ' ||
              coalesce(b.sector, '') || ' ' ||
              coalesce(b.location, '')
            )
         ) @@ websearch_to_tsquery('simple', public.jobbie_unaccent(trim(p_q)))
      or similarity(public.jobbie_unaccent(coalesce(b.display_name, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.company_name, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.skills, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
      or similarity(public.jobbie_unaccent(coalesce(b.location, '')), public.jobbie_unaccent(trim(p_q))) > 0.2
  )
  select
    r.id,
    r.role,
    r.display_name,
    r.company_name,
    r.avatar_url,
    r.logo_url,
    r.bio,
    r.description,
    r.location,
    r.skills,
    r.sector,
    r.customer_role,
    r.worker_role,
    r.provider_role,
    r.created_at,
    0::numeric as rating_average,
    0::int as rating_count
  from ranked r
  order by (0.8 * r.fts_score + 0.2 * r.trigram_score) desc, r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.jobbie_unaccent(text)
to anon, authenticated, service_role;
grant execute on function public.search_jobs_hybrid(text, text, text, text, boolean, int, int)
to anon, authenticated, service_role;
grant execute on function public.search_profiles_hybrid(text, text, int, int)
to anon, authenticated, service_role;
