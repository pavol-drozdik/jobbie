import { ROUTES } from '~/utils/app-routes'

// SECURITY: Hides employer routes from individuals; backend must enforce company role on APIs.
export default defineNuxtRouteMiddleware(async () => {  if (import.meta.server) return
  await waitForAuthReady()
  const { user, profile } = useAuth()
  if (!user.value) {
    return
  }
  const role = profile.value?.role ?? user.value.role
  if (role !== 'company') {
    return navigateTo({ path: ROUTES.profile, replace: true })
  }
})
