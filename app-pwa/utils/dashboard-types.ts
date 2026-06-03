export type DashboardMetricScalar = {
  insufficientData: boolean
  value?: number
  reason?: string
}

/**
 * Time-series point returned by the customer/provider dashboards.
 * `label` is the canonical bucket identifier (YYYY-MM for month buckets or
 * YYYY-MM-DD for day buckets). `month` is kept for back-compat with older clients.
 */
export type DashboardTimePoint = { label: string; month: string; value: number }

export type DashboardDayPoint = { day: string; value: number }

export type DashboardCategoryBar = { label: string; count: number }

export type DashboardPeriodPreset = '1d' | '7d' | '30d' | 'custom'

export type JobStatsPayload = {
  meta: { from: string; to: string; jobId: string; jobTitle: string }
  simple: {
    applicants: DashboardMetricScalar
    uniqueViewers: DashboardMetricScalar
    impressions: DashboardMetricScalar
    conversionRate: DashboardMetricScalar
  }
  complex: {
    avgTimeToHireDays: DashboardMetricScalar
    lineApplicants: DashboardDayPoint[]
  }
}

export type CustomerDashboardPayload = {
  meta: { from: string; to: string }
  simple: {
    avgApplicantsPerListing: DashboardMetricScalar
    avgRating: DashboardMetricScalar
  }
  complex: {
    avgTimeToHireDays: DashboardMetricScalar
    barCategories: DashboardCategoryBar[]
    lineApplicants: DashboardTimePoint[]
    lineRating: DashboardTimePoint[]
  }
}

export type ProviderBenchmarkReason = 'no_sector' | 'no_reviews' | 'no_peers'

export type ProviderBenchmark = {
  insufficientData: boolean
  reason?: ProviderBenchmarkReason
  yourAverage?: number
  categoryAverage?: number
}

export type ProviderDashboardPayload = {
  meta: { from: string; to: string }
  simple: {
    profileViews: DashboardMetricScalar
    conversionRate: DashboardMetricScalar
    avgRating: DashboardMetricScalar
  }
  complex: {
    barTopCategories: DashboardCategoryBar[]
    lineViews: DashboardTimePoint[]
    lineContacts: DashboardTimePoint[]
    lineRating: DashboardTimePoint[]
    benchmark: ProviderBenchmark
  }
}

export function formatDashboardMetric(m: DashboardMetricScalar): string {
  if (m.insufficientData || m.value === undefined) return ''
  return String(m.value)
}
