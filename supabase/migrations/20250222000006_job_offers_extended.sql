-- Add fields to job_offers: requirements, salary, job_type, expires_at, is_draft.
alter table public.job_offers
  add column if not exists requirements text,
  add column if not exists salary text,
  add column if not exists job_type text,
  add column if not exists expires_at timestamptz,
  add column if not exists is_draft boolean not null default false;

comment on column public.job_offers.requirements is 'Požiadavky.';
comment on column public.job_offers.salary is 'Plat (text, e.g. 10€/h or 500€).';
comment on column public.job_offers.job_type is 'Druh práce.';
comment on column public.job_offers.expires_at is 'Expiračná doba.';
comment on column public.job_offers.is_draft is 'Koncept (draft).';

create index if not exists idx_job_offers_is_draft on public.job_offers(is_draft);
create index if not exists idx_job_offers_expires_at on public.job_offers(expires_at);
create index if not exists idx_job_offers_job_type on public.job_offers(job_type);
