-- Audit & compliance: append-only audit chain, ledgers, webhook log, client telemetry, storage access.
-- RLS: deny direct client access; backend uses service role.

-- ---------------------------------------------------------------------------
-- applications: allow withdrawn status
-- ---------------------------------------------------------------------------
alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('pending', 'accepted', 'rejected', 'withdrawn'));

-- ---------------------------------------------------------------------------
-- Chain state (genesis for HMAC chain computed in API)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_chain_state (
  id int primary key check (id = 1),
  last_row_hash text not null
);

insert into public.audit_chain_state (id, last_row_hash)
values (1, 'GENESIS_AUDIT_CHAIN_ORIGIN')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Main audit log (append-only; hash chain via API)
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id uuid primary key,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users (id) on delete set null,
  actor_ip text,
  actor_user_agent text,
  session_id text,
  device_id text,
  event_type text not null,
  subject_type text,
  subject_id uuid,
  payload jsonb not null default '{}'::jsonb,
  prev_row_hash text not null,
  row_hash text not null
);

create index if not exists idx_audit_events_occurred_at on public.audit_events (occurred_at desc);
create index if not exists idx_audit_events_actor_time on public.audit_events (actor_user_id, occurred_at desc);
create index if not exists idx_audit_events_type_time on public.audit_events (event_type, occurred_at desc);

-- ---------------------------------------------------------------------------
-- Atomic insert with chain lock (called from API with precomputed hashes)
-- ---------------------------------------------------------------------------
create or replace function public.insert_audit_event(
  p_id uuid,
  p_occurred_at timestamptz,
  p_actor_user_id uuid,
  p_actor_ip text,
  p_actor_user_agent text,
  p_session_id text,
  p_device_id text,
  p_event_type text,
  p_subject_type text,
  p_subject_id uuid,
  p_payload jsonb,
  p_prev_row_hash text,
  p_row_hash text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_curr text;
begin
  perform pg_advisory_xact_lock(84201931);
  select last_row_hash into v_curr
  from public.audit_chain_state
  where id = 1
  for update;
  if v_curr is distinct from p_prev_row_hash then
    raise exception 'AUDIT_CHAIN_CONFLICT' using errcode = 'P0001';
  end if;
  insert into public.audit_events (
    id, occurred_at, actor_user_id, actor_ip, actor_user_agent,
    session_id, device_id, event_type, subject_type, subject_id,
    payload, prev_row_hash, row_hash
  ) values (
    p_id, coalesce(p_occurred_at, now()), p_actor_user_id,
    nullif(trim(p_actor_ip), ''),
    nullif(trim(p_actor_user_agent), ''),
    nullif(trim(p_session_id), ''),
    nullif(trim(p_device_id), ''),
    p_event_type,
    nullif(trim(p_subject_type), ''),
    p_subject_id,
    coalesce(p_payload, '{}'::jsonb),
    p_prev_row_hash,
    p_row_hash
  );
  update public.audit_chain_state
  set last_row_hash = p_row_hash
  where id = 1;
  return p_id;
end;
$$;

revoke all on function public.insert_audit_event(
  uuid, timestamptz, uuid, text, text, text, text, text, text, uuid, jsonb, text, text
) from public;
grant execute on function public.insert_audit_event(
  uuid, timestamptz, uuid, text, text, text, text, text, text, uuid, jsonb, text, text
) to service_role;

create or replace function public.prevent_audit_events_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

drop trigger if exists audit_events_no_update on public.audit_events;
create trigger audit_events_no_update
  before update on public.audit_events
  for each row execute function public.prevent_audit_events_mutation();

-- ---------------------------------------------------------------------------
-- Auth security events (each login attempt; complements aggregate counters)
-- ---------------------------------------------------------------------------
create table if not exists public.auth_security_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email_normalized text,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_kind text not null,
  success boolean,
  ip text,
  user_agent text,
  device_id text,
  metadata jsonb default '{}'::jsonb,
  audit_event_id uuid references public.audit_events (id) on delete set null
);

create index if not exists idx_auth_security_events_created on public.auth_security_events (created_at desc);
create index if not exists idx_auth_security_events_email on public.auth_security_events (email_normalized, created_at desc);

-- ---------------------------------------------------------------------------
-- Profile field history (PII: review retention policy)
-- ---------------------------------------------------------------------------
create table if not exists public.profile_field_changes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  audit_event_id uuid references public.audit_events (id) on delete set null
);

create index if not exists idx_profile_field_changes_profile on public.profile_field_changes (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Credit ledger (purchase + spend)
-- ---------------------------------------------------------------------------
create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  ref_type text,
  ref_id text,
  payment_intent_id text,
  transaction_type text,
  audit_event_id uuid references public.audit_events (id) on delete set null
);

create index if not exists idx_credit_ledger_user_time on public.credit_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Stripe webhook receipt log
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  processing_status text not null default 'received',
  error_message text,
  http_status smallint
);

create index if not exists idx_stripe_webhook_events_received on public.stripe_webhook_events (received_at desc);

-- ---------------------------------------------------------------------------
-- Refunds & disputes (Stripe-driven)
-- ---------------------------------------------------------------------------
create table if not exists public.stripe_financial_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  stripe_event_id text references public.stripe_webhook_events (stripe_event_id) on delete set null,
  category text not null,
  amount_cents bigint,
  currency text,
  charge_id text,
  metadata jsonb default '{}'::jsonb,
  audit_event_id uuid references public.audit_events (id) on delete set null
);

create index if not exists idx_stripe_financial_events_time on public.stripe_financial_events (created_at desc);

