export type ContentReportItem = {
  id: string
  reporter_user_id: string | null
  target_type: string
  target_id: string
  reason: string
  status: string
  created_at: string
  preview_title: string | null
  preview_subtitle: string | null
  public_url: string | null
  claimed_at: string | null
  claimed_by: string | null
  age_hours: number
  escalated: boolean
}

export const REPORT_RESOLUTION_CODES = [
  'spam',
  'harassment',
  'duplicate',
  'false_report',
  'other',
] as const
