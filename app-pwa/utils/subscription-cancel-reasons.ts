import { S } from '~/utils/strings'

export const SUBSCRIPTION_CANCEL_REASON_CODES = [
  'too_expensive',
  'not_using',
  'missing_features',
  'found_alternative',
  'break',
  'other',
] as const

export type SubscriptionCancelReasonCode = (typeof SUBSCRIPTION_CANCEL_REASON_CODES)[number]

const LABELS: Record<SubscriptionCancelReasonCode, string> = {
  too_expensive: S.subscriptionCancelReasonTooExpensive,
  not_using: S.subscriptionCancelReasonNotUsing,
  missing_features: S.subscriptionCancelReasonMissingFeatures,
  found_alternative: S.subscriptionCancelReasonFoundAlternative,
  break: S.subscriptionCancelReasonBreak,
  other: S.subscriptionCancelReasonOther,
}

export function subscriptionCancelReasonOptions(): Array<{
  value: SubscriptionCancelReasonCode
  label: string
}> {
  return SUBSCRIPTION_CANCEL_REASON_CODES.map((code) => ({
    value: code,
    label: LABELS[code],
  }))
}

export function isSubscriptionCancelReasonCode(
  value: string,
): value is SubscriptionCancelReasonCode {
  return (SUBSCRIPTION_CANCEL_REASON_CODES as readonly string[]).includes(value)
}

export type SubscriptionCancelFeedback = {
  reason_code: SubscriptionCancelReasonCode
  reason_detail?: string | null
}
