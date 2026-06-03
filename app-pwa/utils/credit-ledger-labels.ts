import type { AppIconName } from '~/utils/app-icons'
import { S } from '~/utils/strings'

const REASON_LABELS: Record<string, string> = {
  credit_package_purchase: S.creditLedgerReasonCreditPackagePurchase,
  monthly_plan_grant: S.creditLedgerReasonMonthlyPlanGrant,
  job_publish: S.creditLedgerReasonJobPublish,
  renew_job: S.creditLedgerReasonRenewJob,
  publish_service_profile: S.creditLedgerReasonPublishServiceProfile,
  renew_service_profile: S.creditLedgerReasonRenewServiceProfile,
  unlock_candidate_contact: S.creditLedgerReasonUnlockCandidateContact,
  contact_candidate_cv_database: S.creditLedgerReasonContactCandidateCvDatabase,
  download_candidate_cv_pdf: S.creditLedgerReasonDownloadCandidateCvPdf,
  urgent_badge: S.creditLedgerReasonUrgentBadge,
  highlighted_card: S.creditLedgerReasonHighlightedCard,
  top_category: S.creditLedgerReasonTopCategory,
  homepage_featured: S.creditLedgerReasonHomepageFeatured,
  spend_reversal: S.creditLedgerReasonSpendReversal,
  job_publish_rollback: S.creditLedgerReasonSpendReversal,
  publish_service_profile_rollback: S.creditLedgerReasonSpendReversal,
  credit_expiration: S.creditLedgerReasonCreditExpiration,
  payment_refund: S.creditLedgerReasonPaymentRefund,
}

function prettifySnakeCase(reason: string): string {
  return reason
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function formatCreditLedgerLabel(
  reason: string,
  transactionType?: string | null,
): string {
  const key = reason.trim().toLowerCase()
  if (key && REASON_LABELS[key]) {
    return REASON_LABELS[key]
  }
  if (transactionType === 'purchase') {
    return S.creditLedgerReasonPurchaseGeneric
  }
  if (transactionType === 'adjustment') {
    return S.creditLedgerReasonAdjustmentGeneric
  }
  if (transactionType === 'subscription_grant') {
    return S.creditLedgerReasonMonthlyPlanGrant
  }
  if (key) {
    return prettifySnakeCase(key)
  }
  return S.creditLedgerReasonSpendGeneric
}

export function creditLedgerIcon(
  delta: number,
  transactionType?: string | null,
): AppIconName {
  if (transactionType === 'subscription_grant') {
    return 'star'
  }
  if (transactionType === 'purchase') {
    return 'currency'
  }
  if (transactionType === 'adjustment') {
    return 'reply'
  }
  if (delta >= 0) {
    return 'check-circle'
  }
  return 'bolt'
}
