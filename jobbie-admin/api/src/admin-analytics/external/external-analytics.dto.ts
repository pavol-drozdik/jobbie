export type ExternalAnalyticsDailyPoint = {
  day: string;
  value: number;
};

export type PostHogExternalDto = {
  users: number;
  pageviews: number;
  daily_pageviews: ExternalAnalyticsDailyPoint[];
};

export type Ga4ExternalDto = {
  active_users: number;
  sessions: number;
  page_views: number;
  engagement_rate: number | null;
  bounce_rate: number | null;
};

export type ClarityExternalDto = {
  sessions: number;
  engagement_seconds: number | null;
  rage_clicks: number | null;
  dead_clicks: number | null;
  api_days_covered: number;
};

export type GscQueryRowDto = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
};

export type GscExternalDto = {
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
  top_queries: GscQueryRowDto[];
};

export type ExternalAnalyticsConfiguredDto = {
  posthog: boolean;
  ga4: boolean;
  clarity: boolean;
  gsc: boolean;
};

export type ExternalAnalyticsSummaryDto = {
  meta: { from: string; to: string };
  configured: ExternalAnalyticsConfiguredDto;
  posthog: PostHogExternalDto | null;
  ga4: Ga4ExternalDto | null;
  clarity: ClarityExternalDto | null;
  gsc: GscExternalDto | null;
  warnings: string[];
  errors: Partial<Record<'posthog' | 'ga4' | 'clarity' | 'gsc', string>>;
  dashboard_links: {
    posthog: string | null;
    ga4: string | null;
    clarity: string | null;
    gsc: string | null;
  };
};
