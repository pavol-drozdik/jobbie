-- Extended admin analytics RPCs (service_role only). Europe/Bratislava for daily buckets.

-- Search aggregates for admin dashboard (jobs entity)
create or replace function public.search_analytics_summary(p_since timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'total_searches',
      (select count(*)::bigint from search_query_logs s
       where s.created_at >= p_since and s.entity = 'jobs'),
    'zero_result_searches',
      (select count(*)::bigint from search_query_logs s
       where s.created_at >= p_since and s.entity = 'jobs' and s.result_count = 0),
    'zero_result_rate',
      case
        when (select count(*) from search_query_logs s
              where s.created_at >= p_since and s.entity = 'jobs') > 0
        then round(
          (select count(*)::numeric from search_query_logs s
           where s.created_at >= p_since and s.entity = 'jobs' and s.result_count = 0)
          / (select count(*)::numeric from search_query_logs s
             where s.created_at >= p_since and s.entity = 'jobs'),
          4
        )
        else null
      end
  );
$$;

-- Daily timeseries (UTC calendar days)
create or replace function public.admin_analytics_timeseries_daily(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with days as (
    select d::date as day
    from generate_series(
      date_trunc('day', p_from at time zone 'UTC'),
      date_trunc('day', p_to at time zone 'UTC'),
      interval '1 day'
    ) d
  ),
  signups as (
    select date_trunc('day', p.created_at at time zone 'UTC')::date as day, count(*)::bigint as n
    from profiles p
    where p.created_at >= p_from and p.created_at <= p_to and not p.is_deleted
    group by 1
  ),
  applications_daily as (
    select date_trunc('day', a.created_at at time zone 'UTC')::date as day, count(*)::bigint as n
    from public.applications a
    where a.created_at >= p_from and a.created_at <= p_to and not a.is_deleted
    group by 1
  ),
  hires_daily as (
    select date_trunc('day', a.created_at at time zone 'UTC')::date as day, count(*)::bigint as n
    from public.applications a
    where not a.is_deleted
      and a.status = 'accepted'
      and a.created_at >= p_from
      and a.created_at <= p_to
    group by 1
  ),
  credit_purchases as (
    select date_trunc('day', cl.created_at at time zone 'UTC')::date as day,
      count(distinct cl.user_id)::bigint as n
    from credit_ledger cl
    where cl.created_at >= p_from and cl.created_at <= p_to
      and cl.delta > 0
      and (
        cl.reason = 'credit_package_purchase'
        or cl.reason = 'stripe_payment_intent'
        or cl.transaction_type = 'purchase'
      )
    group by 1
  ),
  jobs_published as (
    select date_trunc('day', j.created_at at time zone 'UTC')::date as day, count(*)::bigint as n
    from job_offers j
    where j.created_at >= p_from and j.created_at <= p_to
      and not j.is_deleted and j.is_active
    group by 1
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'day', to_char(days.day, 'YYYY-MM-DD'),
        'signups', coalesce(s.n, 0),
        'applications', coalesce(ap.n, 0),
        'accepted_hires', coalesce(h.n, 0),
        'credit_purchases_distinct_users', coalesce(cp.n, 0),
        'jobs_published', coalesce(jp.n, 0)
      )
      order by days.day
    ),
    '[]'::jsonb
  )
  from days
  left join signups s on s.day = days.day
  left join applications_daily ap on ap.day = days.day
  left join hires_daily h on h.day = days.day
  left join credit_purchases cp on cp.day = days.day
  left join jobs_published jp on jp.day = days.day;
$$;

