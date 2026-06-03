export type CheckoutPurchaserType = 'individual' | 'company'

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
}
