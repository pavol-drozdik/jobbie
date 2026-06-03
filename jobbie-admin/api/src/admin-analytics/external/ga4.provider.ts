import { google } from 'googleapis';
import type { Ga4ExternalDto } from './external-analytics.dto';
import { getGoogleAuthClient, isGoogleAnalyticsConfigured } from './google-auth.util';
import { toGoogleDate } from '../analytics-date-range.util';

export { isGoogleAnalyticsConfigured };

export async function fetchGa4Metrics(
  fromIso: string,
  toIso: string,
): Promise<Ga4ExternalDto> {
  const propertyId = process.env.GA4_PROPERTY_ID!.trim();
  const auth = getGoogleAuthClient();
  const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });

  const { data } = await analyticsdata.properties.runReport({
    property: `properties/${propertyId}`,
    requestBody: {
      dateRanges: [
        {
          startDate: toGoogleDate(fromIso),
          endDate: toGoogleDate(toIso),
        },
      ],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
        { name: 'bounceRate' },
      ],
    },
  });

  const row = data.rows?.[0]?.metricValues ?? [];
  const num = (i: number) => {
    const v = row[i]?.value;
    const n = v != null ? Number(v) : NaN;
    return Number.isFinite(n) ? n : 0;
  };
  const numOrNull = (i: number) => {
    const v = row[i]?.value;
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    active_users: num(0),
    sessions: num(1),
    page_views: num(2),
    engagement_rate: numOrNull(3),
    bounce_rate: numOrNull(4),
  };
}

export function ga4DashboardLink(): string | null {
  if (!isGoogleAnalyticsConfigured()) return null;
  const propertyId = process.env.GA4_PROPERTY_ID!.trim();
  return `https://analytics.google.com/analytics/web/#/p${propertyId}/reports/intelligenthome`;
}
