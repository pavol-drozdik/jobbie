-- Backfill step-up timestamp for sessions created before establishSession set last_step_up_at on all logins.
update public.api_user_sessions
set last_step_up_at = coalesce(last_seen_at, created_at, now())
where revoked_at is null
  and last_step_up_at is null;
