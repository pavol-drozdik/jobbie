export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  await waitForAuthReady()
  const { user, profile } = useAuth()
  if (!user.value) {
    const redirect =
      typeof to.fullPath === 'string' && to.fullPath.startsWith('/auth')
        ? undefined
        : to.fullPath
    return navigateTo({
      path: '/auth/login',
      query: redirect ? { redirect } : {},
      replace: true,
    })
  }
  if (!profile.value?.provider_role) {
    return navigateTo({
      path: '/nastavenia',
      query: { dashboardDenied: 'provider' },
    })
  }
})
