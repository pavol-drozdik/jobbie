import type { AdminAnalyticsSummary } from '../types/analytics'
import { csvEscape, downloadTextFile } from './csv-download'

export function exportAnalyticsSummaryCsv(summary: AdminAnalyticsSummary): void {
  const lines: string[] = []
  lines.push('section,metric,value')

  const f = summary.funnel
  if (f) {
    lines.push(['funnel', 'signups', f.signups].map(csvEscape).join(','))
    lines.push(
      ['funnel', 'credit_purchases_distinct_users', f.credit_purchases_distinct_users]
        .map(csvEscape)
        .join(','),
    )
    lines.push(['funnel', 'applicants_distinct', f.applicants_distinct].map(csvEscape).join(','))
    lines.push(['funnel', 'hires_distinct', f.hires_distinct].map(csvEscape).join(','))
  }

  for (const row of summary.timeseries_daily ?? []) {
    lines.push(
      [
        'timeseries_daily',
        row.day,
        `signups=${row.signups};applications=${row.applications};jobs_published=${row.jobs_published}`,
      ]
        .map(csvEscape)
        .join(','),
    )
  }

  const stamp = new Date().toISOString().slice(0, 10)
  downloadTextFile(`jobbie-analytics-${stamp}.csv`, lines.join('\n'))
}
