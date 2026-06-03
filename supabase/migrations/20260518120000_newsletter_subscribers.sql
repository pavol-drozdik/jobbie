-- Marketing newsletter subscribers (backend inserts via service_role only).

create table if not exists public.subscribers (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  name text,
  consent boolean not null,
  mailerlite_status text not null default 'pending'
    check (mailerlite_status in ('pending', 'synced', 'failed')),
  created_at timestamptz not null default now(),
  unique (email)
);

create index if not exists idx_subscribers_mailerlite_status on public.subscribers (mailerlite_status)
  where mailerlite_status in ('pending', 'failed');

comment on table public.subscribers is 'Newsletter signups; GDPR consent required; MailerLite sync tracked in mailerlite_status.';
comment on column public.subscribers.consent is 'Must be true at signup (GDPR).';
comment on column public.subscribers.mailerlite_status is 'pending: not yet synced; synced: MailerLite OK; failed: ML error (retried by cron).';

alter table public.subscribers enable row level security;

-- No policies for anon/authenticated: only service_role (Nest backend) bypasses RLS and uses grants below.

grant select, insert, update on table public.subscribers to service_role;
