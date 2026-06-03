// SECURITY: Client route guard only — Nest GlobalAuthGuard still enforces every API call.
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  await waitForAuthReady()
  const { user } = useAuth()
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
})
