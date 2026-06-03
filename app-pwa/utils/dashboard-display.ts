import { S } from '~/utils/strings'
import type { DashboardMetricScalar, ProviderBenchmarkReason } from '~/utils/dashboard-types'

export function isMetricInsufficient(m: DashboardMetricScalar): boolean {
  return Boolean(m.insufficientData || m.value === undefined)
}

export function displayDashboardScalar(m: DashboardMetricScalar, decimals: number): string {
  if (isMetricInsufficient(m)) return S.dashboardInsufficientData
  return m.value!.toFixed(decimals)
}

export function displayDashboardScalarInt(m: DashboardMetricScalar): string {
  if (isMetricInsufficient(m)) return S.dashboardInsufficientData
  return String(Math.round(m.value!))
}

export function displayDashboardConversion(m: DashboardMetricScalar): string {
  if (!m.insufficientData && m.value !== undefined) return `${m.value.toFixed(1)} %`
  if (m.reason === 'no_views') return S.dashboardConversionNoViews
  return S.dashboardInsufficientData
}

/** Conversion % when profile view count is known (covers stale API payloads). */
/** Job offer conversion % (applicants / unique detail viewers). */
export function resolveJobConversionDisplay(
  uniqueViewers: DashboardMetricScalar,
  conversionRate: DashboardMetricScalar | undefined,
): { text: string; insufficient: boolean } {
  const viewers = uniqueViewers.value ?? 0
  const hasViewers = !isMetricInsufficient(uniqueViewers) && viewers > 0
  if (!hasViewers) {
    const m = conversionRate ?? { insufficientData: true, reason: 'no_views' }
    return { text: displayDashboardConversion(m), insufficient: true }
  }
  if (
    conversionRate &&
    !conversionRate.insufficientData &&
    conversionRate.value !== undefined
  ) {
    return { text: `${conversionRate.value.toFixed(1)} %`, insufficient: false }
  }
  const pct = conversionRate?.value ?? 0
  return { text: `${pct.toFixed(1)} %`, insufficient: false }
}

export function resolveProviderConversionDisplay(
  profileViews: DashboardMetricScalar,
  conversionRate: DashboardMetricScalar | undefined,
): { text: string; insufficient: boolean } {
  const views = profileViews.value ?? 0
  const hasViews = !isMetricInsufficient(profileViews) && views > 0
  if (!hasViews) {
    const m = conversionRate ?? { insufficientData: true, reason: 'no_views' }
    return { text: displayDashboardConversion(m), insufficient: true }
  }
  if (
    conversionRate &&
    !conversionRate.insufficientData &&
    conversionRate.value !== undefined
  ) {
    return { text: `${conversionRate.value.toFixed(1)} %`, insufficient: false }
  }
  const pct = conversionRate?.value ?? 0
  return { text: `${pct.toFixed(1)} %`, insufficient: false }
}

export function displayDashboardRating(m: DashboardMetricScalar, decimals: number): string {
  if (!m.insufficientData && m.value !== undefined) return m.value.toFixed(decimals)
  if (m.reason === 'no_reviews') return S.dashboardRatingNoReviews
  return S.dashboardInsufficientData
}

export function resolveProviderRatingDisplay(
  rating: DashboardMetricScalar | undefined,
  decimals: number,
): { text: string; insufficient: boolean; isAllTime: boolean } {
  const m = rating ?? { insufficientData: true }
  if (!m.insufficientData && m.value !== undefined) {
    return {
      text: m.value.toFixed(decimals),
      insufficient: false,
      isAllTime: m.reason === 'all_time',
    }
  }
  if (m.reason === 'no_reviews') {
    return { text: S.dashboardRatingNoReviews, insufficient: true, isAllTime: false }
  }
  return { text: S.dashboardInsufficientData, insufficient: true, isAllTime: false }
}

export function isDashboardSeriesEmpty(points: { value: number }[]): boolean {
  if (!points.length) return true
  return points.every((p) => p.value === 0)
}

export function areDashboardSeriesEmpty(...series: { value: number }[][]): boolean {
  return series.every((points) => isDashboardSeriesEmpty(points))
}

export function providerBenchmarkMessage(reason: ProviderBenchmarkReason | undefined): string {
  if (reason === 'no_sector') return S.dashboardBenchmarkNoSector
  if (reason === 'no_reviews') return S.dashboardBenchmarkNoReviews
  if (reason === 'no_peers') return S.dashboardBenchmarkNoPeers
  return S.dashboardInsufficientData
}
