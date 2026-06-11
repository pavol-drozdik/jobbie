export type BillingPurchaseProfile = {
  role?: 'company' | 'individual' | null
  customer_role?: boolean
  provider_role?: boolean
}

/** Credits/subscriptions: company accounts or individuals with customer/provider roles. */
export function canPurchaseBilling(profile: BillingPurchaseProfile | null | undefined): boolean {
  if (!profile) return false
  if (profile.role === 'company') return true
  return Boolean(profile.customer_role) || Boolean(profile.provider_role)
}
