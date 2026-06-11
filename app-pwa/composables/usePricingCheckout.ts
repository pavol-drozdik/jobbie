import type { RouteLocationRaw } from 'vue-router'
import { canPurchaseBilling } from '~/utils/billing-eligibility'

// Stripe/credit checkout: company accounts or individuals with customer/provider roles.
export function usePricingCheckout(returnPath = '/cennik') {
  const { user, profile, session } = useAuth()
  const route = useRoute()

  const isEmployer = computed((): boolean => {
    const billingProfile = profile.value ?? (user.value ? { role: user.value.role } : null)
    return canPurchaseBilling(billingProfile)
  })

  function loginRedirect(): RouteLocationRaw {
    return {
      path: '/auth/login',
      query: { redirect: route.fullPath || returnPath },
    }
  }

  function requireEmployerCheckout(onReady: () => void | Promise<void>): void {
    if (!user.value) {
      void navigateTo(loginRedirect())
      return
    }
    if (!isEmployer.value) {
      return
    }
    if (!session.value?.access_token) {
      void navigateTo(loginRedirect())
      return
    }
    void onReady()
  }

  return {
    user,
    session,
    isEmployer,
    loginRedirect,
    requireEmployerCheckout,
  }
}
