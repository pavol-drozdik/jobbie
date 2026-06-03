import { resolveLegacyAppPath } from '~/utils/app-routes'

export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const targetPath = resolveLegacyAppPath(url.pathname)
  if (!targetPath) return

  const search = url.search || ''
  return sendRedirect(event, `${targetPath}${search}`, 301)
})
