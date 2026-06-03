-- Fix ensure_sk_cv_skill: reliable insert when name not yet in catalog (FOUND after RETURN QUERY was unreliable).

create or replace function public.ensure_sk_cv_skill(p_name text)
returns table (id bigint, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_norm text;
  v_id bigint;
  v_out_name text;
begin
  if char_length(v_name) < 2 then
    raise exception 'cv_skill_name_too_short' using errcode = '22023';
  end if;
  if char_length(v_name) > 200 then
    raise exception 'cv_skill_name_too_long' using errcode = '22023';
  end if;

  v_norm := public.jobbie_unaccent(lower(v_name));

  select s.id, s.name
  into v_id, v_out_name
  from public.sk_cv_skills s
  where public.jobbie_unaccent(lower(trim(s.name))) = v_norm
  order by s.id
  limit 1;

  if v_id is not null then
    return query select v_id, v_out_name;
    return;
  end if;

  begin
    insert into public.sk_cv_skills (name)
    values (v_name);
  exception
    when unique_violation then
      null;
  end;

  return query
  select s.id, s.name
  from public.sk_cv_skills s
  where public.jobbie_unaccent(lower(trim(s.name))) = v_norm
  order by s.id
  limit 1;
end;
$$;
