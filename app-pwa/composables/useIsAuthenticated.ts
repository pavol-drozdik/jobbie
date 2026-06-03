import { hasActiveBffSession } from '~/utils/bff-csrf-state'
import { resolveApiBearerToken } from '~/utils/api-bearer-token'

/**
 * UI-only logged-in hint. Nest API remains authoritative.
 * Prefer over `session.value?.access_token` after BFF cookie bootstrap.
 */
export function useIsAuthenticated(): ComputedRef<boolean> {
  const { user, session } = useAuth()
  return computed(() => {
    if (user.value?.id) return true
    if (hasActiveBffSession()) return true
    return Boolean(resolveApiBearerToken(session.value))
  })
}
