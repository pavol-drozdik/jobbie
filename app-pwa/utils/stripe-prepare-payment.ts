/** Result from checkout `preparePayment` after server creates a PaymentIntent. */
export interface PreparePaymentResult {
  clientSecret: string
  amount?: number
  currency?: string
  intentType?: 'payment' | 'setup'
  trialPeriodDays?: number
}

export function normalizePreparePaymentResult(
  value: string | PreparePaymentResult | null | undefined,
): PreparePaymentResult | null {
  if (!value) return null
  if (typeof value === 'string') {
    const clientSecret = value.trim()
    if (!clientSecret) return null
    return { clientSecret }
  }
  const clientSecret = value.clientSecret?.trim() ?? ''
  if (!clientSecret) return null
  return {
    clientSecret,
    amount: typeof value.amount === 'number' ? value.amount : undefined,
    currency: value.currency?.trim() || undefined,
    intentType:
      value.intentType === 'setup' || value.intentType === 'payment'
        ? value.intentType
        : undefined,
    trialPeriodDays:
      typeof value.trialPeriodDays === 'number' && value.trialPeriodDays > 0
        ? value.trialPeriodDays
        : undefined,
  }
}
