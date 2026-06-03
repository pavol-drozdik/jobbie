-- Performance: aggregated applicant status counts and chat unread counts (Nest service_role RPCs).

-- ---------------------------------------------------------------------------
-- employer_application_status_counts
-- ---------------------------------------------------------------------------
create or replace function public.employer_application_status_counts(p_job_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'pending', coalesce(sum(case when status = 'pending' then 1 else 0 end), 0)::int,
    'reviewing', coalesce(sum(case when status = 'reviewing' then 1 else 0 end), 0)::int,
    'interview_invited', coalesce(sum(case when status = 'interview_invited' then 1 else 0 end), 0)::int,
    'rejected', coalesce(sum(case when status = 'rejected' then 1 else 0 end), 0)::int,
    'accepted', coalesce(sum(case when status = 'accepted' then 1 else 0 end), 0)::int,
    'withdrawn', coalesce(sum(case when status = 'withdrawn' then 1 else 0 end), 0)::int,
    'total', coalesce(count(*)::int, 0)
  )
  from public.applications
  where job_id = p_job_id
    and is_deleted = false;
$$;

revoke all on function public.employer_application_status_counts(uuid) from public;
grant execute on function public.employer_application_status_counts(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- chat_unread_counts_for_viewer — one round-trip for room list enrichment
-- ---------------------------------------------------------------------------
create or replace function public.chat_unread_counts_for_viewer(
  p_user_id uuid,
  p_room_ids uuid[]
)
returns table(room_id uuid, unread_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id as room_id,
    count(m.id)::bigint as unread_count
  from public.chat_rooms r
  left join public.chat_messages m
    on m.room_id = r.id
    and m.sender_id <> p_user_id
    and m.created_at > coalesce(
      case
        when r.company_id = p_user_id then r.company_last_read_at
        else r.individual_last_read_at
      end,
      '1970-01-01T00:00:00+00'::timestamptz
    )
  where r.id = any(p_room_ids)
    and (r.company_id = p_user_id or r.individual_id = p_user_id)
  group by r.id;
$$;

revoke all on function public.chat_unread_counts_for_viewer(uuid, uuid[]) from public;
grant execute on function public.chat_unread_counts_for_viewer(uuid, uuid[]) to service_role;
