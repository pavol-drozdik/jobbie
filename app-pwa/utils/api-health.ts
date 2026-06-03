import { normalizePublicApiBase } from '~/utils/api-base-url'
import { fetchApi } from '~/utils/api-fetch'

const HEALTH_TIMEOUT_MS = 3000

/**
 * Probes Nest `GET /health` on the configured API origin (not the Vite proxy origin).
 * Used to avoid Socket.IO reconnect storms when the API process is down.
 */
export async function isNestApiReachable(
  configuredApiBaseUrl: string | undefined,
): Promise<boolean> {
  const origin = normalizePublicApiBase(configuredApiBaseUrl)
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
    const res = await fetchApi(`${origin}/health`, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return res.ok
  } catch {
    return false
  }
}
