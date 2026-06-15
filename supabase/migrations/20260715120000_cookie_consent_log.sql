-- Cookie consent audit log (anonymous + authenticated visitors).

create table if not exists public.cookie_consent_log (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null,
  user_id uuid references public.profiles (id) on delete set null,
  action text not null check (
    action in ('accept_all', 'reject_all', 'save', 'withdraw')
  ),
  analytics boolean not null,
  marketing boolean not null default false,
  personalization boolean not null default false,
  policy_version smallint not null default 1,
  source text,
  page_path text,
  user_agent text,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_cookie_consent_log_recorded
  on public.cookie_consent_log (recorded_at desc);

create index if not exists idx_cookie_consent_log_visitor_recorded
  on public.cookie_consent_log (visitor_id, recorded_at desc);

create index if not exists idx_cookie_consent_log_user_recorded
  on public.cookie_consent_log (user_id, recorded_at desc)
  where user_id is not null;

comment on table public.cookie_consent_log is
  'Append-only cookie CMP audit trail. Nest service_role inserts; admin reads via service role.';

alter table public.cookie_consent_log enable row level security;

create policy "deny cookie_consent_log mutations for clients"
  on public.cookie_consent_log for all
  using (false)
  with check (false);

revoke all on public.cookie_consent_log from anon, authenticated;
grant insert, select on public.cookie_consent_log to service_role;

alter table public.cookie_consent_log force row level security;
