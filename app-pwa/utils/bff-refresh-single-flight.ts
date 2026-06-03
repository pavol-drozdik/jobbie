import {
  refreshBffSessionFromApi,
  type BffSessionRefreshBody,
} from '~/utils/bff-session-refresh'

type RefreshResult = { ok: boolean; body: BffSessionRefreshBody }

let inFlight: Promise<RefreshResult> | null = null

/**
 * Ensures concurrent 401 handlers share one BFF refresh round-trip (rotation-safe).
 */
export function refreshBffSessionSingleFlight(
  apiBase: string,
): Promise<RefreshResult> {
  if (inFlight) return inFlight
  inFlight = refreshBffSessionFromApi(apiBase).finally(() => {
    inFlight = null
  })
  return inFlight
}

/** Clear in-flight refresh (logout / tests). */
export function clearBffRefreshInFlight(): void {
  inFlight = null
}

/** @deprecated Use clearBffRefreshInFlight */
export const resetBffRefreshSingleFlightForTests = clearBffRefreshInFlight
