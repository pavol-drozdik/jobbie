import { S } from '~/utils/strings'

export const CONTENT_REPORT_REASON_IDS = [
  'spam',
  'fraud',
  'inappropriate',
  'duplicate',
  'copyright',
  'other',
] as const

export type ContentReportReasonId = (typeof CONTENT_REPORT_REASON_IDS)[number]

export function contentReportReasonLabel(id: ContentReportReasonId): string {
  const labels: Record<ContentReportReasonId, string> = {
    spam: S.contentReportReasonSpam,
    fraud: S.contentReportReasonFraud,
    inappropriate: S.contentReportReasonInappropriate,
    duplicate: S.contentReportReasonDuplicate,
    copyright: S.contentReportReasonCopyright,
    other: S.contentReportReasonOther,
  }
  return labels[id]
}

/** Final reason string stored on content_reports.reason */
export function buildContentReportReason(
  selectedId: ContentReportReasonId | '',
  otherText: string,
): string | null {
  if (!selectedId) return null
  if (selectedId === 'other') {
    const text = otherText.trim()
    if (text.length < 5) return null
    return `${S.contentReportReasonOther}: ${text}`
  }
  return contentReportReasonLabel(selectedId)
}