-- ---------------------------------------------------------------------------
-- API request logs (sampled)
-- ---------------------------------------------------------------------------
create table if not exists public.api_request_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  method text not null,
  path text not null,
  status_code int not null,
  latency_ms int not null,
  user_id uuid references auth.users (id) on delete set null,
  request_id text
);

create index if not exists idx_api_request_logs_occurred on public.api_request_logs (occurred_at desc);
create index if not exists idx_api_request_logs_user on public.api_request_logs (user_id, occurred_at desc);

-- Admin analytics RPC (SQL language — must be created after api_request_logs exists).
create or replace function public.admin_analytics_api_latency(
  p_from timestamptz,
  p_to timestamptz,
  p_limit int default 40
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'path', s.path,
          'n', s.n,
          'p50_ms', round(s.p50::numeric, 2),
          'p95_ms', round(s.p95::numeric, 2),
          'avg_ms', round(s.avg_ms::numeric, 2)
        )
        order by s.n desc
      )
      from (
        select
          path,
          count(*)::bigint as n,
          percentile_cont(0.5) within group (order by latency_ms) as p50,
          percentile_cont(0.95) within group (order by latency_ms) as p95,
          avg(latency_ms::double precision) as avg_ms
        from public.api_request_logs
        where occurred_at >= p_from and occurred_at <= p_to
        group by path
        order by count(*) desc
        limit greatest(1, least(coalesce(p_limit, 40), 200))
      ) s
    ),
    '[]'::jsonb
  );
$$;

revoke all on function public.admin_analytics_api_latency(timestamptz, timestamptz, int) from public;
grant execute on function public.admin_analytics_api_latency(timestamptz, timestamptz, int) to service_role;

-- ---------------------------------------------------------------------------
-- Storage access (upload trigger + optional download reporting)
-- ---------------------------------------------------------------------------
create table if not exists public.storage_access_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  bucket_id text not null,
  object_path text not null,
  action text not null check (action in ('upload', 'download')),
  bytes bigint,
  owner_id uuid references auth.users (id) on delete set null
);

create index if not exists idx_storage_access_events_time on public.storage_access_events (created_at desc);
create index if not exists idx_storage_access_events_owner on public.storage_access_events (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Content moderation decisions
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject_type text not null,
  subject_id text not null,
  moderator_user_id uuid references auth.users (id) on delete set null,
  decision text not null,
  reason text,
  metadata jsonb default '{}'::jsonb,
  audit_event_id uuid references public.audit_events (id) on delete set null
);

create index if not exists idx_moderation_decisions_time on public.moderation_decisions (created_at desc);

-- ---------------------------------------------------------------------------
-- Client UI telemetry (batched; shorter retention)
-- ---------------------------------------------------------------------------
create table if not exists public.client_event_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  events jsonb not null,
  ip text,
  user_agent text
);

create index if not exists idx_client_event_batches_time on public.client_event_batches (created_at desc);

-- ---------------------------------------------------------------------------
-- Read current chain tip (for verification / repair tools)
-- ---------------------------------------------------------------------------
create or replace function public.get_audit_chain_tip()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select last_row_hash from public.audit_chain_state where id = 1;
$$;

revoke all on function public.get_audit_chain_tip() from public;
grant execute on function public.get_audit_chain_tip() to service_role;

-- ---------------------------------------------------------------------------
-- Storage upload logging (storage schema)
-- ---------------------------------------------------------------------------
create or replace function public.log_storage_object_upload()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sz text;
  b bigint;
begin
  sz := new.metadata->>'size';
  if sz is not null and sz ~ '^[0-9]+$' then
    b := sz::bigint;
  else
    b := null;
  end if;
  insert into public.storage_access_events (
    bucket_id, object_path, action, bytes, owner_id
  ) values (
    new.bucket_id,
    new.name,
    'upload',
    b,
    new.owner
  );
  return new;
exception
  when others then
    return new;
end;
$$;

drop trigger if exists storage_objects_audit_upload on storage.objects;
create trigger storage_objects_audit_upload
  after insert on storage.objects
  for each row execute function public.log_storage_object_upload();

-- ---------------------------------------------------------------------------
-- RLS: block anon/authenticated direct access
-- ---------------------------------------------------------------------------
alter table public.audit_events enable row level security;
alter table public.auth_security_events enable row level security;
alter table public.profile_field_changes enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_financial_events enable row level security;
alter table public.api_request_logs enable row level security;
alter table public.storage_access_events enable row level security;
alter table public.moderation_decisions enable row level security;
alter table public.client_event_batches enable row level security;

create policy "deny all audit_events" on public.audit_events for all using (false) with check (false);
create policy "deny all auth_security_events" on public.auth_security_events for all using (false) with check (false);
create policy "deny all profile_field_changes" on public.profile_field_changes for all using (false) with check (false);
create policy "deny all credit_ledger" on public.credit_ledger for all using (false) with check (false);
create policy "deny all stripe_webhook_events" on public.stripe_webhook_events for all using (false) with check (false);
create policy "deny all stripe_financial_events" on public.stripe_financial_events for all using (false) with check (false);
create policy "deny all api_request_logs" on public.api_request_logs for all using (false) with check (false);
create policy "deny all storage_access_events" on public.storage_access_events for all using (false) with check (false);
create policy "deny all moderation_decisions" on public.moderation_decisions for all using (false) with check (false);
create policy "deny all client_event_batches" on public.client_event_batches for all using (false) with check (false);

-- chain state: no client access
alter table public.audit_chain_state enable row level security;
create policy "deny all audit_chain_state" on public.audit_chain_state for all using (false) with check (false);
