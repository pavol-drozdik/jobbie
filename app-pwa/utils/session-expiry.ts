import {
  AUTH_LOGIN_BOOTSTRAP_KEY,
  isAuthLoginRoute,
} from '~/utils/auth-recovery'
import { hasActiveBffSession } from '~/utils/bff-csrf-state'
import { resolvePublicApiBase } from '~/utils/api-base-url'
import { resolveApiBearerToken } from '~/utils/api-bearer-token'
import { fetchApi } from '~/utils/api-fetch'
import { refreshBffSessionSingleFlight } from '~/utils/bff-refresh-single-flight'
import { isAppHmrUpdating } from '~/utils/hmr-guard'
import { isSafeInternalPath, resolveSafeInternalPath } from '~/utils/safe-navigation'

let sessionExpiryInFlight: Promise<void> | null = null

export type SessionExpirySnapshot = {
  hadUser: boolean
  hadBffSession: boolean
}

export function captureSessionExpirySnapshot(): SessionExpirySnapshot {
  const { user } = useAuth()
  return {
    hadUser: Boolean(user.value),
    hadBffSession: hasActiveBffSession(),
  }
}

/** True when a 401 should sign out and redirect, not silently clear UI on the same page. */
export function shouldForceSessionExpiryRedirect(
  snapshot: SessionExpirySnapshot,
): boolean {
  return snapshot.hadUser || snapshot.hadBffSession
}

/** Re-check session before forcing login — avoids redirect on transient / wrong-auth-mode 401s. */
export async function confirmApiSessionDead(): Promise<boolean> {
  const config = useRuntimeConfig().public
  const base = resolvePublicApiBase(String(config.apiBaseUrl ?? ''))

  const tryAuthMe = async (bearer?: string): Promise<boolean> => {
    const headers: Record<string, string> = { Accept: 'application/json' }
    if (bearer?.trim()) {
      headers.Authorization = `Bearer ${bearer.trim()}`
    }
    const res = await fetchApi(`${base}/api/auth/me`, {
      credentials: bearer?.trim() ? 'omit' : 'include',
      headers,
    })
    return res.ok
  }

  if (hasActiveBffSession()) {
    const refreshed = await refreshBffSessionSingleFlight(base)
    if (refreshed.ok && (await tryAuthMe())) return false
  }

  const { session } = useAuth()
  const bearer = resolveApiBearerToken(session.value)
  if (bearer && (await tryAuthMe(bearer))) return false

  if (await tryAuthMe()) return false

  return true
}

async function runSessionExpiryWork(
  snapshot?: SessionExpirySnapshot,
): Promise<void> {
  if (useState(AUTH_LOGIN_BOOTSTRAP_KEY, () => false).value) return
  if (isAuthLoginRoute()) return
  if (isAppHmrUpdating()) return

  const { loading, session, signOut, refreshUser } = useAuth()
  if (loading.value) return

  const snap = snapshot ?? captureSessionExpirySnapshot()

  if (!shouldForceSessionExpiryRedirect(snap)) {
    if (session.value?.access_token) {
      await signOut()
    } else {
      const { logoutSession } = useBffSession()
      await logoutSession()
    }
    return
  }

  const dead = await confirmApiSessionDead()
  if (!dead) {
    await refreshUser()
    return
  }

  await signOut()
  const route = useRoute()
  const redirect =
    typeof route.fullPath === 'string' && isSafeInternalPath(route.fullPath)
      ? resolveSafeInternalPath(route.fullPath, '/')
      : undefined
  await navigateTo({
    path: '/auth/login',
    query: {
      reason: 'session_expired',
      ...(redirect ? { redirect } : {}),
    },
    replace: true,
  })
}

/**
 * Sign out and redirect to login after API session loss.
 * Single-flight: parallel 401s must not each call signOut (dev HMR / listing pages).
 */
export async function handleSessionExpired(
  snapshot?: SessionExpirySnapshot,
): Promise<void> {
  if (!import.meta.client) return
  if (sessionExpiryInFlight) {
    return sessionExpiryInFlight
  }
  sessionExpiryInFlight = runSessionExpiryWork(snapshot)
    .catch((err: unknown) => {
      if (import.meta.dev) {
        console.warn('[session-expiry]', err)
      }
    })
    .finally(() => {
      sessionExpiryInFlight = null
    })
  return sessionExpiryInFlight
}

/** Clear in-flight expiry handling (logout / HMR). */
export function clearSessionExpiryInFlight(): void {
  sessionExpiryInFlight = null
}
