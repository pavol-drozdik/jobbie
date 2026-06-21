export type CheckoutPurchaserType = 'individual' | 'company'

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
