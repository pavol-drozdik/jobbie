-- Indexes and unique constraints for search filters, billing idempotency, and lookups.

-- job_offers: structured columns used by indexes (from 20260619120000; safe if already applied)
alter table public.job_offers
  add column if not exists city text;

-- job_offers: common list/filter predicates
create index if not exists idx_job_offers_city_active
  on public.job_offers (city)
  where is_deleted = false and city is not null;

create index if not exists idx_job_offers_salary_range
  on public.job_offers (salary_min, salary_max)
  where is_deleted = false
    and (salary_min is not null or salary_max is not null);

create index if not exists idx_job_offers_list_filter
  on public.job_offers (is_active, is_deleted, is_draft, category, created_at desc);

create index if not exists idx_job_offers_featured
  on public.job_offers (created_at desc)
  where is_featured = true and is_deleted = false and is_active = true;

-- job_email_alerts: ensure array columns exist (from 20260529120000; safe if already applied)
alter table public.job_email_alerts
  add column if not exists radius_km int,
  add column if not exists work_modes text[] not null default '{}'::text[],
  add column if not exists categories text[] not null default '{}'::text[];

-- job_email_alerts: criteria matching
create index if not exists idx_job_email_alerts_criteria_hash
  on public.job_email_alerts (criteria_hash);

create index if not exists idx_job_email_alerts_categories_gin
  on public.job_email_alerts using gin (categories);

create index if not exists idx_job_email_alerts_work_modes_gin
  on public.job_email_alerts using gin (work_modes);

create index if not exists idx_job_email_alerts_employment_types_gin
  on public.job_email_alerts using gin (employment_types);

-- cv_contact_unlocks
create index if not exists idx_cv_contact_unlocks_cv_id
  on public.cv_contact_unlocks (cv_id);

-- Billing idempotency (also supports lookup by Stripe IDs)
create unique index if not exists uq_credit_ledger_payment_intent
  on public.credit_ledger (payment_intent_id)
  where payment_intent_id is not null;

create unique index if not exists uq_credit_lots_payment_intent
  on public.credit_lots (payment_intent_id)
  where payment_intent_id is not null;

create unique index if not exists uq_user_subscriptions_stripe_sub
  on public.user_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- cv_contact_unlocks: FK to cvs (remove orphans first)
delete from public.cv_contact_unlocks u
where not exists (select 1 from public.cvs c where c.id = u.cv_id);

alter table public.cv_contact_unlocks
  drop constraint if exists cv_contact_unlocks_cv_id_fkey;

alter table public.cv_contact_unlocks
  add constraint cv_contact_unlocks_cv_id_fkey
  foreign key (cv_id) references public.cvs (id) on delete cascade;
