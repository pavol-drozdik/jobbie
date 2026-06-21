export function fieldUnchangedSinceSend(current: unknown, baseline: unknown): boolean {
  if (Object.is(current, baseline)) return true
  return JSON.stringify(current ?? null) === JSON.stringify(baseline ?? null)
}

/**
 * Applies a server PATCH result without clobbering fields the user edited while the request was in flight.
 */
export function mergePatchResponse<T extends Record<string, unknown>>(
  current: T,
  updated: Partial<T>,
  baselineAtSend: T,
): T {
  const out = { ...current }
  for (const key of Object.keys(updated) as Array<keyof T>) {
    if (fieldUnchangedSinceSend(current[key], baselineAtSend[key])) {
      out[key] = updated[key] as T[keyof T]
    }
  }
  return out
}
