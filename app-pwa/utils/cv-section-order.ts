export type CvSectionReorderDirection = 'up' | 'down'

/**
 * Swap a row within the visual list (highest sort_order first).
 * Returns the same array reference when the move is a no-op.
 */
export function swapCvSectionRow<T extends { id: string }>(
  rows: readonly T[],
  id: string,
  direction: CvSectionReorderDirection,
): T[] {
  const idx = rows.findIndex((r) => r.id === id)
  if (idx < 0) return [...rows]

  const target = direction === 'up' ? idx - 1 : idx + 1
  if (target < 0 || target >= rows.length) return [...rows]

  const next = [...rows]
  const [item] = next.splice(idx, 1)
  next.splice(target, 0, item!)
  return next
}

/** Map visual order (top → bottom) to API ids (bottom sort_order 0 → top). */
export function cvSectionReorderIds<T extends { id: string }>(rows: readonly T[]): string[] {
  return [...rows].reverse().map((r) => r.id)
}
