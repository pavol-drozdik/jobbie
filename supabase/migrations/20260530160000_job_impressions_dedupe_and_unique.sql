-- Cap job_impressions disk: one row per (user_id, job_id), service_role writes only.

-- 1) Dedupe: keep latest shown_at per user/job (tie-break by id).
delete from public.job_impressions ji
where exists (
  select 1
  from public.job_impressions newer
  where newer.user_id = ji.user_id
    and newer.job_id = ji.job_id
    and (
      newer.shown_at > ji.shown_at
      or (newer.shown_at = ji.shown_at and newer.id > ji.id)
    )
);

-- 2) Drop unused column.
alter table public.job_impressions drop column if exists list_session_id;

-- 3) Unique key for upsert.
alter table public.job_impressions
  add constraint job_impressions_user_job_unique unique (user_id, job_id);

-- 4) Employer stats: filter by job_id + shown_at range.
create index if not exists idx_job_impressions_job_id_shown_at
  on public.job_impressions (job_id, shown_at desc);

-- 5) Nest service_role only (clients use POST /api/jobs/impressions).
revoke insert, update, delete on public.job_impressions from anon;
revoke insert, update, delete on public.job_impressions from authenticated;

grant select, insert, update, delete on public.job_impressions to service_role;

-- Retention cron deletes old search analytics rows.
grant delete on public.search_query_logs to service_role;

comment on table public.job_impressions is
  'One row per (user_id, job_id): last list impression time. Purged after ENGAGEMENT_RETENTION_DAYS.';
