import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { parseAnalyticsDateRange } from './analytics-date-range.util';
import { fetchSearchAnalyticsSummary } from './search-analytics.util';
import type {
  AdminAnalyticsChurnDto,
  AdminAnalyticsCohortRowDto,
  AdminAnalyticsFunnelDto,
  AdminAnalyticsLatencyRowDto,
  AdminAnalyticsMarketplaceDto,
  AdminAnalyticsRevenueDto,
  AdminAnalyticsRevenuePeriodDto,
  AdminAnalyticsSummaryDto,
  AdminAnalyticsTimeseriesRowDto,
  AdminAnalyticsUsersBreakdownDto,
} from './admin-analytics.dto';

function asObject(v: unknown): Record<string, unknown> | null {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function num(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseFunnel(raw: unknown): AdminAnalyticsFunnelDto | null {
  const o = asObject(raw);
  if (!o) return null;
  return {
    signups: num(o.signups),
    credit_purchases_distinct_users: num(o.credit_purchases_distinct_users),
    applicants_distinct: num(o.applicants_distinct),
    hires_distinct: num(o.hires_distinct),
    conversion_signup_to_credit: numOrNull(o.conversion_signup_to_credit),
    conversion_signup_to_apply: numOrNull(o.conversion_signup_to_apply),
    conversion_apply_to_hire: numOrNull(o.conversion_apply_to_hire),
  };
}

function parseRevenue(raw: unknown): AdminAnalyticsRevenueDto | null {
  const o = asObject(raw);
  if (!o) return null;
  return {
    mrr_cents: num(o.mrr_cents),
    arr_cents: num(o.arr_cents),
    active_paying_subscribers: num(o.active_paying_subscribers),
    arpu_cents: num(o.arpu_cents),
  };
}

function parseChurn(raw: unknown): AdminAnalyticsChurnDto | null {
  const o = asObject(raw);
  if (!o) return null;
  return {
    canceled_subscriptions_in_period: num(o.canceled_subscriptions_in_period),
  };
}

function parseRevenuePeriod(raw: unknown): AdminAnalyticsRevenuePeriodDto | null {
  const o = asObject(raw);
  if (!o) return null;
  return {
    credit_pack_purchases_count: num(o.credit_pack_purchases_count),
    credit_pack_credits_sold: num(o.credit_pack_credits_sold),
    new_subscriptions_in_period: num(o.new_subscriptions_in_period),
    subscription_canceled_in_period: num(o.subscription_canceled_in_period),
  };
}

function parseCohort(raw: unknown): AdminAnalyticsCohortRowDto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const o = asObject(row) ?? {};
    return {
      week_start: String(o.week_start ?? ''),
      week_end: String(o.week_end ?? ''),
      signups: num(o.signups),
      applied_within_30d: num(o.applied_within_30d),
      retention_apply_pct: numOrNull(o.retention_apply_pct),
    };
  });
}

function parseLatency(raw: unknown): AdminAnalyticsLatencyRowDto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const o = asObject(row) ?? {};
    return {
      path: String(o.path ?? ''),
      n: num(o.n),
      p50_ms: num(o.p50_ms),
      p95_ms: num(o.p95_ms),
      avg_ms: num(o.avg_ms),
    };
  });
}

function parseTimeseries(raw: unknown): AdminAnalyticsTimeseriesRowDto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const o = asObject(row) ?? {};
    return {
      day: String(o.day ?? ''),
      signups: num(o.signups),
      applications: num(o.applications),
      accepted_hires: num(o.accepted_hires),
      credit_purchases_distinct_users: num(o.credit_purchases_distinct_users),
      jobs_published: num(o.jobs_published),
    };
  });
}

