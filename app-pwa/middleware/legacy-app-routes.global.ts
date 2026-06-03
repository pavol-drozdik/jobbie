import { resolveLegacyAppPath } from '~/utils/app-routes'

export default defineNuxtRouteMiddleware((to) => {
  const targetPath = resolveLegacyAppPath(to.path)
  if (!targetPath) return

  return navigateTo(
    {
      path: targetPath,
      query: to.query,
      hash: to.hash,
    },
    { replace: true },
  )
})
