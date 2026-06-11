// SECURITY: Employer routes require customer_role; backend must enforce the same flag.
import { settingsProfilDeniedRoute } from '~/utils/dashboard-role-denied'

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
  if (!profile.value.customer_role) {
    return navigateTo(settingsProfilDeniedRoute('customer'))
  }
})
