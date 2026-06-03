-- Hire metrics: applications with status accepted and created_at in range.
-- (Accurate accept-date needs application_status_history from 20260522100000.)

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
    and a.created_at >= p_from
    and a.created_at <= p_to;

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

revoke all on function public.admin_analytics_funnel(timestamptz, timestamptz) from public;
grant execute on function public.admin_analytics_funnel(timestamptz, timestamptz) to service_role;