create or replace function public.admin_analytics_marketplace_snapshot(
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
    'jobs_published_in_period',
      (select count(*)::bigint from job_offers j
       where not j.is_deleted and j.is_active
         and j.created_at >= p_from and j.created_at <= p_to),
    'active_jobs_now',
      (select count(*)::bigint from job_offers j
       where not j.is_deleted and j.is_active),
    'company_ads_published_in_period',
      (select count(*)::bigint from company_ads ca
       where ca.status = 'active'
         and ca.created_at >= p_from and ca.created_at <= p_to),
    'active_company_ads_now',
      (select count(*)::bigint from company_ads ca
       where ca.status = 'active' and ca.ends_at is not null and ca.ends_at > now()),
    'cvs_visible_to_employers_now',
      (select count(*)::bigint from cvs c where c.visible_to_employers = true),
    'blog_posts_published_in_period',
      (select count(*)::bigint from blog_posts bp
       where bp.status = 'published'
         and bp.published_at >= p_from and bp.published_at <= p_to),
    'blog_posts_published_now',
      (select count(*)::bigint from blog_posts bp where bp.status = 'published'),
    'chat_messages_in_period',
      (select count(*)::bigint from chat_messages cm
       where cm.created_at >= p_from and cm.created_at <= p_to),
    'content_reports_open_now',
      (select count(*)::bigint from content_reports cr where cr.status = 'open'),
    'content_reports_opened_in_period',
      (select count(*)::bigint from content_reports cr
       where cr.created_at >= p_from and cr.created_at <= p_to and cr.status = 'open')
  );
$$;

create or replace function public.admin_analytics_users_breakdown(
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
    'signups_company',
      (select count(*)::bigint from profiles p
       where p.created_at >= p_from and p.created_at <= p_to
         and not p.is_deleted and p.role = 'company'),
    'signups_individual',
      (select count(*)::bigint from profiles p
       where p.created_at >= p_from and p.created_at <= p_to
         and not p.is_deleted and p.role = 'individual'),
    'active_users_distinct',
      (select count(distinct l.user_id)::bigint from api_request_logs l
       where l.occurred_at >= p_from and l.occurred_at <= p_to
         and l.user_id is not null),
    'suspended_accounts_now',
      (select count(*)::bigint from profiles p
       where p.account_status = 'suspended' and not p.is_deleted),
    'closed_accounts_now',
      (select count(*)::bigint from profiles p
       where p.account_status = 'closed' and not p.is_deleted)
  );
$$;

create or replace function public.admin_analytics_revenue_period(
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
    'credit_pack_purchases_count',
      (select count(*)::bigint from stripe_credit_fulfillments scf
       where scf.created_at >= p_from and scf.created_at <= p_to),
    'credit_pack_credits_sold',
      (select coalesce(sum(scf.credits), 0)::bigint from stripe_credit_fulfillments scf
       where scf.created_at >= p_from and scf.created_at <= p_to),
    'new_subscriptions_in_period',
      (select count(*)::bigint from user_subscriptions us
       where us.created_at >= p_from and us.created_at <= p_to),
    'subscription_canceled_in_period',
      (select count(*)::bigint from user_subscriptions us
       where us.status = 'canceled'
         and us.updated_at >= p_from and us.updated_at <= p_to)
  );
$$;

-- Searches per day for chart
create or replace function public.search_analytics_daily(p_since timestamptz)
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
          'day', to_char(d.day, 'YYYY-MM-DD'),
          'searches', d.searches,
          'zero_results', d.zero_results
        )
        order by d.day
      )
      from (
        select
          date_trunc('day', s.created_at at time zone 'UTC')::date as day,
          count(*)::bigint as searches,
          count(*) filter (where s.result_count = 0)::bigint as zero_results
        from search_query_logs s
        where s.created_at >= p_since and s.entity = 'jobs'
        group by 1
      ) d
    ),
    '[]'::jsonb
  );
$$;

revoke all on function public.search_analytics_summary(timestamptz) from public;
revoke all on function public.admin_analytics_timeseries_daily(timestamptz, timestamptz) from public;
revoke all on function public.admin_analytics_marketplace_snapshot(timestamptz, timestamptz) from public;
revoke all on function public.admin_analytics_users_breakdown(timestamptz, timestamptz) from public;
revoke all on function public.admin_analytics_revenue_period(timestamptz, timestamptz) from public;
revoke all on function public.search_analytics_daily(timestamptz) from public;

grant execute on function public.search_analytics_summary(timestamptz) to service_role;
grant execute on function public.admin_analytics_timeseries_daily(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_analytics_marketplace_snapshot(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_analytics_users_breakdown(timestamptz, timestamptz) to service_role;
grant execute on function public.admin_analytics_revenue_period(timestamptz, timestamptz) to service_role;
grant execute on function public.search_analytics_daily(timestamptz) to service_role;
