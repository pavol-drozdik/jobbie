import { apiUrl, resolvePublicApiBase } from '~/utils/api-base-url'
import { setApiBearerToken, useApiBearerToken } from '~/utils/api-bearer-token'
import { hasActiveBffSession } from '~/utils/bff-csrf-state'
import { refreshBffSessionFromApi } from '~/utils/bff-session-refresh'
import { fetchApi } from '~/utils/api-fetch'
import type { CurrentProfile, CurrentUser } from '~/composables/useAuth'

export type AuthMeResponse = {
  id: string
  email: string
  role: string
  app_role?: string
  permission_scopes?: string[]
}

export type BootstrapAuthMeOptions = {
  accessToken?: string
  apiBaseUrl: string
  skipSessionExpiry?: boolean
}

export type BootstrapAuthMeResult = {
  ok: boolean
  user: CurrentUser | null
  profileToken: string | null
  statusCode?: number
}

async function loadAuthMe(
  apiBaseUrl: string,
  accessToken?: string,
  cookieOnly = false,
): Promise<Response> {
  const headers: Record<string, string> = {}
  if (accessToken?.trim() && !cookieOnly) {
    headers.Authorization = `Bearer ${accessToken.trim()}`
  }
  return fetchApi(apiUrl(apiBaseUrl, '/api/auth/me'), {
    headers,
    credentials: 'include',
  })
}

/**
 * Load `/api/auth/me` with BFF cookie refresh fallback (cold boot after BFF handoff).
 * Does not mutate global auth state — callers apply `user` / tokens.
 */
export async function bootstrapAuthMe(
  options: BootstrapAuthMeOptions,
): Promise<BootstrapAuthMeResult> {
  const apiBase = resolvePublicApiBase(options.apiBaseUrl)
  let token = options.accessToken?.trim() || undefined

  try {
    let meRes = await loadAuthMe(apiBase, token)
    if (
      !meRes.ok &&
      meRes.status === 401 &&
      (Boolean(token) || hasActiveBffSession())
    ) {
      const refreshed = await refreshBffSessionFromApi(apiBase)
      const nextToken = refreshed.body.access_token?.trim()
      if (refreshed.ok && nextToken) {
        setApiBearerToken(nextToken)
        token = nextToken
        meRes = await loadAuthMe(apiBase, nextToken)
      }
      if (!meRes.ok && meRes.status === 401) {
        meRes = await loadAuthMe(apiBase, undefined, true)
        if (meRes.ok) {
          token =
            useApiBearerToken().value?.trim() ||
            refreshed.body.access_token?.trim() ||
            token
        }
      }
    }
    if (!meRes.ok) {
      return {
        ok: false,
        user: null,
        profileToken: token ?? null,
        statusCode: meRes.status,
      }
    }
    const res = (await meRes.json()) as AuthMeResponse
    const profileToken =
      token ?? useApiBearerToken().value?.trim() ?? undefined
    const currentUser: CurrentUser = {
      id: res.id,
      email: res.email,
      role: res.role as CurrentUser['role'],
      appRole: (res.app_role as CurrentUser['appRole']) ?? 'user',
      permissionScopes: Array.isArray(res.permission_scopes)
        ? res.permission_scopes
        : [],
    }
    return {
      ok: true,
      user: currentUser,
      profileToken: profileToken ?? null,
    }
  } catch {
    return { ok: false, user: null, profileToken: token ?? null }
  }
}

export async function fetchProfileForBootstrap(
  apiBaseUrl: string,
  profileToken: string,
): Promise<CurrentProfile | null> {
  try {
    const profileRes = await fetchApi(
      apiUrl(apiBaseUrl, '/api/profiles/me'),
      {
        headers: { Authorization: `Bearer ${profileToken}` },
        credentials: 'include',
      },
    ).then(async (r) => {
      if (!r.ok) throw r
      return (await r.json()) as CurrentProfile & {
        extra_permission_scopes?: string[]
      }
    })
    return {
      id: profileRes.id,
      role: profileRes.role,
      app_role: profileRes.app_role ?? 'user',
      extra_permission_scopes: Array.isArray(profileRes.extra_permission_scopes)
        ? profileRes.extra_permission_scopes
        : [],
      phone_e164: profileRes.phone_e164 ?? null,
      phone_verified_at: profileRes.phone_verified_at ?? null,
      customer_role: Boolean(profileRes.customer_role),
      worker_role: Boolean(profileRes.worker_role),
      provider_role: Boolean(profileRes.provider_role),
      credits: Number(profileRes.credits) || 0,
      display_name: profileRes.display_name ?? null,
      company_name: profileRes.company_name ?? null,
      first_name: profileRes.first_name ?? null,
      last_name: profileRes.last_name ?? null,
      registry_verified: profileRes.registry_verified,
    }
  } catch {
    return null
  }
}
