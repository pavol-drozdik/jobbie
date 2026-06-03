/** Restores BFF-active flag after full reload (HttpOnly jb_* are not in document.cookie on PWA routes). */
const BFF_HINT_STORAGE_KEY = 'jobbie:bff-hint:v2'
const BFF_HINT_LEGACY_KEY = 'jobbie:bff-hint:v1'

export type BffSessionHint = {
  active: boolean
}

function safeSessionStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function clearLegacyHint(storage: Storage): void {
  try {
    storage.removeItem(BFF_HINT_LEGACY_KEY)
  } catch {
    /* ignore */
  }
}

export function readBffSessionHint(): BffSessionHint | null {
  const storage = safeSessionStorage()
  if (!storage) return null
  clearLegacyHint(storage)
  let raw: string | null = null
  try {
    raw = storage.getItem(BFF_HINT_STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<BffSessionHint>
    if (parsed.active === false) return null
    return { active: true }
  } catch {
    return null
  }
}

/** Opaque hint only — CSRF is persisted separately in `jobbie:bff-csrf:v1` (jb_csrf cookie is Path=/api). */
export function writeBffSessionHint(): void {
  const storage = safeSessionStorage()
  if (!storage) return
  clearLegacyHint(storage)
  try {
    storage.setItem(
      BFF_HINT_STORAGE_KEY,
      JSON.stringify({ active: true } satisfies BffSessionHint),
    )
  } catch {
    /* quota / private mode */
  }
}

export function clearBffSessionHint(): void {
  const storage = safeSessionStorage()
  if (!storage) return
  try {
    storage.removeItem(BFF_HINT_STORAGE_KEY)
    storage.removeItem(BFF_HINT_LEGACY_KEY)
  } catch {
    /* ignore */
  }
}
