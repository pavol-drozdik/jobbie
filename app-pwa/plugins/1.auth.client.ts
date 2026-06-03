import {
  clearCachedAuthSnapshot,
  readCachedAuthSnapshot,
  writeCachedAuthSnapshot,
  type CachedAuthProfile,
  type CachedAuthUser,
} from '~/utils/auth-cache'
import {
  AUTH_RESET_PASSWORD_PATH,
  isAuthLoginRoute,
  shouldSkipAuthPluginProfileFetch,
} from '~/utils/auth-recovery'
import { resolvePublicApiBase } from '~/utils/api-base-url'
import { setApiBearerToken } from '~/utils/api-bearer-token'
import { refreshBffSessionSingleFlight } from '~/utils/bff-refresh-single-flight'
import { applyBffRefreshAccessToAuthState } from '~/utils/bff-session-refresh'
import {
  bootstrapAuthMe,
  fetchProfileForBootstrap,
} from '~/utils/bootstrap-auth-me'
import {
  clearBffSessionClientState,
  hasActiveBffSession,
  hydrateBffSessionHintFromStorage,
  isBffSessionMissingCsrf,
  shouldRestoreBffOnColdBoot,
} from '~/utils/bff-csrf-state'
import { confirmApiSessionDead } from '~/utils/session-expiry'

type AuthProfile = {
  id: string
  role: 'individual' | 'company'
  app_role?: string
  extra_permission_scopes?: string[]
  phone_e164?: string | null
  phone_verified_at?: string | null
  customer_role: boolean
  worker_role: boolean
  provider_role: boolean
  credits: number
  display_name?: string | null
  company_name?: string | null
  first_name?: string | null
  last_name?: string | null
}

