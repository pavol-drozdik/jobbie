import { setApiBearerToken } from '~/utils/api-bearer-token'

/** Same key as `useAuth()` — shared in-memory JWT for API calls after BFF refresh. */
export const AUTH_SESSION_STATE_KEY = 'auth-session'

export type AuthSessionState = { access_token: string } | null

export function useAuthSessionState() {
  return useState<AuthSessionState>(AUTH_SESSION_STATE_KEY, () => null)
}

export function setAuthSessionAccessToken(accessToken: string): void {
  const token = accessToken.trim()
  if (!token) return
  setApiBearerToken(token)
  useAuthSessionState().value = { access_token: token }
}
