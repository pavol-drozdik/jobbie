-- Admin analytics RPCs (service_role only). Used by Nest AdminAnalyticsController.

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
    and cl.reason = 'stripe_payment_intent';

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

create or replace function public.admin_analytics_revenue()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  mrr bigint;
  n_pay int;
begin
  select
    coalesce(sum(sp.price_monthly_cents), 0)::bigint,
    count(*)::int
  into mrr, n_pay
  from user_subscriptions us
  join subscription_plans sp on sp.id = us.plan_id
  where us.status = 'active'
    and sp.price_monthly_cents > 0;

  return jsonb_build_object(
    'mrr_cents', mrr,
    'arr_cents', mrr * 12,
    'active_paying_subscribers', n_pay,
    'arpu_cents', case when n_pay > 0 then (mrr / n_pay)::bigint else 0 end
  );
end;
$$;

create or replace function public.admin_analytics_subscription_churn(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'canceled_subscriptions_in_period',
      (select count(*)::bigint
       from user_subscriptions
       where status = 'canceled'
         and updated_at >= p_from
         and updated_at <= p_to)
  );
$$;

create or replace function public.admin_analytics_cohort_weekly(p_weeks int default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb := '[]'::jsonb;
  ws timestamptz;
  we timestamptz;
  now_ts timestamptz := now();
  w int;
  signup_c bigint;
  applied_c bigint;
begin
  w := greatest(1, least(coalesce(p_weeks, 8), 24));
  for i in 0..w - 1 loop
    we := now_ts - (i * interval '7 days');
    ws := we - interval '7 days';
    select count(*)::bigint into signup_c
    from profiles p
    where p.created_at >= ws and p.created_at < we and not p.is_deleted;

    select count(distinct p.id)::bigint into applied_c
    from profiles p
    inner join applications a on a.individual_id = p.id and not a.is_deleted
    where p.created_at >= ws and p.created_at < we and not p.is_deleted
      and a.created_at >= p.created_at
      and a.created_at <= p.created_at + interval '30 days';

    result := result || jsonb_build_array(
      jsonb_build_object(
        'week_start', to_char(ws at time zone 'UTC', 'YYYY-MM-DD'),
        'week_end', to_char(we at time zone 'UTC', 'YYYY-MM-DD'),
        'signups', signup_c,
        'applied_within_30d', applied_c,
        'retention_apply_pct',
          case when signup_c > 0 then round((applied_c::numeric / signup_c) * 100, 2) else null end
      )
    );
  end loop;
  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.admin_analytics_funnel(timestamptz, timestamptz) from public;
revoke all on function public.admin_analytics_revenue() from public;
revoke all on function public.admin_analytics_subscription_churn(timestamptz, timestamptz) from public;
revoke all on function public.admin_analytics_cohort_weekly(int) from public;

grant execute on function public.admin_analytics_funnel(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_analytics_revenue() to service_role;
grant execute on function public.admin_analytics_subscription_churn(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_analytics_cohort_weekly(int) to service_role;
