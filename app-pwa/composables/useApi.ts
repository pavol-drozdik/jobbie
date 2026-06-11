import {
  AUTH_LOGIN_BOOTSTRAP_KEY,
  isAuthLoginRoute,
} from '~/utils/auth-recovery'
import {
  readBffCsrfToken,
  shouldPreferBffCookieAuth,
} from '~/utils/bff-csrf-state'
import { refreshBffSessionSingleFlight } from '~/utils/bff-refresh-single-flight'
import { resolveApiBearerToken } from '~/utils/api-bearer-token'
import { resolvePublicApiBase } from '~/utils/api-base-url'
import { fetchApi, isApiUnreachableStatus } from '~/utils/api-fetch'
import {
  buildApiGetDedupKey,
  runDedupedGet,
  type ApiGetAuthMode,
} from '~/utils/api-get-dedup'
import { isAppHmrUpdating } from '~/utils/hmr-guard'
import {
  captureSessionExpirySnapshot,
  handleSessionExpired,
} from '~/utils/session-expiry'

export type ApiOptions = {
  /** Explicit Bearer token (e.g. step-up); Nest API prefers cookies when omitted. */
  token?: string | null
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: object
  query?: Record<string, string>
  signal?: AbortSignal
  /** Skip global logout on 401 (token prefs, unsubscribe, public catalog). */
  skipSessionExpiry?: boolean
}

export type ApiResponse<T = unknown> = {
  data?: T
  status: number
  ok: boolean
  body: string
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export function useApi() {
  const config = useRuntimeConfig().public
  const { session, loading: authLoading } = useAuth()

  function resolveBaseUrl(): string {
    return resolvePublicApiBase(config.apiBaseUrl as string | undefined)
  }

  async function api<T = unknown>(
    path: string,
    options: ApiOptions = {},
  ): Promise<ApiResponse<T>> {
    const method = options.method ?? 'GET'
    const baseUrl = resolveBaseUrl()
    const absolute =
      path.startsWith('http') ?
        path
      : `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
    const url = new URL(absolute)
    if (options.query) {
      Object.entries(options.query).forEach(([k, v]) =>
        url.searchParams.set(k, v),
      )
    }

    const execute = (): Promise<ApiResponse<T>> =>
      performApiRequest<T>(url, method, options, baseUrl)

    if (import.meta.client && method === 'GET' && !options.signal) {
      const resolvedBearer = resolveApiBearerToken(session.value)
      const useCookieAuth = !options.token && shouldPreferBffCookieAuth()
      let authMode: ApiGetAuthMode = 'anon'
      if (options.token?.trim()) {
        authMode = 'bearer'
      } else if (useCookieAuth) {
        authMode = 'bff'
      } else if (resolvedBearer) {
        authMode = 'bearer'
      }
      const key = buildApiGetDedupKey(method, url.toString(), authMode)
      return runDedupedGet(key, execute)
    }

    return execute()
  }

  async function performApiRequest<T>(
    url: URL,
    method: string,
    options: ApiOptions,
    baseUrl: string,
  ): Promise<ApiResponse<T>> {
    const expirySnapshot =
      import.meta.client && !options.skipSessionExpiry ?
        captureSessionExpirySnapshot()
      : null

    if (
      import.meta.client &&
      MUTATING.has(method) &&
      !options.token &&
      shouldPreferBffCookieAuth() &&
      !readBffCsrfToken()
    ) {
      const { ensureBffCsrfForMutation } = await import('~/utils/bff-csrf-state')
      await ensureBffCsrfForMutation(baseUrl)
    }

    const runFetch = async (forceBearer?: string): Promise<Response> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      const resolvedBearer = resolveApiBearerToken(session.value)
      const useCookieAuth =
        !forceBearer &&
        !options.token &&
        import.meta.client &&
        shouldPreferBffCookieAuth()
      const bearer =
        options.token?.trim() ||
        forceBearer?.trim() ||
        (import.meta.client && !useCookieAuth ? resolvedBearer : undefined)
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`
      }
      if (import.meta.client && MUTATING.has(method)) {
        const { readBffCsrfToken } = await import('~/utils/bff-csrf-state')
        const csrf = readBffCsrfToken()
        if (csrf) headers['X-CSRF-Token'] = csrf
      }
      // Never send HttpOnly jb_* with Bearer — SessionAuthGuard rejects conflicting tokens.
      const credentials: RequestCredentials = bearer?.trim() ? 'omit' : 'include'
      return fetchApi(url.toString(), {
        method,
        headers,
        credentials,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      })
    }

    let res = await runFetch()
    const canAttemptSessionRecovery =
      import.meta.client &&
      (shouldPreferBffCookieAuth() || Boolean(resolveApiBearerToken(session.value)))
    if (
      import.meta.client &&
      res.status === 401 &&
      !options.skipSessionExpiry &&
      !options.token &&
      canAttemptSessionRecovery
    ) {
      const refreshed = await refreshBffSessionSingleFlight(baseUrl)
      if (refreshed.ok) {
        res = await runFetch()
      }
      if (res.status === 401) {
        const memoryBearer = resolveApiBearerToken(session.value)
        if (memoryBearer) {
          res = await runFetch(memoryBearer)
        } else {
          const supabase = useSupabase()
          const { data } = await supabase.auth.getSession()
          const access = data.session?.access_token?.trim()
          if (access) {
            res = await runFetch(access)
          }
        }
      }
    }
    if (
      import.meta.client &&
      MUTATING.has(method) &&
      res.status === 403 &&
      !options.token
    ) {
      const csrfBody = await res.clone().text()
      const needsCsrfRetry =
        /invalid csrf token/i.test(csrfBody) ||
        (shouldPreferBffCookieAuth() && !readBffCsrfToken())
      if (needsCsrfRetry) {
        const refreshed = await refreshBffSessionSingleFlight(baseUrl)
        if (refreshed.ok && readBffCsrfToken()) {
          res = await runFetch()
        }
      }
    }

    const text = await res.text()
    let data: T | undefined
    try {
      if (text) data = JSON.parse(text) as T
    } catch {
      /* ignore */
    }

    if (
      import.meta.client &&
      res.status === 401 &&
      !isApiUnreachableStatus(res.status) &&
      !options.skipSessionExpiry &&
      !authLoading.value &&
      !isAppHmrUpdating() &&
      !useState(AUTH_LOGIN_BOOTSTRAP_KEY, () => false).value &&
      !isAuthLoginRoute() &&
      expirySnapshot
    ) {
      await handleSessionExpired(expirySnapshot)
    }

    return {
      data,
      status: res.status,
      ok: res.ok,
      body: text,
    }
  }

  function getApiBaseUrl(): string {
    return resolveBaseUrl()
  }

  return { api, request: api, getApiBaseUrl }
}
