-- Platform security: account enforcement, BFF API sessions, admin MFA marker.

-- ---------------------------------------------------------------------------
-- profiles: account enforcement
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'closed'));

alter table public.profiles
  add column if not exists suspended_at timestamptz;

alter table public.profiles
  add column if not exists suspended_reason text;

alter table public.profiles
  add column if not exists suspended_by uuid references public.profiles (id) on delete set null;

alter table public.profiles
  add column if not exists admin_mfa_enforced_at timestamptz;

comment on column public.profiles.account_status is 'active | suspended (admin) | closed (self-delete or admin).';
comment on column public.profiles.admin_mfa_enforced_at is 'When admin MFA policy was recorded; Supabase MFA is source of truth.';

create index if not exists idx_profiles_account_status
  on public.profiles (account_status)
  where account_status <> 'active';

-- Backfill closed from soft-delete
update public.profiles
set account_status = 'closed'
where is_deleted = true
  and account_status = 'active';

-- Extend sensitive-column guard
create or replace function public.profiles_block_sensitive_column_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role'
     or current_user = 'postgres'
     or session_user = 'service_role' then
    return new;
  end if;

  if new.credits is distinct from old.credits then
    raise exception 'profiles.credits cannot be updated directly';
  end if;

  if new.app_role is distinct from old.app_role then
    raise exception 'profiles.app_role cannot be updated directly';
  end if;

  if new.extra_permission_scopes is distinct from old.extra_permission_scopes then
    raise exception 'profiles.extra_permission_scopes cannot be updated directly';
  end if;

  if new.account_status is distinct from old.account_status then
    raise exception 'profiles.account_status cannot be updated directly';
  end if;

  if new.suspended_at is distinct from old.suspended_at
     or new.suspended_reason is distinct from old.suspended_reason
     or new.suspended_by is distinct from old.suspended_by then
    raise exception 'profiles suspension fields cannot be updated directly';
  end if;

  if new.admin_mfa_enforced_at is distinct from old.admin_mfa_enforced_at then
    raise exception 'profiles.admin_mfa_enforced_at cannot be updated directly';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- BFF API sessions (refresh token hash only; service_role)
-- ---------------------------------------------------------------------------
create table if not exists public.api_user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  refresh_token_hash text not null,
  device_id text,
  user_agent text,
  last_ip text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_step_up_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_api_user_sessions_user_active
  on public.api_user_sessions (user_id, last_seen_at desc)
  where revoked_at is null;

alter table public.api_user_sessions enable row level security;

create policy "deny all api_user_sessions"
  on public.api_user_sessions for all
  using (false)
  with check (false);

revoke all on public.api_user_sessions from anon, authenticated;
grant select, insert, update, delete on public.api_user_sessions to service_role;

-- content_reports: revoke broad client grants (service_role only)
revoke all on public.content_reports from anon, authenticated;
