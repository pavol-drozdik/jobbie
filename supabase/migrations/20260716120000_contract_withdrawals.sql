-- Consumer contract withdrawal form submissions (public PWA → Nest API).

create table if not exists public.contract_withdrawals (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (
    status in ('pending', 'approved', 'rejected')
  ),
  name text not null,
  email text not null,
  product text not null check (product in ('subscription', 'credits')),
  invoice_number text not null,
  purchase_date date not null,
  reason text check (
    reason is null
    or reason in ('changed_mind', 'no_longer_needed', 'other')
  ),
  reason_other text,
  submitted_at timestamptz not null default now(),
  status_updated_at timestamptz,
  status_updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_withdrawals_submitted
  on public.contract_withdrawals (submitted_at desc);

create index if not exists idx_contract_withdrawals_status_submitted
  on public.contract_withdrawals (status, submitted_at desc);

create index if not exists idx_contract_withdrawals_email
  on public.contract_withdrawals (email);

create index if not exists idx_contract_withdrawals_invoice
  on public.contract_withdrawals (invoice_number);

comment on table public.contract_withdrawals is
  'Consumer withdrawal requests from /odstupenie-od-zmluvy. Nest service_role insert; admin reads/updates via service_role.';

alter table public.contract_withdrawals enable row level security;

create policy "deny contract_withdrawals for clients"
  on public.contract_withdrawals for all
  using (false)
  with check (false);

revoke all on public.contract_withdrawals from anon, authenticated;
grant select, insert, update on public.contract_withdrawals to service_role;

alter table public.contract_withdrawals force row level security;
