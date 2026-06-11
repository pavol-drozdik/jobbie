// SECURITY: Dashboard worker routes require worker_role; APIs must enforce the same flag.
import { settingsProfilDeniedRoute } from '~/utils/dashboard-role-denied'

export default defineNuxtRouteMiddleware(async () => {
  if (import.meta.server) return
  await waitForAuthReady()
  const { user, profile } = useAuth()
  // Guest marketing pages handle logged-out UX; role applies only after sign-in.
  if (!user.value) {
    return
  }
  if (!profile.value) {
    return
  }
  if (!profile.value.worker_role) {
    return navigateTo(settingsProfilDeniedRoute('worker'))
  }
})
