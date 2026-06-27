import type { Session } from '@supabase/supabase-js'
import { setAuthLoginBootstrap } from '~/utils/auth-recovery'
import { identifyPosthogUser, resetPosthog } from '~/utils/posthog-client'
import {
  clearCachedAuthSnapshot,
  writeCachedAuthSnapshot,
} from '~/utils/auth-cache'
import { getOrCreateDeviceId } from '~/utils/device-id'
import {
  applySupabaseSessionTokens,
  ensureSupabaseAuthSession,
} from '~/utils/ensure-supabase-auth-session'
import { bootstrapAuthMe } from '~/utils/bootstrap-auth-me'
import { hasActiveBffSession, shouldPreferBffCookieAuth, shouldRestoreBffOnColdBoot } from '~/utils/bff-csrf-state'
import { refreshBffSessionSingleFlight } from '~/utils/bff-refresh-single-flight'
import { applyBffRefreshAccessToAuthState } from '~/utils/bff-session-refresh'
import {
  isPublicApiSameOriginAsPage,
  resolvePublicApiBase,
} from '~/utils/api-base-url'
import { AUTH_SESSION_STATE_KEY } from '~/utils/auth-session-state'
import { formatPasskeyAuthError } from '~/utils/mfa-auth-errors'
import { isPasskeyUserCancellation } from '~/utils/passkey-login'
import { isPasskeyConditionalUiAvailable, isWebAuthnAbortError } from '~/utils/passkey-conditional-ui'
import {
  deserializePasskeyRequestOptions,
  serializePasskeyAuthenticationCredential,
} from '~/utils/passkey-webauthn-serialize'
import {
  collectMfaFactors,
  elevateToAal2WithTotpCode,
  findTotpFactor,
} from '~/utils/mfa-aal2'
import { resolveApiBearerToken, setApiBearerToken } from '~/utils/api-bearer-token'

export type UserRole = 'company' | 'individual'

export type AppRole = 'user' | 'employer' | 'freelancer' | 'admin'

export type CurrentUser = {
  id: string
  email: string
  role: UserRole
  appRole: AppRole
  permissionScopes: string[]
}

export type CurrentProfile = {
  id: string
  role: UserRole
  app_role: AppRole
  extra_permission_scopes: string[]
  phone_e164: string | null
  phone_verified_at: string | null
  customer_role: boolean
  worker_role: boolean
  provider_role: boolean
  credits: number
  display_name: string | null
  company_name: string | null
  first_name: string | null
  last_name: string | null
  /** Present when GET /api/profiles/me includes it (company RPO stamp). */
  registry_verified?: boolean
}

export type PasskeyResult = {
  ok: boolean
  message?: string
  error?: string
  /** User closed the passkey / platform picker without signing in. */
  cancelled?: boolean
  /** Set when TOTP code is required before passkey enrollment. */
  needsTotpCode?: boolean
  session?: Session
}

export type SyncSessionOptions = {
  loginBootstrap?: boolean
  /** Session from signIn/signUp — avoids getSession() race right after password login. */
  supabaseSession?: Session | null
}

export type PasskeyCredential = {
  id: string
  name: string
  createdAt: string | null
}

