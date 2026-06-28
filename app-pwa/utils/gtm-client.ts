import { isAnalyticsConsentGranted } from '~/utils/cookie-consent-state'

let gtmLoaded = false
let routerHookRegistered = false
let consentListenerRegistered = false

const GTM_CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]+$/i

/** Third-party tags injected by GTM (not the container bootstrap). */
export const INJECTED_ANALYTICS_SCRIPT_RE =
  /googletagmanager\.com\/gtag\/|google-analytics\.com|clarity\.ms|scripts\.clarity\.ms|c\.bing\.com|doubleclick\.net/i

export function isGtmConfigured(): boolean {
  const config = useRuntimeConfig().public
  const id = typeof config.gtmContainerId === 'string' ? config.gtmContainerId.trim() : ''
  return id.length > 0 && GTM_CONTAINER_ID_PATTERN.test(id)
}

function pushPageView(pagePath: string): void {
  if (!gtmLoaded || !isAnalyticsConsentGranted()) {
    return
  }
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    event: 'page_view',
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export function captureGtmPageView(): void {
  if (!import.meta.client || !gtmLoaded) {
    return
  }
  pushPageView(useRouter().currentRoute.value.fullPath)
}

/** Custom dataLayer events for GTM triggers on mid-session grant / withdraw. */
export function signalAnalyticsConsentToGtm(granted: boolean): void {
  if (!import.meta.client) {
    return
  }
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    event: granted ? 'analytics_consent_granted' : 'analytics_consent_withdrawn',
    analytics_consent: granted,
  })
}

function registerRouterPageviews(): void {
  if (routerHookRegistered) {
    return
  }
  const router = useRouter()
  router.afterEach((to) => {
    pushPageView(to.fullPath)
  })
  routerHookRegistered = true
}

function registerConsentListener(): void {
  if (!import.meta.client || consentListenerRegistered) {
    return
  }
  window.addEventListener('jobbie:analytics-consent-changed', () => {
    if (isAnalyticsConsentGranted()) {
      captureGtmPageView()
    }
  })
  consentListenerRegistered = true
}

/**
 * Bootstrap Google Tag Manager on every page (Consent Mode gates tags until analytics consent).
 * Configure GA4, Clarity, and other tags inside the GTM container with analytics_storage checks.
 */
export function loadGtm(): void {
  if (!import.meta.client || gtmLoaded || !isGtmConfigured()) {
    return
  }
  const containerId = (useRuntimeConfig().public.gtmContainerId as string).trim().toUpperCase()
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`
  script.addEventListener('load', () => {
    captureGtmPageView()
  })
  document.head.appendChild(script)
  registerRouterPageviews()
  registerConsentListener()
  gtmLoaded = true
}

/** Stop Clarity / GA tags injected by GTM; keep the container bootstrap for consent updates. */
export function purgeInjectedAnalyticsScripts(): void {
  if (!import.meta.client) {
    return
  }
  document.querySelectorAll('script[src]').forEach((el) => {
    const src = el.getAttribute('src') ?? ''
    if (INJECTED_ANALYTICS_SCRIPT_RE.test(src)) {
      el.remove()
    }
  })
  if (typeof window.clarity === 'function') {
    ;(window as Window & { clarity?: (...args: unknown[]) => void }).clarity = () => {}
  }
}

/** @deprecated Prefer purgeInjectedAnalyticsScripts + syncGtagConsent(false). */
export function unloadGtm(): void {
  purgeInjectedAnalyticsScripts()
}
