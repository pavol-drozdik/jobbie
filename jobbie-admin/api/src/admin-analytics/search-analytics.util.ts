import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminAnalyticsSearchDailyRowDto,
  AdminAnalyticsSearchDto,
  AdminAnalyticsSearchQueryRowDto,
} from './admin-analytics.dto';

function mapQueryRows(rows: unknown): AdminAnalyticsSearchQueryRowDto[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return (rows as Array<{ q?: string; cnt?: unknown }>).map((r) => ({
    q: String(r.q ?? ''),
    count: Number(r.cnt ?? 0),
  }));
}

function mapDailyRows(rows: unknown): AdminAnalyticsSearchDailyRowDto[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    day: String(r.day ?? ''),
    searches: Number(r.searches ?? 0),
    zero_results: Number(r.zero_results ?? 0),
  }));
}

export async function fetchSearchAnalyticsSummary(
  client: SupabaseClient,
  options: { readonly days?: number; readonly sinceIso?: string },
): Promise<AdminAnalyticsSearchDto> {
  const since =
    options.sinceIso?.trim() ||
    new Date(
      Date.now() -
        Math.min(Math.max(options.days ?? 14, 1), 90) * 86400000,
    ).toISOString();

  const [{ data: summary }, { data: top }, { data: zero }, { data: daily }] =
    await Promise.all([
      client.rpc('search_analytics_summary', { p_since: since }),
      client.rpc('search_analytics_top_queries', {
        p_since: since,
        p_limit: 30,
      }),
      client.rpc('search_analytics_zero_result_queries', {
        p_since: since,
        p_limit: 30,
      }),
      client.rpc('search_analytics_daily', { p_since: since }),
    ]);

  const s = (summary ?? {}) as Record<string, unknown>;
  const total = Number(s.total_searches ?? 0);
  const zeroCount = Number(s.zero_result_searches ?? 0);
  let rate = s.zero_result_rate;
  if (rate == null && total > 0) {
    rate = zeroCount / total;
  }

  return {
    total_searches: total,
    zero_result_searches: zeroCount,
    zero_result_rate:
      rate == null ? null : Number(Number(rate).toFixed(4)),
    top_queries: mapQueryRows(top),
    zero_result_queries: mapQueryRows(zero),
    daily: mapDailyRows(daily),
  };
}
