import { isAnalyticsConsentGranted } from '~/utils/cookie-consent-state'

let gtmLoaded = false
let routerHookRegistered = false
let consentListenerRegistered = false

const GTM_CONTAINER_ID_PATTERN = /^GTM-[A-Z0-9]+$/i

/** Third-party analytics tags injected by GTM (not the container bootstrap). */
export const INJECTED_ANALYTICS_SCRIPT_RE =
  /googletagmanager\.com\/gtag\/|google-analytics\.com|clarity\.ms|scripts\.clarity\.ms|c\.bing\.com|doubleclick\.net/i

/** Meta Pixel tag injected by GTM (fbevents.js bootstrap + /tr beacon). */
export const INJECTED_MARKETING_SCRIPT_RE = /connect\.facebook\.net|facebook\.com\/tr/i

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

export type RegistrationEventDetails = {
  /** 'individual' | 'company' — mapped to a Meta content_category / GA4 param in GTM. */
  accountType: string
  /** Sign-up method for GA4 `sign_up` (email, google…). */
  method?: string
  /** True when the account was created but still needs email confirmation. */
  emailConfirmationPending: boolean
}

/**
 * Push a registration conversion to the dataLayer. GTM maps `sign_up` to GA4 sign_up and the
 * Meta Pixel `CompleteRegistration` tag. Pushed unconditionally — GTM's marketing-consent
 * trigger + Consent Mode decide whether it forwards to Meta, so no user is tracked without consent.
 */
export function trackRegistrationComplete(details: RegistrationEventDetails): void {
  if (!import.meta.client) {
    return
  }
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    event: 'sign_up',
    method: details.method ?? 'email',
    account_type: details.accountType,
    email_confirmation_pending: details.emailConfirmationPending,
  })
}

/** Custom dataLayer events so the Meta Pixel tag fires/stops on marketing consent changes. */
export function signalMarketingConsentToGtm(granted: boolean): void {
  if (!import.meta.client) {
    return
  }
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    event: granted ? 'marketing_consent_granted' : 'marketing_consent_withdrawn',
    marketing_consent: granted,
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
 * Load Google Tag Manager after analytics cookie consent (GA4/Clarity tags live in the container).
 * Call only from applyAnalyticsConsent(true) — not on first paint without consent.
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

const GTM_BOOTSTRAP_SCRIPT_RE = /googletagmanager\.com\/gtm\.js/i

/** Stop Clarity / GA tags injected by GTM (not the container bootstrap). */
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

/** Remove the Meta Pixel bootstrap + beacons and neutralize fbq on marketing consent withdraw. */
export function teardownMetaPixel(): void {
  if (!import.meta.client) {
    return
  }
  document.querySelectorAll('script[src]').forEach((el) => {
    const src = el.getAttribute('src') ?? ''
    if (INJECTED_MARKETING_SCRIPT_RE.test(src)) {
      el.remove()
    }
  })
  if (typeof window.fbq === 'function') {
    window.fbq = () => {}
  }
}

/** Remove GTM bootstrap + all injected tags on consent withdraw so no tag can keep sending. */
export function teardownGtmAnalytics(): void {
  if (!import.meta.client) {
    return
  }
  purgeInjectedAnalyticsScripts()
  teardownMetaPixel()
  document.querySelectorAll('script[src]').forEach((el) => {
    const src = el.getAttribute('src') ?? ''
    if (GTM_BOOTSTRAP_SCRIPT_RE.test(src)) {
      el.remove()
    }
  })
  gtmLoaded = false
}

/** @deprecated Prefer teardownGtmAnalytics + syncGtagConsent(false). */
export function unloadGtm(): void {
  teardownGtmAnalytics()
}
