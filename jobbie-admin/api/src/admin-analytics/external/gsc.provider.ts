import { google } from 'googleapis';
import type { GscExternalDto } from './external-analytics.dto';
import { getGoogleAuthClient, isGscConfigured } from './google-auth.util';
import { toGoogleDate } from '../analytics-date-range.util';

export { isGscConfigured };

export async function fetchGscMetrics(
  fromIso: string,
  toIso: string,
): Promise<GscExternalDto> {
  const siteUrl = process.env.GSC_SITE_URL!.trim();
  const auth = getGoogleAuthClient();
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const startDate = toGoogleDate(fromIso);
  const endDate = toGoogleDate(toIso);

  const [totalsRes, queriesRes] = await Promise.all([
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        rowLimit: 1,
      },
    }),
    searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['query'],
        rowLimit: 15,
      },
    }),
  ]);

  const totalRow = totalsRes.data.rows?.[0];
  const clicks = totalRow?.clicks ?? 0;
  const impressions = totalRow?.impressions ?? 0;
  const ctr = totalRow?.ctr ?? null;
  const position = totalRow?.position ?? null;

  const top_queries = (queriesRes.data.rows ?? []).map((row) => ({
    query: row.keys?.[0] ?? '',
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? null,
    position: row.position ?? null,
  }));

  return {
    clicks,
    impressions,
    ctr,
    position,
    top_queries,
  };
}

export function gscDashboardLink(): string | null {
  if (!isGscConfigured()) return null;
  const site = encodeURIComponent(process.env.GSC_SITE_URL!.trim());
  return `https://search.google.com/search-console/performance/search-analytics?resource_id=${site}`;
}
