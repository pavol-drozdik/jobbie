import type { RouteLocationRaw } from 'vue-router'

// Stripe/credit checkout is company-only — gate before mounting payment UI.
export function usePricingCheckout(returnPath = '/cennik') {
  const { user, session } = useAuth()
  const route = useRoute()

  const isEmployer = computed(
    (): boolean => user.value?.role === 'company',
  )

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
