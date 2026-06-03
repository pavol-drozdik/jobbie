/** Readable CSRF cookie set by Nest BFF (`jb_csrf`). Sent as X-CSRF-Token on POST/PATCH/DELETE via useApi. */
export const CSRF_COOKIE_NAME = 'jb_csrf'
export const SESSION_COOKIE_NAME = 'jb_sid'

function readCookieValue(name: string): string | null {
  if (!import.meta.client || typeof document === 'undefined') return null
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`))
  if (!match) return null
  try {
    return decodeURIComponent(match.slice(name.length + 1))
  } catch {
    return null
  }
}

export function readSessionCookieFromDocument(): string | null {
  const v = readCookieValue(SESSION_COOKIE_NAME)
  return v?.trim() || null
}

export function readCsrfTokenFromDocument(): string | null {
  const v = readCookieValue(CSRF_COOKIE_NAME)
  return v?.trim() || null
}
