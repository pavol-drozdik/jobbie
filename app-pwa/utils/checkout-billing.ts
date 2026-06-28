export type CheckoutPurchaserType = 'individual' | 'company'

export type AccountRole = 'individual' | 'company'

/** Checkout purchaser type is fixed by account registration type. */
export function resolveAccountPurchaserType(
  role: AccountRole | null | undefined,
): CheckoutPurchaserType {
  return role === 'company' ? 'company' : 'individual'
}

/** Slovak IČO: 8 digits after stripping non-digits. */
export function normalizeSkIco(raw: string | null | undefined): string {
  if (raw == null) return ''
  return String(raw).replace(/\s+/g, '').replace(/\D/g, '')
}

export function isValidSkIcoFormat(raw: string | null | undefined): boolean {
  return normalizeSkIco(raw).length === 8
}

/** Billing data collected in StripePaymentForm before confirm. */
export type CheckoutBillingPayload = {
  purchaser_type: CheckoutPurchaserType
  company_name?: string | null
  registration_number?: string | null
  tax_id?: string | null
  vat_id?: string | null
  address_line1?: string | null
  address_line2?: string | null
  address_city?: string | null
  address_postal_code?: string | null
  address_country?: string | null
  billing_attestation_sk_residence?: boolean
}

const CHECKOUT_BILLING_STORAGE_PREFIX = 'jobbie:checkout-billing:'

/** Stash billing for confirm on `/platba/vysledok` (keyed by pi_/seti_ id). */
export function stashCheckoutBillingForIntent(
  intentId: string,
  billing: CheckoutBillingPayload,
): void {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(
      `${CHECKOUT_BILLING_STORAGE_PREFIX}${intentId}`,
      JSON.stringify(billing),
    )
  } catch {
    /* quota / private mode */
  }
}

export function readCheckoutBillingForIntent(
  intentId: string,
): CheckoutBillingPayload | null {
  if (!import.meta.client) return null
  try {
    const raw = sessionStorage.getItem(`${CHECKOUT_BILLING_STORAGE_PREFIX}${intentId}`)
    if (!raw) return null
    return JSON.parse(raw) as CheckoutBillingPayload
  } catch {
    return null
  }
}

export function clearCheckoutBillingForIntent(intentId: string): void {
  if (!import.meta.client) return
  try {
    sessionStorage.removeItem(`${CHECKOUT_BILLING_STORAGE_PREFIX}${intentId}`)
  } catch {
    /* ignore */
  }
}
