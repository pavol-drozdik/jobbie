/**
 * Client error tracking and Vue integration. Enable with NUXT_PUBLIC_SENTRY_DSN.
 * Sentry is loaded on idle so it does not compete with first paint.
 */
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
    void import('@sentry/vue').then((Sentry) => {
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
    })
  }

  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(initSentry, { timeout: 4000 })
  } else {
    setTimeout(initSentry, 2000)
  }
})
