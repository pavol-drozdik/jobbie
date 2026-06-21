/**
 * Client error tracking and Vue integration. Enable with NUXT_PUBLIC_SENTRY_DSN.
 * Loads only after analytics cookie consent.
 */
import { isAnalyticsConsentGranted } from '~/utils/cookie-consent-state'

let sentryInitialized = false

export default defineNuxtPlugin((nuxtApp) => {
  if (!import.meta.client) {
    return
  }
  const config = useRuntimeConfig().public
  const dsn = typeof config.sentryDsn === 'string' ? config.sentryDsn.trim() : ''
  if (!dsn) {
    return
  }

  const initSentry = (): void => {
    if (sentryInitialized || !isAnalyticsConsentGranted()) {
      return
    }
    void import('@sentry/vue').then((Sentry) => {
      if (!isAnalyticsConsentGranted()) {
        return
      }
      const tracesSampleRate = Number(config.sentryTracesSampleRate ?? 0)
      const router = useRouter()
      Sentry.init({
        app: nuxtApp.vueApp,
        dsn,
        environment:
          typeof config.sentryEnvironment === 'string' ? config.sentryEnvironment : undefined,
        integrations: [
          Sentry.browserTracingIntegration({
            router,
            routeLabel: 'path',
          }),
        ],
        tracePropagationTargets: [
          typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl : '',
          /^https?:\/\/localhost/,
        ],
        tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
        sendDefaultPii: false,
      })
      sentryInitialized = true
    })
  }

  const tryInit = (): void => {
    if (isAnalyticsConsentGranted()) {
      initSentry()
    }
  }

  tryInit()

  if (import.meta.client) {
    window.addEventListener('jobbie:analytics-consent-changed', tryInit)
    nuxtApp.hook('app:unmounted', () => {
      window.removeEventListener('jobbie:analytics-consent-changed', tryInit)
    })
  }
})
