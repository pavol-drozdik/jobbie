import {
  captureGtmPageView,
  purgeInjectedAnalyticsScripts,
  signalAnalyticsConsentToGtm,
} from '~/utils/gtm-client'
import { initPosthogIfConsented, shutdownPosthog } from '~/utils/posthog-client'
import { setAnalyticsConsentGranted } from '~/utils/cookie-consent-state'

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

export function syncGtagConsent(analyticsGranted: boolean): void {
  const signal: ConsentSignal = analyticsGranted ? 'granted' : 'denied'
  window.gtag?.('consent', 'update', {
    analytics_storage: signal,
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
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

/** Enable or disable third-party analytics based on cookie consent. */
export function applyAnalyticsConsentEffect(granted: boolean): void {
  setAnalyticsConsentGranted(granted)
  syncGtagConsent(granted)
  signalAnalyticsConsentToGtm(granted)
  if (granted) {
    initPosthogIfConsented()
    captureGtmPageView()
    window.dispatchEvent(new Event('jobbie:analytics-consent-changed'))
    return
  }
  shutdownPosthog()
  purgeInjectedAnalyticsScripts()
  clearAnalyticsCookies()
  window.dispatchEvent(new Event('jobbie:analytics-consent-changed'))
}

/** Enable or disable third-party analytics based on cookie consent. */
export function applyAnalyticsConsent(granted: boolean): void {
  if (!import.meta.client) {
    return
  }
  applyAnalyticsConsentEffect(granted)
}
