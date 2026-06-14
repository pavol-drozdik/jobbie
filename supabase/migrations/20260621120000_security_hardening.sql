-- Security hardening: protect billing/profile fields, lock down fulfillments, fix job-photos RLS.

-- ---------------------------------------------------------------------------
-- profiles: block client updates to credits, app_role, permission scopes
-- ---------------------------------------------------------------------------
create or replace function public.profiles_block_sensitive_column_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('request.jwt.claim.role', true) = 'service_role'
     or current_user = 'postgres'
     or session_user = 'service_role' then
    return new;
  end if;

  if new.credits is distinct from old.credits then
    raise exception 'profiles.credits cannot be updated directly';
  end if;

  if new.app_role is distinct from old.app_role then
    raise exception 'profiles.app_role cannot be updated directly';
  end if;

  if new.extra_permission_scopes is distinct from old.extra_permission_scopes then
    raise exception 'profiles.extra_permission_scopes cannot be updated directly';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_block_sensitive_columns on public.profiles;
create trigger profiles_block_sensitive_columns
  before update on public.profiles
  for each row
  execute function public.profiles_block_sensitive_column_updates();

-- ---------------------------------------------------------------------------
-- stripe_credit_fulfillments: backend-only (deny authenticated client access)
-- ---------------------------------------------------------------------------
drop policy if exists authenticated_own_credit_fulfillments
  on public.stripe_credit_fulfillments;

drop policy if exists service_role_full_credit_fulfillments
  on public.stripe_credit_fulfillments;

create policy "deny all stripe_credit_fulfillments"
  on public.stripe_credit_fulfillments
  for all
  using (false)
  with check (false);

revoke insert, update, delete on public.stripe_credit_fulfillments from anon, authenticated;
grant select, insert, update, delete on public.stripe_credit_fulfillments to service_role;

-- ---------------------------------------------------------------------------
-- job-photos: enforce owner folder on insert (was any authenticated path)
-- ---------------------------------------------------------------------------
drop policy if exists "job-photos: authenticated upload" on storage.objects;
create policy "job-photos: authenticated upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- credit_ledger: idempotent spend per ref (prevents double-click double charge)
-- ---------------------------------------------------------------------------
create unique index if not exists idx_credit_ledger_spend_ref_unique
  on public.credit_ledger (user_id, ref_type, ref_id)
  where ref_type is not null
    and ref_id is not null
    and transaction_type = 'spend';

-- spend_credits: return existing result when same ref already spent (idempotent)
create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_audit_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer := p_amount;
  v_lot record;
  v_take integer;
  v_balance integer;
  v_ledger_id uuid;
  v_existing jsonb;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  if p_ref_type is not null and p_ref_id is not null then
    select jsonb_build_object(
      'balance_after', cl.balance_after,
      'ledger_id', cl.id
    ) into v_existing
    from credit_ledger cl
    where cl.user_id = p_user_id
      and cl.ref_type = p_ref_type
      and cl.ref_id = p_ref_id
      and cl.transaction_type = 'spend'
    limit 1;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  if v_balance < p_amount then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  for v_lot in
    select id, amount_remaining
    from credit_lots
    where user_id = p_user_id
      and amount_remaining > 0
      and (expires_at is null or expires_at > now())
    order by expires_at nulls last, created_at asc
    for update
  loop
    exit when v_remaining <= 0;
    v_take := least(v_lot.amount_remaining, v_remaining);
    update credit_lots set amount_remaining = amount_remaining - v_take where id = v_lot.id;
    v_remaining := v_remaining - v_take;
  end loop;

  if v_remaining > 0 then
    raise exception 'INSUFFICIENT_CREDITS' using errcode = 'P0002';
  end if;

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  update profiles set credits = v_balance where id = p_user_id;

  insert into credit_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, audit_event_id, transaction_type)
  values (p_user_id, -p_amount, v_balance, p_reason, p_ref_type, p_ref_id, p_audit_event_id, 'spend')
  returning id into v_ledger_id;

  return jsonb_build_object('balance_after', v_balance, 'ledger_id', v_ledger_id);
exception
  when unique_violation then
    if p_ref_type is not null and p_ref_id is not null then
      select jsonb_build_object(
        'balance_after', cl.balance_after,
        'ledger_id', cl.id
      ) into v_existing
      from credit_ledger cl
      where cl.user_id = p_user_id
        and cl.ref_type = p_ref_type
        and cl.ref_id = p_ref_id
        and cl.transaction_type = 'spend'
      limit 1;
      if v_existing is not null then
        return v_existing;
      end if;
    end if;
    raise;
end;
$$;

-- content_reports table: 20260530110000_content_reports_and_account_status.sql

-- Idempotent credit clawback after Stripe refund (uses spend_credits ledger ref)
create or replace function public.revoke_credits_for_payment_refund(
  p_user_id uuid,
  p_payment_intent_id text,
  p_amount integer,
  p_audit_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref text := 'refund:' || p_payment_intent_id;
  v_existing jsonb;
begin
  if p_amount < 1 then
    return jsonb_build_object('skipped', true, 'reason', 'zero_amount');
  end if;

  select jsonb_build_object(
    'balance_after', cl.balance_after,
    'ledger_id', cl.id
  ) into v_existing
  from credit_ledger cl
  where cl.user_id = p_user_id
    and cl.ref_type = 'payment_refund'
    and cl.ref_id = v_ref
    and cl.transaction_type = 'spend'
  limit 1;
  if v_existing is not null then
    return v_existing;
  end if;

  return public.spend_credits(
    p_user_id,
    p_amount,
    'stripe_refund',
    'payment_refund',
    v_ref,
    p_audit_event_id
  );
exception
  when others then
    if sqlerrm like '%INSUFFICIENT_CREDITS%' then
      return jsonb_build_object('skipped', true, 'reason', 'insufficient_balance');
    end if;
    raise;
end;
$$;

revoke all on function public.revoke_credits_for_payment_refund(uuid, text, integer, uuid) from public;
grant execute on function public.revoke_credits_for_payment_refund(uuid, text, integer, uuid) to service_role;