function parseMarketplace(raw: unknown): AdminAnalyticsMarketplaceDto | null {
  const o = asObject(raw);
  if (!o) return null;
  return {
    jobs_published_in_period: num(o.jobs_published_in_period),
    active_jobs_now: num(o.active_jobs_now),
    company_ads_published_in_period: num(o.company_ads_published_in_period),
    active_company_ads_now: num(o.active_company_ads_now),
    cvs_visible_to_employers_now: num(o.cvs_visible_to_employers_now),
    blog_posts_published_in_period: num(o.blog_posts_published_in_period),
    blog_posts_published_now: num(o.blog_posts_published_now),
    chat_messages_in_period: num(o.chat_messages_in_period),
    content_reports_open_now: num(o.content_reports_open_now),
    content_reports_opened_in_period: num(o.content_reports_opened_in_period),
  };
}

function parseUsersBreakdown(raw: unknown): AdminAnalyticsUsersBreakdownDto | null {
  const o = asObject(raw);
  if (!o) return null;
  return {
    signups_company: num(o.signups_company),
    signups_individual: num(o.signups_individual),
    active_users_distinct: num(o.active_users_distinct),
    suspended_accounts_now: num(o.suspended_accounts_now),
    closed_accounts_now: num(o.closed_accounts_now),
  };
}

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getSummary(options: {
    readonly fromIso?: string;
    readonly toIso?: string;
    readonly cohortWeeks?: number;
    readonly searchDays?: number;
  }): Promise<AdminAnalyticsSummaryDto> {
    const { fromIso, toIso } = parseAnalyticsDateRange(
      options.fromIso,
      options.toIso,
    );
    const cohortWeeks = Math.min(
      24,
      Math.max(1, Math.floor(options.cohortWeeks ?? 8)),
    );
    const searchDays = Math.min(
      90,
      Math.max(1, Math.floor(options.searchDays ?? 14)),
    );
    const client = this.supabase.getClient();

    async function rpcData(name: string, params: Record<string, unknown>) {
      const { data, error } = await client.rpc(name, params);
      if (error) {
        return null;
      }
      return data;
    }

    const [
      search,
      funnel,
      revenue,
      churn,
      cohort,
      latency,
      timeseries,
      marketplace,
      usersBreakdown,
      revenuePeriod,
    ] = await Promise.all([
      fetchSearchAnalyticsSummary(client, {
        sinceIso: fromIso,
        days: searchDays,
      }).catch(() => null),
      rpcData('admin_analytics_funnel', {
        p_from: fromIso,
        p_to: toIso,
      }),
      rpcData('admin_analytics_revenue', {}),
      rpcData('admin_analytics_subscription_churn', {
        p_from: fromIso,
        p_to: toIso,
      }),
      rpcData('admin_analytics_cohort_weekly', {
        p_weeks: cohortWeeks,
      }),
      rpcData('admin_analytics_api_latency', {
        p_from: fromIso,
        p_to: toIso,
        p_limit: 50,
      }),
      rpcData('admin_analytics_timeseries_daily', {
        p_from: fromIso,
        p_to: toIso,
      }),
      rpcData('admin_analytics_marketplace_snapshot', {
        p_from: fromIso,
        p_to: toIso,
      }),
      rpcData('admin_analytics_users_breakdown', {
        p_from: fromIso,
        p_to: toIso,
      }),
      rpcData('admin_analytics_revenue_period', {
        p_from: fromIso,
        p_to: toIso,
      }),
    ]);

    return {
      meta: {
        from: fromIso,
        to: toIso,
        cohort_weeks: cohortWeeks,
        search_days: searchDays,
      },
      funnel: parseFunnel(funnel),
      revenue: parseRevenue(revenue),
      revenue_period: parseRevenuePeriod(revenuePeriod),
      churn: parseChurn(churn),
      cohort_weekly: parseCohort(cohort),
      api_latency_by_path: parseLatency(latency),
      search,
      timeseries_daily: parseTimeseries(timeseries),
      marketplace: parseMarketplace(marketplace),
      users_breakdown: parseUsersBreakdown(usersBreakdown),
    };
  }
}
