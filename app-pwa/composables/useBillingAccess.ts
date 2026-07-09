import { canPurchaseBilling } from '~/utils/billing-eligibility'

/** Billing wallet visibility and purchase eligibility from activity roles. */
export function useBillingAccess() {
  const { profile } = useAuth()

  const hasBillingWalletAccess = computed(() => canPurchaseBilling(profile.value))

  return {
    hasBillingWalletAccess,
    canPurchaseBilling: hasBillingWalletAccess,
  }
}
