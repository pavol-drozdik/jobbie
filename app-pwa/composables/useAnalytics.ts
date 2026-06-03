import { onMounted, ref, type Ref } from 'vue'
import {
  capturePosthogEvent,
  getPosthogClient,
  identifyPosthogUser,
  isPosthogCapturing,
  isPosthogKeyConfigured,
  resetPosthog,
} from '~/utils/posthog-client'

/**
 * Product analytics (PostHog). No-ops when PostHog is not configured or analytics consent denied.
 */
export function useAnalytics() {
  function capture(event: string, properties?: Record<string, unknown>): void {
    capturePosthogEvent(event, properties)
  }

  function identify(
    user: {
      id: string
      email: string
      role: string
      appRole: string
    },
    profile: {
      role: string
      customer_role: boolean
      worker_role: boolean
      provider_role: boolean
    } | null,
  ): void {
    identifyPosthogUser(user, profile)
  }

  function reset(): void {
    resetPosthog()
  }

  return { capture, identify, reset }
}

/**
 * Feature flags via PostHog. Returns default when disabled or not loaded.
 * Re-enable `advanced_disable_flags` in posthog-client when the first flag ships.
 */
export function useFeatureFlag(flagKey: string, defaultValue = false): Ref<boolean> {
  const enabled = ref(defaultValue)
  if (!import.meta.client) {
    return enabled
  }
  if (!isPosthogKeyConfigured()) {
    return enabled
  }
  function apply(): void {
    const client = getPosthogClient()
    if (!client || !isPosthogCapturing()) {
      enabled.value = defaultValue
      return
    }
    try {
      const v = client.isFeatureEnabled(flagKey)
      enabled.value = v === undefined ? defaultValue : Boolean(v)
    } catch {
      enabled.value = defaultValue
    }
  }
  onMounted(() => {
    const client = getPosthogClient()
    if (client) {
      client.onFeatureFlags(() => {
        apply()
      })
    }
    apply()
  })
  return enabled
}
