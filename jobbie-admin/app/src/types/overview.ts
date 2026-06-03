import type { AuditEventItem } from './audit'

export type AdminOverview = {
  open_reports_count: number
  kpis: {
    signups_today: number
    signups_7d: number
    jobs_published_today: number
    jobs_published_7d: number
  }
  failed_payments_count: number
  recent_audit_events: AuditEventItem[]
}
