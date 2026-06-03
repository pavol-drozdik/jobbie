-- Extend job search fallback with wage / created / skills filters (Typesense remains primary).

drop function if exists public.search_jobs_hybrid(text, text, text, text, boolean, int, int);

create or replace function public.search_jobs_hybrid(
  p_q text default '',
  p_category text default null,
  p_job_type text default null,
  p_location text default null,
  p_urgent_only boolean default false,
  p_limit int default 20,
  p_offset int default 0,
  p_min_compensation numeric default null,
  p_max_compensation numeric default null,
  p_created_after timestamptz default null,
  p_skills text default null
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
        or trim(p_location) = ''
        or public.jobbie_unaccent(coalesce(j.location, '')) ilike '%' || public.jobbie_unaccent(trim(p_location)) || '%'
        or public.jobbie_unaccent(coalesce(j.location_address, '')) ilike '%' || public.jobbie_unaccent(trim(p_location)) || '%'
      )
      and (
        p_min_compensation is null
        or (
          j.compensation_amount is not null
          and j.compensation_amount >= p_min_compensation
        )
      )
      and (
        p_max_compensation is null
        or (
          j.compensation_amount is not null
          and j.compensation_amount <= p_max_compensation
        )
      )
      and (p_created_after is null or j.created_at >= p_created_after)
      and (
        p_skills is null
        or trim(p_skills) = ''
        or exists (
          select 1
          from unnest(string_to_array(p_skills, ',')) as tok(raw)
          where trim(raw) <> ''
            and (
              public.jobbie_unaccent(coalesce(j.requirements, '')) ilike '%'
                || public.jobbie_unaccent(trim(raw)) || '%'
              or public.jobbie_unaccent(coalesce(j.description, '')) ilike '%'
                || public.jobbie_unaccent(trim(raw)) || '%'
            )
        )
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

grant execute on function public.search_jobs_hybrid(
  text,
  text,
  text,
  text,
  boolean,
  int,
  int,
  numeric,
  numeric,
  timestamptz,
  text
) to anon, authenticated, service_role;
