export type AdminAnalyticsFunnelDto = {
  signups: number;
  credit_purchases_distinct_users: number;
  applicants_distinct: number;
  hires_distinct: number;
  conversion_signup_to_credit: number | null;
  conversion_signup_to_apply: number | null;
  conversion_apply_to_hire: number | null;
};

export type AdminAnalyticsRevenueDto = {
  mrr_cents: number;
  arr_cents: number;
  active_paying_subscribers: number;
  arpu_cents: number;
};

export type AdminAnalyticsChurnDto = {
  canceled_subscriptions_in_period: number;
};

export type AdminAnalyticsCohortRowDto = {
  week_start: string;
  week_end: string;
  signups: number;
  applied_within_30d: number;
  retention_apply_pct: number | null;
};

export type AdminAnalyticsLatencyRowDto = {
  path: string;
  n: number;
  p50_ms: number;
  p95_ms: number;
  avg_ms: number;
};

export type AdminAnalyticsSearchQueryRowDto = {
  q: string;
  count: number;
};

export type AdminAnalyticsSearchDto = {
  total_searches: number;
  zero_result_searches: number;
  zero_result_rate: number | null;
  top_queries: AdminAnalyticsSearchQueryRowDto[];
  zero_result_queries: AdminAnalyticsSearchQueryRowDto[];
  daily: AdminAnalyticsSearchDailyRowDto[];
};

export type AdminAnalyticsSearchDailyRowDto = {
  day: string;
  searches: number;
  zero_results: number;
};

export type AdminAnalyticsTimeseriesRowDto = {
  day: string;
  signups: number;
  applications: number;
  accepted_hires: number;
  credit_purchases_distinct_users: number;
  jobs_published: number;
};

export type AdminAnalyticsMarketplaceDto = {
  jobs_published_in_period: number;
  active_jobs_now: number;
  company_ads_published_in_period: number;
  active_company_ads_now: number;
  cvs_visible_to_employers_now: number;
  blog_posts_published_in_period: number;
  blog_posts_published_now: number;
  chat_messages_in_period: number;
  content_reports_open_now: number;
  content_reports_opened_in_period: number;
};

export type AdminAnalyticsUsersBreakdownDto = {
  signups_company: number;
  signups_individual: number;
  active_users_distinct: number;
  suspended_accounts_now: number;
  closed_accounts_now: number;
};

export type AdminAnalyticsRevenuePeriodDto = {
  credit_pack_purchases_count: number;
  credit_pack_credits_sold: number;
  new_subscriptions_in_period: number;
  subscription_canceled_in_period: number;
};

export type AdminAnalyticsSummaryDto = {
  readonly meta: {
    readonly from: string;
    readonly to: string;
    readonly cohort_weeks: number;
    readonly search_days: number;
  };
  readonly funnel: AdminAnalyticsFunnelDto | null;
  readonly revenue: AdminAnalyticsRevenueDto | null;
  readonly revenue_period: AdminAnalyticsRevenuePeriodDto | null;
  readonly churn: AdminAnalyticsChurnDto | null;
  readonly cohort_weekly: AdminAnalyticsCohortRowDto[];
  readonly api_latency_by_path: AdminAnalyticsLatencyRowDto[];
  readonly search: AdminAnalyticsSearchDto | null;
  readonly timeseries_daily: AdminAnalyticsTimeseriesRowDto[];
  readonly marketplace: AdminAnalyticsMarketplaceDto | null;
  readonly users_breakdown: AdminAnalyticsUsersBreakdownDto | null;
};
