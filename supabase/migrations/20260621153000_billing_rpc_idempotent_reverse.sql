-- Restore idempotent spend_credits (with lot_id), grant idempotency on PI/invoice,
-- and reverse_spend_for_ref for publish-flow rollback.

alter table public.credit_ledger
  add column if not exists stripe_invoice_id text;

-- Idempotent credit reversal per original spend ref
create unique index if not exists idx_credit_ledger_reversal_ref_unique
  on public.credit_ledger (user_id, ref_type, ref_id)
  where transaction_type = 'adjustment'
    and ref_type = 'spend_reversal';

create unique index if not exists uq_credit_ledger_stripe_invoice_grant
  on public.credit_ledger (stripe_invoice_id)
  where stripe_invoice_id is not null
    and delta > 0;

-- spend_credits: idempotent ref + lot_id traceability
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
  v_primary_lot_id uuid;
  v_existing jsonb;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  if p_ref_type is not null and p_ref_id is not null then
    select jsonb_build_object(
      'balance_after', cl.balance_after,
      'ledger_id', cl.id,
      'lot_id', cl.lot_id
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
    if v_primary_lot_id is null then
      v_primary_lot_id := v_lot.id;
    end if;
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

  insert into credit_ledger (
    user_id, delta, balance_after, reason, ref_type, ref_id,
    audit_event_id, lot_id, transaction_type
  )
  values (
    p_user_id, -p_amount, v_balance, p_reason, p_ref_type, p_ref_id,
    p_audit_event_id, v_primary_lot_id, 'spend'
  )
  returning id into v_ledger_id;

  return jsonb_build_object(
    'balance_after', v_balance,
    'ledger_id', v_ledger_id,
    'lot_id', v_primary_lot_id
  );
exception
  when unique_violation then
    if p_ref_type is not null and p_ref_id is not null then
      select jsonb_build_object(
        'balance_after', cl.balance_after,
        'ledger_id', cl.id,
        'lot_id', cl.lot_id
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

-- grant_credits: idempotent when payment_intent_id or stripe_invoice_id is set
create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_source text,
  p_reason text,
  p_expires_at timestamptz default null,
  p_grant_period text default null,
  p_stripe_invoice_id text default null,
  p_payment_intent_id text default null,
  p_audit_event_id uuid default null,
  p_ref_type text default null,
  p_ref_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot_id uuid;
  v_balance integer;
  v_tx text;
  v_existing jsonb;
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;
  if p_source not in ('purchase', 'subscription_grant', 'free_grant', 'adjustment') then
    raise exception 'INVALID_SOURCE' using errcode = 'P0001';
  end if;

  if p_payment_intent_id is not null then
    select jsonb_build_object(
      'balance_after', cl.balance_after,
      'lot_id', cl.lot_id
    ) into v_existing
    from credit_ledger cl
    where cl.payment_intent_id = p_payment_intent_id
      and cl.user_id = p_user_id
      and cl.delta > 0
    limit 1;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  if p_stripe_invoice_id is not null then
    select jsonb_build_object(
      'balance_after', cl.balance_after,
      'lot_id', cl.lot_id
    ) into v_existing
    from credit_ledger cl
    where cl.stripe_invoice_id = p_stripe_invoice_id
      and cl.user_id = p_user_id
      and cl.delta > 0
    limit 1;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  insert into credit_lots (
    user_id, amount_remaining, amount_initial, source,
    expires_at, grant_period, stripe_invoice_id, payment_intent_id
  ) values (
    p_user_id, p_amount, p_amount, p_source,
    p_expires_at, p_grant_period, p_stripe_invoice_id, p_payment_intent_id
  ) returning id into v_lot_id;

  select coalesce(sum(amount_remaining), 0)::integer into v_balance
  from credit_lots
  where user_id = p_user_id
    and amount_remaining > 0
    and (expires_at is null or expires_at > now());

  update profiles set credits = v_balance where id = p_user_id;

  v_tx := case p_source
    when 'purchase' then 'purchase'
    when 'adjustment' then 'adjustment'
    when 'free_grant' then 'subscription_grant'
    else 'subscription_grant'
  end;

  insert into credit_ledger (
    user_id, delta, balance_after, reason, ref_type, ref_id,
    audit_event_id, lot_id, transaction_type, payment_intent_id, stripe_invoice_id
  ) values (
    p_user_id, p_amount, v_balance, p_reason, p_ref_type, p_ref_id,
    p_audit_event_id, v_lot_id, v_tx, p_payment_intent_id, p_stripe_invoice_id
  );

  return jsonb_build_object('balance_after', v_balance, 'lot_id', v_lot_id);
exception
  when unique_violation then
    if p_payment_intent_id is not null then
      select jsonb_build_object(
        'balance_after', cl.balance_after,
        'lot_id', cl.lot_id
      ) into v_existing
      from credit_ledger cl
      where cl.payment_intent_id = p_payment_intent_id
        and cl.user_id = p_user_id
        and cl.delta > 0
      limit 1;
      if v_existing is not null then
        return v_existing;
      end if;
    end if;
    if p_stripe_invoice_id is not null then
      select jsonb_build_object(
        'balance_after', cl.balance_after,
        'lot_id', cl.lot_id
      ) into v_existing
      from credit_ledger cl
      where cl.stripe_invoice_id = p_stripe_invoice_id
        and cl.user_id = p_user_id
        and cl.delta > 0
      limit 1;
      if v_existing is not null then
        return v_existing;
      end if;
    end if;
    raise;
end;
$$;

-- reverse_spend_for_ref: compensating grant linked to original spend ref
create or replace function public.reverse_spend_for_ref(
  p_user_id uuid,
  p_ref_type text,
  p_ref_id text,
  p_reason text,
  p_audit_event_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spend record;
  v_reversal_ref text;
  v_existing jsonb;
  v_amount integer;
begin
  if p_ref_type is null or p_ref_id is null then
    raise exception 'REF_REQUIRED' using errcode = 'P0001';
  end if;

  v_reversal_ref := p_ref_type || ':' || p_ref_id;

  select jsonb_build_object(
    'balance_after', cl.balance_after,
    'ledger_id', cl.id,
    'reversed', true
  ) into v_existing
  from credit_ledger cl
  where cl.user_id = p_user_id
    and cl.ref_type = 'spend_reversal'
    and cl.ref_id = v_reversal_ref
    and cl.transaction_type = 'adjustment'
  limit 1;
  if v_existing is not null then
    return v_existing;
  end if;

  select cl.id, abs(cl.delta)::integer as amount
  into v_spend
  from credit_ledger cl
  where cl.user_id = p_user_id
    and cl.ref_type = p_ref_type
    and cl.ref_id = p_ref_id
    and cl.transaction_type = 'spend'
  limit 1;

  if v_spend.id is null then
    return jsonb_build_object('skipped', true, 'reason', 'no_spend');
  end if;

  v_amount := v_spend.amount;
  if v_amount < 1 then
    return jsonb_build_object('skipped', true, 'reason', 'zero_amount');
  end if;

  return public.grant_credits(
    p_user_id,
    v_amount,
    'adjustment',
    p_reason,
    null,
    null,
    null,
    null,
    p_audit_event_id,
    'spend_reversal',
    v_reversal_ref
  );
exception
  when unique_violation then
    select jsonb_build_object(
      'balance_after', cl.balance_after,
      'ledger_id', cl.id,
      'reversed', true
    ) into v_existing
    from credit_ledger cl
    where cl.user_id = p_user_id
      and cl.ref_type = 'spend_reversal'
      and cl.ref_id = v_reversal_ref
      and cl.transaction_type = 'adjustment'
    limit 1;
    if v_existing is not null then
      return v_existing;
    end if;
    raise;
end;
$$;

grant execute on function public.spend_credits(
  uuid, integer, text, text, text, uuid
) to service_role;

grant execute on function public.grant_credits(
  uuid, integer, text, text, timestamptz, text, text, text, uuid, text, text
) to service_role;

revoke all on function public.reverse_spend_for_ref(uuid, text, text, text, uuid) from public;
grant execute on function public.reverse_spend_for_ref(uuid, text, text, text, uuid) to service_role;