export default defineNuxtPlugin(async () => {
  hydrateBffSessionHintFromStorage()

  const supabase = useSupabase()
  const user = useState<CachedAuthUser | null>('auth-user', () => null)
  const profile = useState<CachedAuthProfile | null>('auth-profile', () => null)
  const session = useState<{ access_token: string } | null>('auth-session', () => null)
  const loading = useState('auth-loading', () => true)
  const config = useRuntimeConfig().public
  const apiBase = resolvePublicApiBase(String(config.apiBaseUrl))

  function persistSnapshot(): void {
    writeCachedAuthSnapshot(
      user.value ? { id: user.value.id, appRole: user.value.appRole } : null,
      profile.value ? { id: profile.value.id, role: profile.value.role } : null,
    )
  }

  function hydrateFromCache(): boolean {
    const cached = readCachedAuthSnapshot()
    if (!cached) return false
    if (cached.user) {
      user.value = {
        id: cached.user.id,
        email: '',
        role: cached.profile?.role ?? 'individual',
        appRole: (cached.user.appRole || 'user') as 'user' | 'employer' | 'freelancer' | 'admin',
        permissionScopes: [],
      }
    }
    if (cached.profile) {
      profile.value = {
        id: cached.profile.id,
        role: cached.profile.role,
        app_role: cached.user?.appRole ?? 'user',
        extra_permission_scopes: [],
        phone_e164: null,
        phone_verified_at: null,
        customer_role: false,
        worker_role: false,
        provider_role: false,
        credits: 0,
        display_name: null,
        company_name: null,
        first_name: null,
        last_name: null,
      }
    }
    return Boolean(cached.user || cached.profile)
  }

  async function fetchProfileOnly(token: string): Promise<void> {
    const mapped = await fetchProfileForBootstrap(
      String(config.apiBaseUrl),
      token,
    )
    if (!mapped) {
      profile.value = null
      return
    }
    profile.value = {
      id: mapped.id,
      role: mapped.role,
      app_role: mapped.app_role,
      extra_permission_scopes: mapped.extra_permission_scopes,
      phone_e164: mapped.phone_e164,
      phone_verified_at: mapped.phone_verified_at,
      customer_role: mapped.customer_role,
      worker_role: mapped.worker_role,
      provider_role: mapped.provider_role,
      credits: mapped.credits,
      display_name: mapped.display_name,
      company_name: mapped.company_name,
      first_name: mapped.first_name,
      last_name: mapped.last_name,
    }
  }

  async function fetchUser(token?: string): Promise<boolean> {
    const skipSignOut = shouldSkipAuthPluginProfileFetch()
    const result = await bootstrapAuthMe({
      accessToken: token,
      apiBaseUrl: String(config.apiBaseUrl),
    })
    if (result.ok && result.user) {
      user.value = {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        appRole: result.user.appRole,
        permissionScopes: result.user.permissionScopes,
      }
      if (result.profileToken) {
        setApiBearerToken(result.profileToken)
        session.value = { access_token: result.profileToken }
        await fetchProfileOnly(result.profileToken)
      }
      persistSnapshot()
      return true
    }
    if (
      (result.statusCode === 401 || result.statusCode === 403) &&
      !hasActiveBffSession() &&
      !token
    ) {
      clearBffSessionClientState()
      clearCachedAuthSnapshot()
    }
    if (
      (result.statusCode === 401 || result.statusCode === 403) &&
      !skipSignOut &&
      !(hasActiveBffSession() && user.value) &&
      !shouldRestoreBffOnColdBoot()
    ) {
      user.value = null
      profile.value = null
      clearCachedAuthSnapshot()
      session.value = null
      const { logoutSession } = useBffSession()
      void logoutSession().catch(() => {})
      if (!isAuthLoginRoute()) {
        void supabase.auth.signOut().catch(() => {})
      }
    }
    return false
  }

  async function handleBootstrapFailure(ok: boolean): Promise<void> {
    if (ok) return
    if (!shouldRestoreBffOnColdBoot()) {
      user.value = null
      profile.value = null
      clearCachedAuthSnapshot()
      return
    }
    const dead = await confirmApiSessionDead()
    if (!dead) return
    user.value = null
    profile.value = null
    clearCachedAuthSnapshot()
    session.value = null
    const { logoutSession } = useBffSession()
    await logoutSession()
    if (!isAuthLoginRoute()) {
      await navigateTo({
        path: '/auth/login',
        query: { reason: 'session_expired' },
        replace: true,
      })
    }
  }

  hydrateFromCache()

  let {
    data: { session: s },
  } = await supabase.auth.getSession()
  // HttpOnly jb_* may be valid when sessionStorage hint / auth cache are missing (hard refresh edge cases).
  if (!s?.access_token) {
    const refreshed = await refreshBffSessionSingleFlight(apiBase)
    if (refreshed.ok) {
      const access = applyBffRefreshAccessToAuthState(refreshed.body)
      if (access) {
        s = {
          access_token: access,
          refresh_token: refreshed.body.refresh_token ?? '',
        } as typeof s
      }
      if (!s?.access_token) {
        const { data: afterRefresh } = await supabase.auth.getSession()
        if (afterRefresh.session?.access_token) {
          s = afterRefresh.session
        }
      }
    }
  }
  session.value = s ? { access_token: s.access_token } : null
  if (s?.access_token) {
    setApiBearerToken(s.access_token)
  }

  async function bootstrapBffFromSupabase(
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    const { readBffCsrfToken } = await import('~/utils/bff-csrf-state')
    if (readBffCsrfToken()) return
    try {
      const { establishSession } = useBffSession()
      await establishSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
    } catch {
      /* BFF optional until API is up */
    }
  }

  const skipPluginProfileFetch = shouldSkipAuthPluginProfileFetch()
  const coldBoot = shouldRestoreBffOnColdBoot()

  try {
    if (skipPluginProfileFetch) {
      /* login/recovery handoff */
    } else if (s?.access_token) {
      const ok = await fetchUser(s.access_token)
      if (!ok) {
        await handleBootstrapFailure(false)
      } else if (user.value && s.refresh_token) {
        await bootstrapBffFromSupabase(s.access_token, s.refresh_token)
      }
    } else if (coldBoot) {
      const { ensureBffSessionFromSupabase } = useBffSession()
      await ensureBffSessionFromSupabase()
      const ok = await fetchUser()
      if (!ok) {
        await handleBootstrapFailure(false)
      }
    } else {
      await handleBootstrapFailure(false)
    }
  } finally {
    if (isBffSessionMissingCsrf()) {
      await refreshBffSessionSingleFlight(apiBase).catch(() => {})
    }
    loading.value = false
  }

  const previousUserId = { current: user.value?.id ?? null }
  supabase.auth.onAuthStateChange((event, s2) => {
    const nextToken = s2?.access_token ?? null
    const skipPlugin = shouldSkipAuthPluginProfileFetch()

    if (event === 'PASSWORD_RECOVERY' && import.meta.client) {
      const route = useRoute()
      if (route.path !== AUTH_RESET_PASSWORD_PATH) {
        void navigateTo(AUTH_RESET_PASSWORD_PATH, { replace: true })
      }
      return
    }

    if (!nextToken) {
      if (skipPlugin) {
        return
      }
      if (event === 'INITIAL_SESSION') {
        return
      }
      if (hasActiveBffSession() && user.value) {
        return
      }
      if (shouldRestoreBffOnColdBoot() && user.value) {
        return
      }
      session.value = null
      if (event === 'SIGNED_OUT' || user.value !== null) {
        user.value = null
        profile.value = null
        clearCachedAuthSnapshot()
      }
      previousUserId.current = null
      return
    }

    const nextUserId = (s2?.user?.id as string | undefined) ?? null

    session.value = { access_token: nextToken }
    setApiBearerToken(nextToken)

    if (skipPlugin) {
      previousUserId.current = nextUserId
      return
    }

    if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      if (
        nextUserId &&
        previousUserId.current === nextUserId &&
        user.value !== null
      ) {
        return
      }
    }

    if (
      user.value?.id &&
      nextUserId &&
      user.value.id === nextUserId &&
      (event === 'SIGNED_IN' || event === 'USER_UPDATED')
    ) {
      previousUserId.current = nextUserId
      void fetchProfileOnly(nextToken).catch(() => {})
      return
    }

    previousUserId.current = nextUserId
    void fetchUser(nextToken).catch(() => {})
  })
})
