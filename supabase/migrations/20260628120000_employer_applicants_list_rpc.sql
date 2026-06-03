-- Employer applicants: paginated application rows in SQL (Nest enriches page only).

create or replace function public.employer_list_application_rows(
  p_job_id uuid,
  p_employer_id uuid,
  p_status text default 'all',
  p_sort text default 'applied_at_desc',
  p_offset int default 0,
  p_limit int default 50,
  p_q text default null,
  p_has_cv text default 'any'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(trim(coalesce(p_q, '')), '');
  v_rows jsonb;
  v_total bigint;
begin
  if not exists (
    select 1
    from public.job_offers j
    where j.id = p_job_id
      and j.company_id = p_employer_id
      and j.is_deleted = false
  ) then
    return jsonb_build_object('rows', '[]'::jsonb, 'total', 0);
  end if;

  with filtered as (
    select
      a.id,
      a.individual_id,
      a.status,
      a.created_at,
      a.message
    from public.applications a
    where a.job_id = p_job_id
      and a.is_deleted = false
      and (
        coalesce(p_status, 'all') = 'all'
        or a.status = p_status
      )
      and (
        coalesce(p_has_cv, 'any') = 'any'
        or (
          p_has_cv = 'yes'
          and exists (
            select 1
            from public.cvs c
            where c.user_id = a.individual_id
              and c.is_default_for_profile = true
              and c.visible_to_employers = true
          )
        )
        or (
          p_has_cv = 'no'
          and not exists (
            select 1
            from public.cvs c
            where c.user_id = a.individual_id
              and c.is_default_for_profile = true
              and c.visible_to_employers = true
          )
        )
      )
      and (
        v_q is null
        or exists (
          select 1
          from public.profiles p
          where p.id = a.individual_id
            and (
              coalesce(p.display_name, '') ilike '%' || v_q || '%'
              or coalesce(p.first_name, '') ilike '%' || v_q || '%'
              or coalesce(p.last_name, '') ilike '%' || v_q || '%'
              or coalesce(p.location, '') ilike '%' || v_q || '%'
            )
        )
      )
  ),
  counted as (
    select count(*)::bigint as cnt from filtered
  ),
  ordered as (
    select *
    from filtered f
    order by
      case when p_sort = 'applied_at_asc' then f.created_at end asc nulls last,
      case when p_sort <> 'applied_at_asc' then f.created_at end desc nulls last,
      f.id desc
    offset v_offset
    limit v_limit
  )
  select
    coalesce((select jsonb_agg(to_jsonb(o)) from ordered o), '[]'::jsonb),
    (select cnt from counted)
  into v_rows, v_total;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

revoke all on function public.employer_list_application_rows(uuid, uuid, text, text, int, int, text, text) from public;
grant execute on function public.employer_list_application_rows(uuid, uuid, text, text, int, int, text, text) to service_role;
