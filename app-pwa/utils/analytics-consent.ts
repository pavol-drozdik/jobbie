import {
  captureGtmPageView,
  loadGtm,
  teardownGtmAnalytics,
  teardownMetaPixel,
  signalAnalyticsConsentToGtm,
  signalMarketingConsentToGtm,
} from '~/utils/gtm-client'
import { initPosthogIfConsented, shutdownPosthog } from '~/utils/posthog-client'
import {
  setAnalyticsConsentGranted,
  setMarketingConsentGranted,
} from '~/utils/cookie-consent-state'

type ConsentSignal = 'granted' | 'denied'

export function initGtagConsentDefault(): (...args: unknown[]) => void {
  window.dataLayer = window.dataLayer ?? []
  function gtag(...args: unknown[]): void {
    window.dataLayer.push(args)
  }
  window.gtag = gtag
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 2000,
  })
  return gtag
}

export function syncGtagConsent(analyticsGranted: boolean, marketingGranted = false): void {
  const analyticsSignal: ConsentSignal = analyticsGranted ? 'granted' : 'denied'
  const adSignal: ConsentSignal = marketingGranted ? 'granted' : 'denied'
  window.gtag?.('consent', 'update', {
    analytics_storage: analyticsSignal,
    ad_storage: adSignal,
    ad_user_data: adSignal,
    ad_personalization: adSignal,
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted',
  })
}

/** Cookie domain variants for analytics cookie expiry (host + registrable root). */
export function analyticsCookieDomainVariants(hostname: string): (string | undefined)[] {
  const variants: (string | undefined)[] = [undefined, hostname, `.${hostname}`]
  const parts = hostname.split('.')
  if (parts.length >= 2) {
    const root = parts.slice(-2).join('.')
    if (root !== hostname) {
      variants.push(root, `.${root}`)
    }
  }
  return variants
}

function expireCookie(name: string, domain?: string): void {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  const base = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax${secure}`
  document.cookie = base
  if (domain) {
    document.cookie = `${base}; domain=${domain}`
  }
}

function clearStorageKeys(storage: Storage, predicate: (key: string) => boolean): void {
  try {
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i)
      if (key && predicate(key)) {
        storage.removeItem(key)
      }
    }
  } catch {
    /* ignore */
  }
}

function clearAnalyticsCookies(): void {
  if (!import.meta.client) {
    return
  }
  const domainVariants = analyticsCookieDomainVariants(location.hostname)

  for (const name of ['_ga', '_gid', '_gat', '_clck', '_clsk']) {
    for (const domain of domainVariants) {
      expireCookie(name, domain)
    }
  }

  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0]?.trim()
    if (!name) {
      continue
    }
    if (name.startsWith('_ga_') || name.startsWith('ph_') || name.startsWith('_cl')) {
      for (const domain of domainVariants) {
        expireCookie(name, domain)
      }
    }
  }

  clearStorageKeys(localStorage, (key) => key.startsWith('ph_') || key.toLowerCase().includes('clarity'))
  clearStorageKeys(sessionStorage, (key) => key.toLowerCase().includes('clarity'))
}

/** Expire Meta Pixel identifiers (_fbp/_fbc) when marketing consent is withdrawn. */
function clearMarketingCookies(): void {
  if (!import.meta.client) {
    return
  }
  const domainVariants = analyticsCookieDomainVariants(location.hostname)
  for (const name of ['_fbp', '_fbc']) {
    for (const domain of domainVariants) {
      expireCookie(name, domain)
    }
  }
}

/**
 * Enable or disable third-party tags based on cookie consent.
 * GTM hosts both analytics (GA4/Clarity/PostHog) and marketing (Meta Pixel) tags, so the
 * container loads when either category is granted; per-tag firing is gated via Consent Mode
 * (`analytics_storage` / `ad_storage`) and the consent dataLayer events.
 */
export function applyAnalyticsConsentEffect(
  analyticsGranted: boolean,
  marketingGranted = false,
): void {
  setAnalyticsConsentGranted(analyticsGranted)
  setMarketingConsentGranted(marketingGranted)
  syncGtagConsent(analyticsGranted, marketingGranted)
  signalAnalyticsConsentToGtm(analyticsGranted)
  signalMarketingConsentToGtm(marketingGranted)

  if (analyticsGranted || marketingGranted) {
    loadGtm()
  }

  if (analyticsGranted) {
    initPosthogIfConsented()
    captureGtmPageView()
  } else {
    shutdownPosthog()
    clearAnalyticsCookies()
  }

  if (marketingGranted) {
    // Pixel is fired inside GTM via the marketing consent trigger — nothing to inject here.
  } else {
    teardownMetaPixel()
    clearMarketingCookies()
  }

  // Fully remove the GTM bootstrap only when no optional category remains.
  if (!analyticsGranted && !marketingGranted) {
    teardownGtmAnalytics()
  }

  window.dispatchEvent(new Event('jobbie:analytics-consent-changed'))
}

/** Enable or disable third-party tags based on cookie consent. */
export function applyAnalyticsConsent(analyticsGranted: boolean, marketingGranted = false): void {
  if (!import.meta.client) {
    return
  }
  applyAnalyticsConsentEffect(analyticsGranted, marketingGranted)
}
