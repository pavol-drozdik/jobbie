/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  analyticsCookieDomainVariants,
  applyAnalyticsConsentEffect,
  initGtagConsentDefault,
  syncGtagConsent,
} from './analytics-consent'
import { setAnalyticsConsentGranted } from './cookie-consent-state'

const captureGtmPageView = vi.fn()
const loadGtm = vi.fn()
const teardownGtmAnalytics = vi.fn()
const teardownMetaPixel = vi.fn()
const signalAnalyticsConsentToGtm = vi.fn()
const signalMarketingConsentToGtm = vi.fn()
const initPosthogIfConsented = vi.fn()
const shutdownPosthog = vi.fn()

vi.mock('~/utils/gtm-client', () => ({
  captureGtmPageView: (...args: unknown[]) => captureGtmPageView(...args),
  loadGtm: (...args: unknown[]) => loadGtm(...args),
  teardownGtmAnalytics: (...args: unknown[]) => teardownGtmAnalytics(...args),
  teardownMetaPixel: (...args: unknown[]) => teardownMetaPixel(...args),
  signalAnalyticsConsentToGtm: (...args: unknown[]) => signalAnalyticsConsentToGtm(...args),
  signalMarketingConsentToGtm: (...args: unknown[]) => signalMarketingConsentToGtm(...args),
}))

vi.mock('~/utils/posthog-client', () => ({
  initPosthogIfConsented: (...args: unknown[]) => initPosthogIfConsented(...args),
  shutdownPosthog: (...args: unknown[]) => shutdownPosthog(...args),
}))

describe('analytics-consent', () => {
  beforeEach(() => {
    captureGtmPageView.mockClear()
    loadGtm.mockClear()
    teardownGtmAnalytics.mockClear()
    teardownMetaPixel.mockClear()
    signalAnalyticsConsentToGtm.mockClear()
    signalMarketingConsentToGtm.mockClear()
    initPosthogIfConsented.mockClear()
    shutdownPosthog.mockClear()
    setAnalyticsConsentGranted(false)
    window.dataLayer = []
    window.gtag = undefined
    document.cookie = ''
  })

  it('initGtagConsentDefault sets wait_for_update to 2000ms', () => {
    initGtagConsentDefault()
    const consentDefault = window.dataLayer.find(
      (entry) => Array.isArray(entry) && entry[0] === 'consent' && entry[1] === 'default',
    ) as unknown[] | undefined
    expect(consentDefault).toBeDefined()
    expect((consentDefault?.[2] as { wait_for_update?: number }).wait_for_update).toBe(2000)
  })

  it('applyAnalyticsConsentEffect(true) grants consent, signals GTM, and starts PostHog', () => {
    initGtagConsentDefault()
    const events: Event[] = []
    window.addEventListener('jobbie:analytics-consent-changed', (e) => events.push(e))

    applyAnalyticsConsentEffect(true)

    expect(signalAnalyticsConsentToGtm).toHaveBeenCalledWith(true)
    expect(loadGtm).toHaveBeenCalled()
    expect(initPosthogIfConsented).toHaveBeenCalled()
    expect(captureGtmPageView).toHaveBeenCalled()
    expect(shutdownPosthog).not.toHaveBeenCalled()
    expect(events).toHaveLength(1)

    const consentUpdate = window.dataLayer.find(
      (entry) => Array.isArray(entry) && entry[0] === 'consent' && entry[1] === 'update',
    ) as unknown[] | undefined
    expect((consentUpdate?.[2] as { analytics_storage?: string }).analytics_storage).toBe('granted')
  })

  it('applyAnalyticsConsentEffect(false) withdraws consent and tears down analytics', () => {
    initGtagConsentDefault()
    applyAnalyticsConsentEffect(true)
    applyAnalyticsConsentEffect(false)

    expect(signalAnalyticsConsentToGtm).toHaveBeenLastCalledWith(false)
    expect(shutdownPosthog).toHaveBeenCalled()
    expect(teardownGtmAnalytics).toHaveBeenCalled()
    expect(initPosthogIfConsented).toHaveBeenCalledTimes(1)
  })

  it('syncGtagConsent updates analytics_storage signal', () => {
    initGtagConsentDefault()
    syncGtagConsent(false)
    const denied = window.dataLayer.at(-1) as unknown[]
    expect((denied[2] as { analytics_storage?: string }).analytics_storage).toBe('denied')

    syncGtagConsent(true)
    const granted = window.dataLayer.at(-1) as unknown[]
    expect((granted[2] as { analytics_storage?: string }).analytics_storage).toBe('granted')
  })

  it('syncGtagConsent drives ad_storage from the marketing signal', () => {
    initGtagConsentDefault()
    syncGtagConsent(true, false)
    const noMarketing = window.dataLayer.at(-1) as unknown[]
    expect((noMarketing[2] as { ad_storage?: string }).ad_storage).toBe('denied')
    expect((noMarketing[2] as { ad_user_data?: string }).ad_user_data).toBe('denied')

    syncGtagConsent(true, true)
    const marketing = window.dataLayer.at(-1) as unknown[]
    expect((marketing[2] as { ad_storage?: string }).ad_storage).toBe('granted')
    expect((marketing[2] as { ad_personalization?: string }).ad_personalization).toBe('granted')
  })

  it('applyAnalyticsConsentEffect loads GTM and signals GTM when only marketing is granted', () => {
    initGtagConsentDefault()

    applyAnalyticsConsentEffect(false, true)

    expect(signalMarketingConsentToGtm).toHaveBeenLastCalledWith(true)
    expect(loadGtm).toHaveBeenCalled()
    expect(teardownGtmAnalytics).not.toHaveBeenCalled()
    expect(teardownMetaPixel).not.toHaveBeenCalled()
    // Analytics stays off: PostHog must not start.
    expect(initPosthogIfConsented).not.toHaveBeenCalled()

    const consentUpdate = window.dataLayer.find(
      (entry) => Array.isArray(entry) && entry[0] === 'consent' && entry[1] === 'update',
    ) as unknown[] | undefined
    expect((consentUpdate?.[2] as { ad_storage?: string }).ad_storage).toBe('granted')
  })

  it('applyAnalyticsConsentEffect tears down the Meta Pixel when marketing is withdrawn', () => {
    initGtagConsentDefault()
    applyAnalyticsConsentEffect(true, true)
    applyAnalyticsConsentEffect(true, false)

    expect(signalMarketingConsentToGtm).toHaveBeenLastCalledWith(false)
    expect(teardownMetaPixel).toHaveBeenCalled()
    // Analytics still granted, so the GTM bootstrap must stay.
    expect(teardownGtmAnalytics).not.toHaveBeenCalled()
  })

  it('analyticsCookieDomainVariants includes registrable root domain', () => {
    expect(analyticsCookieDomainVariants('www.jobbie.sk')).toEqual([
      undefined,
      'www.jobbie.sk',
      '.www.jobbie.sk',
      'jobbie.sk',
      '.jobbie.sk',
    ])
  })
})
