import { loadGtm, unloadGtm } from '~/utils/gtm-client'
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
    security_storage: 'denied',
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
    security_storage: 'denied',
  })
}

function expireCookie(name: string, domain?: string): void {
  const base = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
  document.cookie = base
  if (domain) {
    document.cookie = `${base}; domain=${domain}`
  }
}

function clearAnalyticsCookies(): void {
  if (!import.meta.client) {
    return
  }
  const hostname = location.hostname
  const domainVariants = [undefined, hostname, `.${hostname}`]

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
    if (name.startsWith('_ga_') || name.startsWith('ph_')) {
      for (const domain of domainVariants) {
        expireCookie(name, domain)
      }
    }
  }

  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i)
      if (key?.startsWith('ph_')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    /* ignore */
  }
}

/** Enable or disable third-party analytics based on cookie consent. */
export function applyAnalyticsConsent(granted: boolean): void {
  if (!import.meta.client) {
    return
  }
  setAnalyticsConsentGranted(granted)
  syncGtagConsent(granted)
  if (granted) {
    initPosthogIfConsented()
    loadGtm()
    return
  }
  shutdownPosthog()
  unloadGtm()
  clearAnalyticsCookies()
}
