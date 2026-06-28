import { hasActiveBffSession } from '~/utils/bff-csrf-state'
import { resolveApiBearerToken } from '~/utils/api-bearer-token'
import { isNestApiReachable } from '~/utils/api-health'

export default defineNuxtPlugin(() => {
  const { session, user } = useAuth()
  const { getApiBaseUrl } = useApi()
  const config = useRuntimeConfig().public
  const realtime = useRealtimeSocket()

  let apiReachable: boolean | null = null
  let healthProbeInFlight: Promise<boolean> | null = null
  let healthRetryTimer: ReturnType<typeof setTimeout> | null = null

  async function ensureApiReachable(): Promise<boolean> {
    if (apiReachable !== null) {
      return apiReachable
    }
    if (!healthProbeInFlight) {
      healthProbeInFlight = isNestApiReachable(
        config.apiBaseUrl as string | undefined,
      ).finally(() => {
        healthProbeInFlight = null
      })
    }
    apiReachable = await healthProbeInFlight
    return apiReachable
  }

  function scheduleHealthRetry(): void {
    if (healthRetryTimer) {
      return
    }
    healthRetryTimer = setTimeout(() => {
      healthRetryTimer = null
      apiReachable = null
      void sync()
    }, 15_000)
  }

  async function sync(): Promise<void> {
    if (!user.value) {
      realtime.disconnect()
      return
    }
    const reachable = await ensureApiReachable()
    if (!reachable) {
      realtime.disconnect()
      scheduleHealthRetry()
      return
    }
    if (healthRetryTimer) {
      clearTimeout(healthRetryTimer)
      healthRetryTimer = null
    }
    const baseUrl = getApiBaseUrl()
    if (hasActiveBffSession()) {
      realtime.connect(baseUrl)
      return
    }
    const token = resolveApiBearerToken(session.value) ?? null
    if (token) {
      realtime.connect(baseUrl, { bearerToken: token })
    } else {
      realtime.disconnect()
    }
  }

  void sync()

  watch(
    () =>
      [
        user.value?.id ?? null,
        hasActiveBffSession(),
        resolveApiBearerToken(session.value) ?? null,
      ] as const,
    () => {
      void sync()
    },
  )
})
