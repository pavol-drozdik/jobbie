// SECURITY: Wallet and checkout require customer_role or provider_role; backend enforces the same.
import { settingsProfilDeniedRoute } from '~/utils/dashboard-role-denied'
import { canPurchaseBilling } from '~/utils/billing-eligibility'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  await waitForAuthReady()
  const { user, profile } = useAuth()
  if (!user.value) {
    return
  }
  if (!profile.value) {
    return
  }
  if (!canPurchaseBilling(profile.value)) {
    return navigateTo(settingsProfilDeniedRoute('billing'))
  }
})
