/**
 * Minimal client cache for cold-boot shell (no PII). Authoritative data from `/api/auth/me`.
 */

const STORAGE_KEY = 'jobbie:auth:user-cache:v2'
const LEGACY_STORAGE_KEY = 'jobbie:auth:user-cache:v1'
const SCHEMA_VERSION = 2
const MAX_AGE_MS = 60 * 60 * 1000 // 1 hour

export type CachedAuthUser = {
  id: string
  appRole: string
}

export type CachedAuthProfile = {
  id: string
  role: 'individual' | 'company'
}

export type CachedAuthSnapshot = {
  v: number
  savedAt: number
  user: CachedAuthUser | null
  profile: CachedAuthProfile | null
}

function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function clearLegacy(storage: Storage): void {
  try {
    storage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function readCachedAuthSnapshot(): CachedAuthSnapshot | null {
  const storage = safeStorage()
  if (!storage) return null
  clearLegacy(storage)
  let raw: string | null = null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const snap = parsed as Partial<CachedAuthSnapshot>
  if (snap.v !== SCHEMA_VERSION || typeof snap.savedAt !== 'number') return null
  if (Date.now() - snap.savedAt > MAX_AGE_MS) return null
  return {
    v: SCHEMA_VERSION,
    savedAt: snap.savedAt,
    user: snap.user ?? null,
    profile: snap.profile ?? null,
  }
}

export function writeCachedAuthSnapshot(
  user: { id: string; appRole: string } | null,
  profile: { id: string; role: 'individual' | 'company' } | null,
): void {
  const storage = safeStorage()
  if (!storage) return
  if (!user && !profile) {
    try {
      storage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    return
  }
  const payload: CachedAuthSnapshot = {
    v: SCHEMA_VERSION,
    savedAt: Date.now(),
    user: user
      ? { id: user.id, appRole: user.appRole }
      : null,
    profile: profile
      ? { id: profile.id, role: profile.role }
      : null,
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota */
  }
}

export function clearCachedAuthSnapshot(): void {
  const storage = safeStorage()
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
    storage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
