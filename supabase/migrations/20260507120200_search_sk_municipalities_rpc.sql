-- RPC for accent-insensitive municipality search (used by Nest /api/locations/sk-municipalities).

create or replace function public.search_sk_municipalities(p_query text, p_limit int)
returns table (id bigint, name text, kraj text, okres text)
language sql
stable
parallel safe
as $$
  select m.id, m.name, m.kraj, m.okres
  from public.sk_municipalities m
  where length(trim(coalesce(p_query, ''))) >= 2
    and public.jobbie_unaccent(m.name) ilike '%' || public.jobbie_unaccent(trim(p_query)) || '%'
  order by
    case
      when public.jobbie_unaccent(m.name) ilike public.jobbie_unaccent(trim(p_query)) || '%' then 0
      else 1
    end,
    m.name
  limit least(greatest(coalesce(p_limit, 50), 1), 80);
$$;

comment on function public.search_sk_municipalities(text, int) is 'Prefix-prioritized search over sk_municipalities.name using jobbie_unaccent.';

grant execute on function public.search_sk_municipalities(text, int) to anon, authenticated, service_role;
