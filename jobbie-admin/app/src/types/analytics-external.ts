export type ExternalAnalyticsSummary = {
  meta: { from: string; to: string }
  configured: {
    posthog: boolean
    ga4: boolean
    clarity: boolean
    gsc: boolean
  }
  posthog: {
    users: number
    pageviews: number
    daily_pageviews: Array<{ day: string; value: number }>
  } | null
  ga4: {
    active_users: number
    sessions: number
    page_views: number
    engagement_rate: number | null
    bounce_rate: number | null
  } | null
  clarity: {
    sessions: number
    engagement_seconds: number | null
    rage_clicks: number | null
    dead_clicks: number | null
    api_days_covered: number
  } | null
  gsc: {
    clicks: number
    impressions: number
    ctr: number | null
    position: number | null
    top_queries: Array<{
      query: string
      clicks: number
      impressions: number
      ctr: number | null
      position: number | null
    }>
  } | null
  warnings: string[]
  errors: Partial<Record<'posthog' | 'ga4' | 'clarity' | 'gsc', string>>
  dashboard_links: {
    posthog: string | null
    ga4: string | null
    clarity: string | null
    gsc: string | null
  }
}
