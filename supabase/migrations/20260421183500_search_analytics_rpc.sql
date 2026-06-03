create or replace function public.search_analytics_top_queries(
  p_since timestamptz,
  p_limit int default 30
)
returns table(q text, cnt bigint)
language sql
stable
as $$
  select
    coalesce(nullif(trim(s.q), ''), '(empty)') as q,
    count(*)::bigint as cnt
  from public.search_query_logs s
  where s.created_at >= p_since
    and s.entity = 'jobs'
  group by 1
  order by cnt desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

create or replace function public.search_analytics_zero_result_queries(
  p_since timestamptz,
  p_limit int default 30
)
returns table(q text, cnt bigint)
language sql
stable
as $$
  select
    coalesce(nullif(trim(s.q), ''), '(empty)') as q,
    count(*)::bigint as cnt
  from public.search_query_logs s
  where s.created_at >= p_since
    and s.entity = 'jobs'
    and s.result_count = 0
  group by 1
  order by cnt desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

grant execute on function public.search_analytics_top_queries(timestamptz, int)
  to service_role;
grant execute on function public.search_analytics_zero_result_queries(timestamptz, int)
  to service_role;
