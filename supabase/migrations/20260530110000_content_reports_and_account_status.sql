-- content_reports + profiles.account_status must exist before admin analytics SQL RPCs
-- (20260530120000_admin_analytics_extended.sql validates column/table refs at CREATE time).

alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'closed'));

comment on column public.profiles.account_status is
  'active | suspended (admin) | closed (self-delete or admin).';

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in (
    'job_offer', 'company_profile', 'banner_ad', 'company_review', 'chat_message'
  )),
  target_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  resolution_code text,
  claimed_at timestamptz,
  claimed_by uuid references public.profiles (id) on delete set null
);

create index if not exists idx_content_reports_status
  on public.content_reports (status, created_at desc);

create index if not exists idx_content_reports_open_oldest
  on public.content_reports (created_at asc)
  where status = 'open';

alter table public.content_reports enable row level security;

drop policy if exists "deny all content_reports" on public.content_reports;
create policy "deny all content_reports"
  on public.content_reports for all using (false) with check (false);

grant select, insert, update on public.content_reports to service_role;

comment on column public.content_reports.resolution_code is
  'spam | harassment | duplicate | false_report | other — set when dismissed/reviewed';
