-- RBAC app_role, optional scopes, phone, device/session tracking, security notifications

alter table public.profiles
  add column if not exists app_role text not null default 'user'
    check (app_role in ('user', 'employer', 'freelancer', 'admin'));

alter table public.profiles
  add column if not exists extra_permission_scopes text[] not null default '{}'::text[];

alter table public.profiles
  add column if not exists phone_e164 text;

alter table public.profiles
  add column if not exists phone_verified_at timestamptz;

comment on column public.profiles.app_role is 'Primary RBAC role: employer (company jobs), freelancer (individual labor), admin, or generic user.';
comment on column public.profiles.extra_permission_scopes is 'Additional API permission scopes beyond defaults for app_role.';
comment on column public.profiles.phone_e164 is 'E.164 phone number when phone auth/verification is enabled.';

-- Backfill app_role from legacy profile.role (new column defaults to user for all rows)
update public.profiles
set app_role = case
  when role = 'company' then 'employer'
  when role = 'individual' then 'freelancer'
  else 'user'
end;

create index if not exists idx_profiles_app_role on public.profiles (app_role);

-- Failed-login tracking (backend increments via service role only)
create table if not exists public.login_attempt_counters (
  email_normalized text primary key,
  failed_count int not null default 0,
  locked_until timestamptz,
  last_failed_ip text,
  updated_at timestamptz not null default now()
);

alter table public.login_attempt_counters enable row level security;

-- No client access — backend uses service role only
create policy "deny all login_attempt_counters"
  on public.login_attempt_counters for all
  using (false)
  with check (false);

grant select, insert, update, delete on public.login_attempt_counters to service_role;

-- Known devices per user (new-device alerts + session UI)
create table if not exists public.user_device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  user_agent text,
  last_ip text,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists idx_user_device_sessions_user on public.user_device_sessions (user_id, last_seen desc);

alter table public.user_device_sessions enable row level security;

drop policy if exists "Users manage own device sessions" on public.user_device_sessions;
create policy "Users manage own device sessions"
  on public.user_device_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.user_device_sessions to authenticated;
grant all on public.user_device_sessions to service_role;

-- Extend notification types for security alerts
alter table public.user_notifications drop constraint if exists user_notifications_type_check;

alter table public.user_notifications
  add constraint user_notifications_type_check
  check (type in ('chat_message', 'job_application', 'security_alert'));
