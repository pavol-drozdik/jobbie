/**
 * Client error tracking and Vue integration. Enable with NUXT_PUBLIC_SENTRY_DSN.
 * Loads only after analytics cookie consent.
 */
import { isAnalyticsConsentGranted } from '~/utils/cookie-consent-state'
import {
  isPublicApiSameOriginAsPage,
  resolvePublicApiBase,
} from '~/utils/api-base-url'

let sentryInitialized = false

/**
 * Function names / script URLs injected by in-app browser WebViews (Instagram, Facebook,
 * TikTok…). Their native-bridge instrumentation throws on our pages during navigation/unload
 * — e.g. `window.webkit.messageHandlers` missing on iPad, or "Java object is gone" on Android
 * when the bridge is torn down. These are third-party and not actionable, so we drop them.
 */
const IN_APP_BROWSER_BRIDGE_RE =
  /sendDataToNative|sendPageHideMessage|sendBeforeUnloadMessage|navigation_performance_logger|iabjs:\/\//i

/** True when any exception frame originates from an in-app browser native bridge. */
function isInAppBrowserBridgeError(event: {
  exception?: { values?: { stacktrace?: { frames?: { function?: string; filename?: string }[] } }[] }
}): boolean {
  const values = event.exception?.values ?? []
  return values.some((value) =>
    (value.stacktrace?.frames ?? []).some(
      (frame) =>
        IN_APP_BROWSER_BRIDGE_RE.test(frame.function ?? '') ||
        IN_APP_BROWSER_BRIDGE_RE.test(frame.filename ?? ''),
    ),
  )
}

function buildTracePropagationTargets(apiBaseUrl: string | undefined): (string | RegExp)[] {
  const targets: (string | RegExp)[] = [/^https?:\/\/localhost/]
  if (import.meta.client && typeof window !== 'undefined') {
    targets.unshift(window.location.origin)
  }
  const apiBase = resolvePublicApiBase(apiBaseUrl)
  // Only attach sentry-trace/baggage to same-origin API (dev proxy). Cross-origin
  // production calls need matching CORS allow-headers on Nest.
  if (import.meta.client && isPublicApiSameOriginAsPage(apiBase)) {
    targets.unshift(apiBase)
  }
  return targets
}

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
        ignoreErrors: [
          'Failed to fetch dynamically imported module',
          'Importing a module script failed',
          'error loading dynamically imported module',
          "Couldn't resolve component",
          // In-app browser (Instagram/Facebook/TikTok WebView) native-bridge noise.
          "window.webkit.messageHandlers",
          'Java object is gone',
        ],
        beforeSend(event) {
          return isInAppBrowserBridgeError(event) ? null : event
        },
        environment:
          typeof config.sentryEnvironment === 'string' ? config.sentryEnvironment : undefined,
        integrations: [
          Sentry.browserTracingIntegration({
            router,
            routeLabel: 'path',
          }),
        ],
        tracePropagationTargets: buildTracePropagationTargets(
          typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl : undefined,
        ),
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
