-- Session lifecycle hardening: index for fast revoked_at lookup keyed by session id.
-- SessionAuthGuard now consults api_user_sessions.revoked_at on every request,
-- and refresh rotation is enforced atomically via conditional UPDATE … RETURNING.

create index if not exists idx_api_user_sessions_id_active
  on public.api_user_sessions (id)
  where revoked_at is null;

-- Track which Supabase access JWT is currently bound to this BFF session, so a
-- stolen jb_at presented with a different jb_sid (or after the cookie pair was
-- rotated) cannot be replayed until JWT exp.
alter table public.api_user_sessions
  add column if not exists access_token_jti text;

comment on column public.api_user_sessions.access_token_jti is
  'Most recent Supabase access JWT identifier (sub|iat) bound to this session. '
  'Used by SessionAuthGuard to invalidate jb_at after logout or refresh rotation.';
