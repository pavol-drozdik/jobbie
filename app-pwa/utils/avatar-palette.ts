/**
 * Brand-aligned avatar fallback colors (no generic violet AI palette).
 */

const AVATAR_FALLBACK_COLORS = [
  '#15803d',
  '#16a34a',
  '#22c55e',
  '#0d9488',
  '#059669',
  '#ca8a04',
  '#d97706',
  '#78716c',
] as const

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

/** Deterministic background color from user id, name, or email. */
export function avatarFallbackColor(seed: string): string {
  const normalized = seed.trim().toLowerCase()
  if (!normalized) {
    return AVATAR_FALLBACK_COLORS[0]
  }
  const index = hashString(normalized) % AVATAR_FALLBACK_COLORS.length
  return AVATAR_FALLBACK_COLORS[index] ?? AVATAR_FALLBACK_COLORS[0]
}

/** Tailwind-compatible inline style for monogram avatars. */
export function avatarFallbackStyle(seed: string): { backgroundColor: string; color: '#ffffff' } {
  return {
    backgroundColor: avatarFallbackColor(seed),
    color: '#ffffff',
  }
}

/** Chat / review participant palette (greens, teals, ambers only). */
export const CHAT_AVATAR_PALETTE = [...AVATAR_FALLBACK_COLORS] as const

export function chatAvatarColor(index: number): string {
  const palette = CHAT_AVATAR_PALETTE
  return palette[Math.abs(index) % palette.length] ?? palette[0]
}
