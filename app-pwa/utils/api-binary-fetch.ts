import { resolvePublicApiBase } from '~/utils/api-base-url'
import { resolveApiBearerToken } from '~/utils/api-bearer-token'
import { readBffCsrfToken, shouldPreferBffCookieAuth } from '~/utils/bff-csrf-state'
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
): Record<string, string> {
  const headers: Record<string, string> = { Accept: accept }
  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json'
  }
  const explicit = token?.trim()
  const useCookieAuth =
    import.meta.client && !explicit && shouldPreferBffCookieAuth()
  if (!useCookieAuth) {
    const bearer = explicit || resolveApiBearerToken(session)
    if (bearer) headers.Authorization = `Bearer ${bearer}`
  }
  if (import.meta.client && MUTATING.has(method.toUpperCase())) {
    const csrf = readBffCsrfToken()
    if (csrf) headers['X-CSRF-Token'] = csrf
  }
  return headers
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

  const run = async (): Promise<Response> => {
    const headers = buildApiFetchHeaders(session, method, accept, options?.token)
    const init: RequestInit = {
      method,
      credentials: 'include',
      headers,
    }
    if (options?.body !== undefined && method !== 'GET' && method !== 'HEAD') {
      init.body = JSON.stringify(options.body)
    }
    return fetchApi(url, init)
  }

  let res = await run()
  if (res.status === 401 && import.meta.client && apiBase) {
    const refreshed = await refreshBffSessionSingleFlight(apiBase)
    if (refreshed.ok) {
      res = await run()
    }
  }
  return res
}
