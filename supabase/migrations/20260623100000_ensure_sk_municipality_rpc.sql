-- Idempotent municipality row for user-entered obec names (Nest service_role only).

create or replace function public.ensure_sk_municipality(p_name text)
returns table (id bigint, name text, kraj text, okres text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
begin
  if char_length(v_name) < 2 then
    raise exception 'municipality_name_too_short' using errcode = '22023';
  end if;
  if char_length(v_name) > 120 then
    raise exception 'municipality_name_too_long' using errcode = '22023';
  end if;

  return query
  select m.id, m.name, m.kraj, m.okres
  from public.sk_municipalities m
  where public.jobbie_unaccent(m.name) = public.jobbie_unaccent(v_name)
  order by m.id
  limit 1;
  if found then
    return;
  end if;

  insert into public.sk_municipalities (name, kraj, okres)
  values (v_name, 'Neuvedené', 'Neuvedené')
  on conflict (name, okres) do nothing;

  return query
  select m.id, m.name, m.kraj, m.okres
  from public.sk_municipalities m
  where m.name = v_name
    and m.okres = 'Neuvedené'
  order by m.id
  limit 1;
end;
$$;

comment on function public.ensure_sk_municipality(text) is
  'Return existing municipality by accent-insensitive name, or insert placeholder kraj/okres for user-entered obec.';

revoke all on function public.ensure_sk_municipality(text) from public;
grant execute on function public.ensure_sk_municipality(text) to service_role;
