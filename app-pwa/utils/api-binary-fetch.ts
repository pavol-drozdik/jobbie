import { resolvePublicApiBase } from '~/utils/api-base-url'
import { resolveApiBearerToken } from '~/utils/api-bearer-token'
import {
  ensureBffCsrfForMutation,
  readBffCsrfToken,
  shouldPreferBffCookieAuth,
} from '~/utils/bff-csrf-state'
import { refreshBffSessionSingleFlight } from '~/utils/bff-refresh-single-flight'
import { fetchApi } from '~/utils/api-fetch'

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export type FetchApiBinaryOptions = {
  method?: string
  accept?: string
  apiBaseUrl?: string
  body?: unknown
  token?: string | null
}

export function buildApiFetchHeaders(
  session: { access_token: string } | null,
  method: string,
  accept: string,
  token?: string | null,
  forceBearer?: string,
): Record<string, string> {
  const headers: Record<string, string> = { Accept: accept }
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json'
  }
  const explicit = token?.trim()
  const useCookieAuth =
    !forceBearer?.trim() &&
    !explicit &&
    import.meta.client &&
    shouldPreferBffCookieAuth()
  const bearer =
    explicit ||
    forceBearer?.trim() ||
    (import.meta.client && !useCookieAuth ?
      resolveApiBearerToken(session)
    : undefined)
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`
  }
  if (import.meta.client && MUTATING.has(method.toUpperCase())) {
    const csrf = readBffCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf
  }
  return headers
}

function resolveBinaryCredentials(
  session: { access_token: string } | null,
  method: string,
  token?: string | null,
  forceBearer?: string,
): RequestCredentials {
  const explicit = token?.trim()
  const useCookieAuth =
    !forceBearer?.trim() &&
    !explicit &&
    import.meta.client &&
    shouldPreferBffCookieAuth()
  const bearer =
    explicit ||
    forceBearer?.trim() ||
    (import.meta.client && !useCookieAuth ?
      resolveApiBearerToken(session)
    : undefined)
  // Never send HttpOnly jb_* with Bearer — SessionAuthGuard rejects conflicting tokens.
  return bearer?.trim() ? 'omit' : 'include'
}

/** Binary download with BFF cookies (+ CSRF on mutations). */
export async function fetchApiBinary(
  url: string,
  session: { access_token: string } | null,
  options?: FetchApiBinaryOptions,
): Promise<Response> {
  const method = (options?.method ?? 'GET').toUpperCase()
  const accept = options?.accept ?? 'application/octet-stream'
  const apiBase =
    options?.apiBaseUrl ??
    resolvePublicApiBase(String(useRuntimeConfig().public.apiBaseUrl ?? ''))

  if (
    import.meta.client &&
    MUTATING.has(method) &&
    !options?.token &&
    shouldPreferBffCookieAuth() &&
    !readBffCsrfToken()
  ) {
    await ensureBffCsrfForMutation(apiBase)
  }

  const run = async (forceBearer?: string): Promise<Response> => {
    const headers = buildApiFetchHeaders(
      session,
      method,
      accept,
      options?.token,
      forceBearer,
    )
    const init: RequestInit = {
      method,
      credentials: resolveBinaryCredentials(
        session,
        method,
        options?.token,
        forceBearer,
      ),
      headers,
    }
    if (options?.body !== undefined && method !== 'GET' && method !== 'HEAD') {
      init.body = JSON.stringify(options.body)
    }
    return fetchApi(url, init)
  }

  let res = await run()
  const canAttemptSessionRecovery =
    import.meta.client &&
    (shouldPreferBffCookieAuth() || Boolean(resolveApiBearerToken(session)))
  if (
    import.meta.client &&
    res.status === 401 &&
    !options?.token &&
    canAttemptSessionRecovery
  ) {
    const refreshed = await refreshBffSessionSingleFlight(apiBase)
    if (refreshed.ok) {
      res = await run()
    }
    if (res.status === 401) {
      const memoryBearer = resolveApiBearerToken(session)
      if (memoryBearer) {
        res = await run(memoryBearer)
      } else {
        const supabase = useSupabase()
        const { data } = await supabase.auth.getSession()
        const access = data.session?.access_token?.trim()
        if (access) {
          res = await run(access)
        }
      }
    }
  }
  if (
    import.meta.client &&
    MUTATING.has(method) &&
    res.status === 403 &&
    !options?.token
  ) {
    const csrfBody = await res.clone().text()
    const needsCsrfRetry =
      /invalid csrf token/i.test(csrfBody) ||
      (shouldPreferBffCookieAuth() && !readBffCsrfToken())
    if (needsCsrfRetry) {
      const refreshed = await refreshBffSessionSingleFlight(apiBase)
      if (refreshed.ok && readBffCsrfToken()) {
        res = await run()
      }
    }
  }
  return res
}
