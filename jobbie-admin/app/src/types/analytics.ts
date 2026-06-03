export type AdminAnalyticsSummary = {
  meta: {
    from: string
    to: string
    cohort_weeks: number
    search_days: number
  }
  funnel: {
    signups: number
    credit_purchases_distinct_users: number
    applicants_distinct: number
    hires_distinct: number
    conversion_signup_to_credit: number | null
    conversion_signup_to_apply: number | null
    conversion_apply_to_hire: number | null
  } | null
  revenue: {
    mrr_cents: number
    arr_cents: number
    active_paying_subscribers: number
    arpu_cents: number
  } | null
  revenue_period: {
    credit_pack_purchases_count: number
    credit_pack_credits_sold: number
    new_subscriptions_in_period: number
    subscription_canceled_in_period: number
  } | null
  churn: { canceled_subscriptions_in_period: number } | null
  cohort_weekly: Array<{
    week_start: string
    week_end: string
    signups: number
    applied_within_30d: number
    retention_apply_pct: number | null
  }>
  api_latency_by_path: Array<{
    path: string
    n: number
    p50_ms: number
    p95_ms: number
    avg_ms: number
  }>
  search: {
    total_searches: number
    zero_result_searches: number
    zero_result_rate: number | null
    top_queries: Array<{ q: string; count: number }>
    zero_result_queries: Array<{ q: string; count: number }>
    daily: Array<{ day: string; searches: number; zero_results: number }>
  } | null
  timeseries_daily: Array<{
    day: string
    signups: number
    applications: number
    accepted_hires: number
    credit_purchases_distinct_users: number
    jobs_published: number
  }>
  marketplace: {
    jobs_published_in_period: number
    active_jobs_now: number
    company_ads_published_in_period: number
    active_company_ads_now: number
    cvs_visible_to_employers_now: number
    blog_posts_published_in_period: number
    blog_posts_published_now: number
    chat_messages_in_period: number
    content_reports_open_now: number
    content_reports_opened_in_period: number
  } | null
  users_breakdown: {
    signups_company: number
    signups_individual: number
    active_users_distinct: number
    suspended_accounts_now: number
    closed_accounts_now: number
  } | null
}
