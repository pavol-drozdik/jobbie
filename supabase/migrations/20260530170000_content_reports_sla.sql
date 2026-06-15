-- Moderation SLA: claim, resolution, handler tracking (admin API service_role only).
-- Base table + SLA columns: 20260530110000_content_reports_and_account_status.sql

alter table public.content_reports
  add column if not exists handled_by uuid references public.profiles (id) on delete set null,
  add column if not exists handled_at timestamptz,
  add column if not exists resolution_code text,
  add column if not exists claimed_at timestamptz,
  add column if not exists claimed_by uuid references public.profiles (id) on delete set null;

comment on column public.content_reports.resolution_code is
  'spam | harassment | duplicate | false_report | other — set when dismissed/reviewed';

create index if not exists idx_content_reports_open_oldest
  on public.content_reports (created_at asc)
  where status = 'open';
