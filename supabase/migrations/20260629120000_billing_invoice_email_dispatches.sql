-- Idempotent dispatch log for app-sent paid invoice (faktúra) emails via Nest SMTP.
-- service_role only — Nest claims before send to avoid duplicate webhook + confirm paths.

create table if not exists public.billing_invoice_email_dispatches (
  stripe_invoice_id text primary key,
  recipient_email text not null,
  sent_at timestamptz not null default now()
);

comment on table public.billing_invoice_email_dispatches is
  'Tracks Stripe invoice IDs for which a paid faktúra email was sent (Nest BillingInvoiceEmailService).';

alter table public.billing_invoice_email_dispatches enable row level security;

create policy "deny all billing_invoice_email_dispatches"
  on public.billing_invoice_email_dispatches
  for all
  using (false)
  with check (false);

revoke all on public.billing_invoice_email_dispatches from anon, authenticated;
grant select, insert, delete on public.billing_invoice_email_dispatches to service_role;
