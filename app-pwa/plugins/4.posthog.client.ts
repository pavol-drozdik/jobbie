import {
  getPosthogClient,
  initPosthogIfConsented,
  syncPosthogWithConsent,
} from '~/utils/posthog-client'

/**
 * PostHog (EU): lean product analytics — manual $pageview, custom events, triggered replay.
 * Loads only after analytics cookie consent. See utils/posthog-client.ts.
 */
export default defineNuxtPlugin(() => {
  if (!import.meta.client) {
    return {}
  }
  syncPosthogWithConsent()
  initPosthogIfConsented()
  return {
    provide: {
      posthog: () => getPosthogClient(),
    },
  }
})
