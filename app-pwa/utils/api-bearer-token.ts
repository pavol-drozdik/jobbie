/** Supabase access JWT for Nest API calls; survives BFF handoff / SIGNED_OUT. */
export const API_BEARER_TOKEN_KEY = 'api-bearer-token'

export function useApiBearerToken() {
  return useState<string | null>(API_BEARER_TOKEN_KEY, () => null)
}

export function setApiBearerToken(token: string | null): void {
  useApiBearerToken().value = token?.trim() || null
}

export function resolveApiBearerToken(
  session?: { access_token: string } | null,
): string | undefined {
  const t = session?.access_token ?? useApiBearerToken().value
  return t?.trim() || undefined
}
