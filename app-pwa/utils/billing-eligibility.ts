export type BillingPurchaseProfile = {
  role?: 'company' | 'individual' | null
  customer_role?: boolean
  provider_role?: boolean
  worker_role?: boolean
}

/** Credits/subscriptions/wallet: requires customer or provider activity role. */
export function canPurchaseBilling(profile: BillingPurchaseProfile | null | undefined): boolean {
  if (!profile) return false
  return Boolean(profile.customer_role) || Boolean(profile.provider_role)
}

/** Alias for wallet visibility and navigation gating. */
export const hasBillingWalletAccess = canPurchaseBilling
