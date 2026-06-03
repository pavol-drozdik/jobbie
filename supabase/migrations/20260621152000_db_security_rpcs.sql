-- Credit RPC hardening: spend lot_id traceability, atomic expiration batch.

-- spend_credits: record primary consumed lot_id on ledger row
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
begin
  if p_amount < 1 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
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
end;
$$;

-- expire_due_credit_lots: atomic per-user expiration (service_role cron)
create or replace function public.expire_due_credit_lots()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_expired integer := 0;
  v_lot record;
  v_total integer;
  v_balance integer;
begin
  for v_user_id in
    select distinct cl.user_id
    from credit_lots cl
    where cl.amount_remaining > 0
      and cl.expires_at is not null
      and cl.expires_at <= now()
  loop
    perform pg_advisory_xact_lock(hashtext(v_user_id::text));

    v_total := 0;
    for v_lot in
      select id, amount_remaining
      from credit_lots
      where user_id = v_user_id
        and amount_remaining > 0
        and expires_at is not null
        and expires_at <= now()
      for update
    loop
      v_total := v_total + v_lot.amount_remaining;
      update credit_lots set amount_remaining = 0 where id = v_lot.id;
    end loop;

    if v_total < 1 then
      continue;
    end if;

    select coalesce(sum(amount_remaining), 0)::integer into v_balance
    from credit_lots
    where user_id = v_user_id
      and amount_remaining > 0
      and (expires_at is null or expires_at > now());

    update profiles set credits = v_balance where id = v_user_id;

    insert into credit_ledger (
      user_id, delta, balance_after, reason, ref_type, ref_id, transaction_type
    )
    values (
      v_user_id, -v_total, v_balance, 'credit_expiration', 'credit_lot', null, 'expiration'
    );

    v_expired := v_expired + 1;
  end loop;

  return v_expired;
end;
$$;

grant execute on function public.spend_credits(
  uuid, integer, text, text, text, uuid
) to service_role;

grant execute on function public.expire_due_credit_lots() to service_role;

-- Admin analytics: match actual purchase reason from Stripe fulfillment
create or replace function public.admin_analytics_funnel(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_signups bigint;
  v_credit_users bigint;
  v_apply_users bigint;
  v_hire_users bigint;
begin
  select count(*)::bigint into v_signups
  from profiles p
  where p.created_at >= p_from and p.created_at <= p_to and not p.is_deleted;

  select count(distinct cl.user_id)::bigint into v_credit_users
  from credit_ledger cl
  where cl.created_at >= p_from and cl.created_at <= p_to
    and cl.delta > 0
    and (
      cl.reason = 'credit_package_purchase'
      or cl.reason = 'stripe_payment_intent'
      or cl.transaction_type = 'purchase'
    );

  select count(distinct a.individual_id)::bigint into v_apply_users
  from applications a
  where a.created_at >= p_from and a.created_at <= p_to
    and not a.is_deleted;

  select count(distinct a.individual_id)::bigint into v_hire_users
  from applications a
  where not a.is_deleted
    and a.status = 'accepted'
    and a.updated_at >= p_from and a.updated_at <= p_to;

  return jsonb_build_object(
    'signups', v_signups,
    'credit_purchases_distinct_users', v_credit_users,
    'applicants_distinct', v_apply_users,
    'hires_distinct', v_hire_users,
    'conversion_signup_to_credit',
      case when v_signups > 0 then round(v_credit_users::numeric / v_signups, 6) else null end,
    'conversion_signup_to_apply',
      case when v_signups > 0 then round(v_apply_users::numeric / v_signups, 6) else null end,
    'conversion_apply_to_hire',
      case when v_apply_users > 0 then round(v_hire_users::numeric / v_apply_users, 6) else null end
  );
end;
$$;

revoke all on function public.expire_due_credit_lots() from public;
grant execute on function public.expire_due_credit_lots() to service_role;