export function useAuth() {
  const supabase = useSupabase()
  const config = useRuntimeConfig().public
  const user = useState<CurrentUser | null>('auth-user', () => null)
  const profile = useState<CurrentProfile | null>('auth-profile', () => null)
  const session = useState<{ access_token: string } | null>(AUTH_SESSION_STATE_KEY, () => null)
  const loading = useState('auth-loading', () => true)
  const passkeys = useState<PasskeyCredential[]>('auth-passkeys', () => [])

  function persistAuthSnapshot(): void {
    writeCachedAuthSnapshot(
      user.value ? { id: user.value.id, appRole: user.value.appRole } : null,
      profile.value ? { id: profile.value.id, role: profile.value.role } : null,
    )
  }

  // Profile/credits/roles come from Nest, not Supabase RLS — keeps one source of truth for billing.
  async function fetchProfile(
    accessToken?: string,
    options?: { skipSessionExpiry?: boolean },
  ) {
    const preferBffCookies =
      import.meta.client && shouldPreferBffCookieAuth() && !accessToken?.trim()
    const token =
      accessToken?.trim() ||
      (preferBffCookies ? undefined : resolveApiBearerToken(session.value))
    const { api } = useApi()
    try {
      const res = await api<CurrentProfile>('/api/profiles/me', {
        ...(token ? { token } : {}),
        skipSessionExpiry: options?.skipSessionExpiry ?? false,
      })
      if (!res.ok || !res.data) {
        profile.value = null
        return
      }
      const resData = res.data
      profile.value = {
        id: resData.id,
        role: resData.role as UserRole,
        app_role: (resData.app_role as AppRole) ?? 'user',
        extra_permission_scopes: Array.isArray(resData.extra_permission_scopes)
          ? resData.extra_permission_scopes
          : [],
        phone_e164: resData.phone_e164 ?? null,
        phone_verified_at: resData.phone_verified_at ?? null,
        customer_role: Boolean(resData.customer_role),
        worker_role: Boolean(resData.worker_role),
        provider_role: Boolean(resData.provider_role),
        credits: Number(resData.credits) || 0,
        display_name: resData.display_name ?? null,
        company_name: resData.company_name ?? null,
        first_name: resData.first_name ?? null,
        last_name: resData.last_name ?? null,
      }
      persistAuthSnapshot()
    } catch {
      profile.value = null
    }
  }

  async function fetchUser(
    accessToken?: string,
    options?: { skipSessionExpiry?: boolean },
  ): Promise<boolean> {
    const token = accessToken ?? resolveApiBearerToken(session.value)
    if (!token && !shouldRestoreBffOnColdBoot()) {
      user.value = null
      profile.value = null
      clearCachedAuthSnapshot()
      return false
    }
    if (!token && shouldRestoreBffOnColdBoot()) {
      const result = await bootstrapAuthMe({
        apiBaseUrl: String(config.apiBaseUrl),
      })
      if (!result.ok || !result.user) {
        if (result.statusCode !== 401 && result.statusCode !== 403) {
          user.value = null
          profile.value = null
          clearCachedAuthSnapshot()
        }
        return false
      }
      user.value = result.user
      if (result.profileToken) {
        setApiBearerToken(result.profileToken)
        session.value = { access_token: result.profileToken }
        await fetchProfile(result.profileToken, options)
      }
      persistAuthSnapshot()
      if (user.value) {
        try {
          identifyPosthogUser(
            {
              id: user.value.id,
              email: user.value.email,
              role: user.value.role,
              appRole: user.value.appRole,
            },
            profile.value
              ? {
                  role: profile.value.role,
                  customer_role: profile.value.customer_role,
                  worker_role: profile.value.worker_role,
                  provider_role: profile.value.provider_role,
                }
              : null,
          )
        } catch {
          /* analytics optional */
        }
      }
      return Boolean(user.value)
    }
    const { api } = useApi()
    const preferBffCookies = import.meta.client && shouldPreferBffCookieAuth()
    const meAuthToken = preferBffCookies ? undefined : token
    try {
      const res = await api<{
        id: string
        email: string
        role: string
        app_role?: string
        permission_scopes?: string[]
      }>('/api/auth/me', {
        ...(meAuthToken ? { token: meAuthToken } : {}),
        skipSessionExpiry: options?.skipSessionExpiry ?? false,
      })
      if (!res.ok || !res.data) {
        if (import.meta.dev) {
          console.warn('[auth] GET /api/auth/me failed', {
            status: res.status,
            body: res.body?.slice(0, 200),
          })
        }
        if (res.status !== 401) {
          user.value = null
          profile.value = null
          clearCachedAuthSnapshot()
        }
        return false
      }
      const data = res.data
      user.value = {
        id: data.id,
        email: data.email,
        role: data.role as UserRole,
        appRole: (data.app_role as AppRole) ?? 'user',
        permissionScopes: Array.isArray(data.permission_scopes) ? data.permission_scopes : [],
      }
      persistAuthSnapshot()
      await fetchProfile(preferBffCookies ? undefined : token, options)
      if (user.value) {
        try {
          identifyPosthogUser(
            {
              id: user.value.id,
              email: user.value.email,
              role: user.value.role,
              appRole: user.value.appRole,
            },
            profile.value
              ? {
                  role: profile.value.role,
                  customer_role: profile.value.customer_role,
                  worker_role: profile.value.worker_role,
                  provider_role: profile.value.provider_role,
                }
              : null,
          )
        } catch {
          /* analytics optional */
        }
      }
      return Boolean(user.value)
    } catch {
      if (!shouldRestoreBffOnColdBoot()) {
        user.value = null
        profile.value = null
        clearCachedAuthSnapshot()
      }
      return false
    }
  }

  async function sendSessionHeartbeat(): Promise<void> {
    const deviceId = getOrCreateDeviceId()
    if (!import.meta.client || !user.value || !deviceId) return
    const { api } = useApi()
    try {
      await api('/api/auth/sessions/heartbeat', {
        method: 'POST',
        body: {
          deviceId,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        },
        skipSessionExpiry: true,
      })
    } catch {
      // optional telemetry
    }
  }

  async function refreshUser() {
    const { data } = await supabase.auth.getSession()
    if (data.session?.access_token) {
      await fetchUser()
      return
    }
    if (shouldRestoreBffOnColdBoot() || hasActiveBffSession()) {
      if (await fetchUser()) return
    }
    const apiBase = resolvePublicApiBase(String(config.apiBaseUrl ?? ''))
    const refreshed = await refreshBffSessionSingleFlight(apiBase)
    if (refreshed.ok) {
      const token = applyBffRefreshAccessToAuthState(refreshed.body)
      if (await fetchUser(token ?? undefined)) return
    }
    user.value = null
    profile.value = null
  }

  // After Supabase login: validate Nest user, exchange tokens for HttpOnly cookies, drop persisted Supabase tokens.
  async function syncSession(options?: SyncSessionOptions): Promise<boolean> {
    if (options?.loginBootstrap) {
      setAuthLoginBootstrap(true)
    }
    try {
      const s =
        options?.supabaseSession ??
        (await supabase.auth.getSession()).data.session
      const accessToken = s?.access_token
      const refreshToken = s?.refresh_token
      if (accessToken) {
        session.value = { access_token: accessToken }
        setApiBearerToken(accessToken)
      }
      if (!accessToken || !refreshToken) {
        if (import.meta.dev) {
          console.warn('[auth] syncSession: missing access or refresh token', {
            hasAccess: Boolean(accessToken),
            hasRefresh: Boolean(refreshToken),
          })
        }
        user.value = null
        profile.value = null
        return false
      }
      const { establishSession, logoutSession, verifyBffSessionBound } =
        useBffSession()
      const { clearBffSessionClientState } = await import('~/utils/bff-csrf-state')
      // Drop stale jb_* before /api/auth/me — Bearer + old session cookies → 401 conflict.
      await logoutSession()
      const loaded = await fetchUser(accessToken, { skipSessionExpiry: true })
      if (!loaded) {
        if (import.meta.dev) {
          console.warn('[auth] fetchUser(/api/auth/me) failed before BFF bootstrap')
        }
        return false
      }
      let bffEstablished = false
      for (let attempt = 0; attempt < 2 && !bffEstablished; attempt += 1) {
        try {
          await establishSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (await verifyBffSessionBound()) {
            bffEstablished = true
          } else {
            clearBffSessionClientState()
            if (import.meta.dev) {
              console.warn(
                '[auth] BFF cookies not bound after establishSession — Bearer fallback',
              )
            }
          }
        } catch (err) {
          clearBffSessionClientState()
          if (import.meta.dev) {
            console.warn('[auth] establishSession failed (Bearer fallback)', {
              attempt: attempt + 1,
              err,
            })
          }
        }
      }
      try {
        await sendSessionHeartbeat()
      } catch {
        /* optional */
      }
      if (
        bffEstablished &&
        isPublicApiSameOriginAsPage(
          resolvePublicApiBase(String(config.apiBaseUrl ?? '')),
        ) &&
        !import.meta.dev
      ) {
        setApiBearerToken(null)
        session.value = null
        const { clearPersistedSupabaseAuth } = await import(
          '~/utils/supabase-auth-storage'
        )
        clearPersistedSupabaseAuth()
      } else {
        // Bearer-only / dev proxy fallback — passkeys and MFA need a Supabase JS session.
        await applySupabaseSessionTokens(accessToken, refreshToken)
        session.value = { access_token: accessToken }
        setApiBearerToken(accessToken)
      }
      return true
    } finally {
      // login.vue clears AUTH_LOGIN_BOOTSTRAP_KEY after navigation / failure handling.
    }
  }

  // Order: clear BFF cookies → audit logout (Bearer) → local state → Supabase signOut.
  /** Supabase global sign-out + revoke all BFF sessions (e.g. after password reset). */
  async function revokeAllSessionsEverywhere(): Promise<boolean> {
    if (!import.meta.client) {
      return false
    }
    const token = resolveApiBearerToken(session.value)
    if (token) {
      const { api } = useApi()
      const res = await api('/api/auth/sessions/revoke-all', {
        method: 'POST',
        token,
        skipSessionExpiry: true,
      })
      if (res.ok) {
        return true
      }
    }
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      return !error
    } catch {
      return false
    }
  }

  async function signOut() {
    try {
      if (import.meta.client) {
        const { logoutSession } = useBffSession()
        await logoutSession()
        try {
          const { api } = useApi()
          const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
          await api('/api/auth/security/session', {
            method: 'POST',
            body: {
              kind: 'logout',
              device_id: getOrCreateDeviceId(),
              user_agent: ua,
            },
            skipSessionExpiry: true,
          })
        } catch {
          /* best-effort audit */
        }
        try {
          useRealtimeSocket().disconnect()
        } catch {
          /* ignore */
        }
      }
    } finally {
      session.value = null
      setApiBearerToken(null)
      user.value = null
      profile.value = null
      clearCachedAuthSnapshot()
      const { clearBffSessionClientState } = await import('~/utils/bff-csrf-state')
      clearBffSessionClientState()
      if (import.meta.client) {
        const { clearPersistedSupabaseAuth } = await import(
          '~/utils/supabase-auth-storage'
        )
        clearPersistedSupabaseAuth()
        const { clearBffRefreshInFlight } = await import('~/utils/bff-refresh-single-flight')
        const { clearSessionExpiryInFlight } = await import('~/utils/session-expiry')
        clearBffRefreshInFlight()
        clearSessionExpiryInFlight()
      }
      try {
        await supabase.auth.signOut({ scope: 'local' })
      } catch {
        /* state already cleared */
      }
      resetPosthog()
      passkeys.value = []
    }
  }

  function canUsePasskeys(): boolean {
    if (!import.meta.client) return false
    if (!window.isSecureContext) return false
    if (typeof window.PublicKeyCredential === 'undefined') return false
    return true
  }

  async function loadPasskeys(): Promise<PasskeyResult> {
    const ready = await ensureSupabaseAuthSession()
    if (!ready.ok) {
      passkeys.value = []
      return { ok: false, error: ready.error ?? 'Ste odhlásený.' }
    }
    if (!canUsePasskeys()) {
      passkeys.value = []
      return { ok: false, error: 'Passkeys nie sú v tomto zariadení podporované.' }
    }
    const { data, error } = await supabase.auth.passkey.list()
    if (error) {
      passkeys.value = []
      return { ok: false, error: formatPasskeyAuthError(error.message) }
    }
    const list = Array.isArray(data) ? data : []
    passkeys.value = list.map((row) => ({
      id: row.id,
      name: row.friendly_name?.trim() || 'Passkey',
      createdAt: row.created_at ?? null,
    }))
    return { ok: true }
  }

  async function enrollPasskey(options?: {
    totpCode?: string
  }): Promise<PasskeyResult> {
    const ready = await ensureSupabaseAuthSession()
    if (!ready.ok) {
      return { ok: false, error: ready.error ?? 'Najskôr sa prihláste heslom.' }
    }
    if (!canUsePasskeys()) {
      return { ok: false, error: 'Passkeys nie sú v tomto zariadení podporované.' }
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aal?.currentLevel !== 'aal2') {
      const { data: factorData } = await supabase.auth.mfa.listFactors()
      const verifiedTotp = findTotpFactor(collectMfaFactors(factorData), 'verified')
      if (verifiedTotp?.id) {
        const code = options?.totpCode?.replace(/\s/g, '') ?? ''
        if (code.length < 6) {
          return {
            ok: false,
            needsTotpCode: true,
            error:
              'Máte zapnuté 2FA. Pred pridaním passkey zadajte aktuálny kód z autentifikačnej aplikácie.',
          }
        }
        const aalErr = await elevateToAal2WithTotpCode(supabase, verifiedTotp.id, code, {
          requireFreshVerify: true,
        })
        if (aalErr) {
          return { ok: false, error: aalErr }
        }
      }
    }
    const { error } = await supabase.auth.registerPasskey()
    if (error) {
      return { ok: false, error: formatPasskeyAuthError(error.message) }
    }
    await syncSession()
    await loadPasskeys()
    return { ok: true, message: 'Passkey bol úspešne pridaný.' }
  }

  async function applyPasskeySignInSession(
    signedIn: Session | null | undefined,
  ): Promise<PasskeyResult> {
    if (!signedIn?.access_token || !signedIn.refresh_token) {
      return { ok: false, error: 'Žiadna session po prihlásení.' }
    }
    const { error: sessionErr } = await supabase.auth.setSession({
      access_token: signedIn.access_token,
      refresh_token: signedIn.refresh_token,
    })
    if (sessionErr) {
      return { ok: false, error: formatPasskeyAuthError(sessionErr.message) }
    }
    const { data: confirmed } = await supabase.auth.getSession()
    const session = confirmed.session ?? signedIn
    if (!session.access_token || !session.refresh_token) {
      return { ok: false, error: 'Žiadna session po prihlásení.' }
    }
    return { ok: true, session }
  }

  async function signInWithPasskey(captchaToken?: string): Promise<PasskeyResult> {
    if (!canUsePasskeys()) {
      return { ok: false, error: 'Passkeys nie sú v tomto zariadení podporované.' }
    }
    const { data, error } = await supabase.auth.signInWithPasskey(
      captchaToken
        ? { options: { captchaToken } }
        : undefined
    )
    if (error) {
      const cancelled = isPasskeyUserCancellation(error.message)
      return {
        ok: false,
        cancelled,
        error: cancelled ? undefined : formatPasskeyAuthError(error.message),
      }
    }
    return applyPasskeySignInSession(data?.session)
  }

  /** Passkey sign-in via email-field autofill (Conditional UI) — no modal picker. */
  async function signInWithPasskeyConditional(
    signal: AbortSignal,
    captchaToken?: string,
  ): Promise<PasskeyResult> {
    if (!canUsePasskeys()) {
      return { ok: false, cancelled: true }
    }
    const conditionalAvailable = await isPasskeyConditionalUiAvailable()
    if (!conditionalAvailable) {
      return { ok: false, cancelled: true }
    }
    const { data: options, error: optionsError } = await supabase.auth.passkey.startAuthentication(
      captchaToken ? { options: { captchaToken } } : undefined,
    )
    if (signal.aborted) {
      return { ok: false, cancelled: true }
    }
    if (optionsError || !options?.options || !options.challenge_id) {
      return {
        ok: false,
        error: formatPasskeyAuthError(optionsError?.message),
      }
    }
    try {
      const publicKey = deserializePasskeyRequestOptions(options.options)
      const credential = await navigator.credentials.get({
        publicKey,
        mediation: 'conditional',
        signal,
      })
      if (signal.aborted) {
        return { ok: false, cancelled: true }
      }
      if (!credential || !(credential instanceof PublicKeyCredential)) {
        return { ok: false, cancelled: true }
      }
      const serialized = serializePasskeyAuthenticationCredential(credential)
      const { data, error } = await supabase.auth.passkey.verifyAuthentication({
        challengeId: options.challenge_id,
        credential: serialized,
      })
      if (error) {
        const cancelled = isPasskeyUserCancellation(error.message)
        return {
          ok: false,
          cancelled,
          error: cancelled ? undefined : formatPasskeyAuthError(error.message),
        }
      }
      return applyPasskeySignInSession(data?.session)
    } catch (err) {
      if (signal.aborted || isWebAuthnAbortError(err)) {
        return { ok: false, cancelled: true }
      }
      const message = err instanceof Error ? err.message : String(err)
      const cancelled = isPasskeyUserCancellation(message)
      return {
        ok: false,
        cancelled,
        error: cancelled ? undefined : formatPasskeyAuthError(message),
      }
    }
  }

  async function removePasskey(passkeyId: string): Promise<PasskeyResult> {
    const ready = await ensureSupabaseAuthSession()
    if (!ready.ok) {
      return { ok: false, error: ready.error ?? 'Ste odhlásený.' }
    }
    const { error } = await supabase.auth.passkey.delete({ passkeyId })
    if (error) {
      return { ok: false, error: formatPasskeyAuthError(error.message) }
    }
    await loadPasskeys()
    return { ok: true, message: 'Passkey bol odstránený.' }
  }

  const accountType = computed<UserRole | null>(
    () => profile.value?.role ?? user.value?.role ?? null,
  )
  const isCustomer = computed(() => Boolean(profile.value?.customer_role))
  const isWorker = computed(() => Boolean(profile.value?.worker_role))
  const isProvider = computed(() => Boolean(profile.value?.provider_role))

  async function updateAccountType(newType: UserRole): Promise<boolean> {
    if (!user.value) return false
    if (user.value.role === newType) return true
    const { api } = useApi()
    try {
      const res = await api('/api/profiles/me', {
        method: 'PATCH',
        body: { role: newType },
      })
      if (!res.ok) return false
      await refreshUser()
      return true
    } catch {
      return false
    }
  }

  async function updateRoles(payload: {
    customer_role: boolean
    worker_role: boolean
    provider_role: boolean
  }): Promise<boolean> {
    if (!user.value) return false
    const { api } = useApi()
    try {
      const res = await api('/api/profiles/me', {
        method: 'PATCH',
        body: payload,
      })
      if (!res.ok) return false
      await fetchProfile()
      persistAuthSnapshot()
      return true
    } catch {
      return false
    }
  }

  return {
    user,
    profile,
    session,
    loading,
    accountType,
    isCustomer,
    isWorker,
    isProvider,
    signOut,
    revokeAllSessionsEverywhere,
    refreshUser,
    syncSession,
    sendSessionHeartbeat,
    canUsePasskeys,
    passkeys,
    loadPasskeys,
    enrollPasskey,
    signInWithPasskey,
    signInWithPasskeyConditional,
    removePasskey,
    updateAccountType,
    updateRoles,
  }
}
