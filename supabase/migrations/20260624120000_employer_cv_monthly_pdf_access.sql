-- Dedupe CV database PDF/view quota per (company, cv, month).
-- Nest increments employer_cv_monthly_usage.pdf_downloads_count once per CV per period.

create table if not exists public.employer_cv_monthly_pdf_access (
  company_id uuid not null references public.profiles (id) on delete cascade,
  cv_id uuid not null references public.cvs (id) on delete cascade,
  period_month date not null,
  created_at timestamptz not null default now(),
  primary key (company_id, cv_id, period_month)
);

create index if not exists idx_employer_cv_monthly_pdf_access_period
  on public.employer_cv_monthly_pdf_access (period_month);

alter table public.employer_cv_monthly_pdf_access enable row level security;

drop policy if exists "deny all employer_cv_monthly_pdf_access" on public.employer_cv_monthly_pdf_access;
create policy "deny all employer_cv_monthly_pdf_access"
  on public.employer_cv_monthly_pdf_access for all using (false) with check (false);

revoke all on public.employer_cv_monthly_pdf_access from anon, authenticated;
grant select, insert, update, delete on public.employer_cv_monthly_pdf_access to service_role;

comment on table public.employer_cv_monthly_pdf_access is
  'Tracks CVs that consumed monthly PDF/view quota for an employer (service_role via Nest).';
