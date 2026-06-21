import { applyAnalyticsConsent } from '~/utils/analytics-consent'
import { logCookieConsentEvent } from '~/utils/cookie-consent-log'
import {
  closeCookiePreferences,
  cookieConsentSource,
  cookiePreferencesOpen,
  openCookiePreferences,
} from '~/utils/cookie-consent-ui'
import {
  buildConsentPayload,
  categoriesEqual,
  categoriesFromPayload,
  hadOptionalConsent,
  hasValidConsentChoice,
  type CookieConsentAction,
  type CookieConsentCategories,
  type CookieConsentSource,
  ensureConsentVisitorId,
  useConsentCookieRef,
} from '~/utils/cookie-consent-state'

const ALL_GRANTED: CookieConsentCategories = {
  analytics: true,
  marketing: true,
  personalization: true,
}

const ALL_DENIED: CookieConsentCategories = {
  analytics: false,
  marketing: false,
  personalization: false,
}

export function useCookieConsentStore() {
  const consentCookie = useConsentCookieRef()

  const categories = computed(() => categoriesFromPayload(consentCookie.value))
  const hasChoice = computed(() => import.meta.client && hasValidConsentChoice(consentCookie.value))
  const showBanner = computed(() => import.meta.client && !hasChoice.value)
  const analyticsEnabled = computed(() => categories.value.analytics)
  const marketingEnabled = computed(() => categories.value.marketing)
  const personalizationEnabled = computed(() => categories.value.personalization)

  function persist(
    next: CookieConsentCategories,
    action: CookieConsentAction,
    source?: CookieConsentSource,
  ): void {
    const previous = categoriesFromPayload(consentCookie.value)
    const resolvedAction =
      action === 'save' && hadOptionalConsent(previous) && !hadOptionalConsent(next)
        ? 'withdraw'
        : action
    const resolvedSource = source ?? cookieConsentSource.value

    ensureConsentVisitorId()
    consentCookie.value = buildConsentPayload(next)
    applyAnalyticsConsent(next.analytics)
    logCookieConsentEvent({
      action: resolvedAction,
      source: resolvedSource,
      categories: next,
    })
  }

  function acceptAll(source: CookieConsentSource = 'banner'): void {
    persist(ALL_GRANTED, 'accept_all', source)
    closeCookiePreferences()
  }

  function rejectAll(source?: CookieConsentSource): void {
    persist(ALL_DENIED, 'reject_all', source)
    closeCookiePreferences()
  }

  function savePreferences(
    opts: CookieConsentCategories,
    source: CookieConsentSource = 'preferences',
  ): void {
    persist(opts, 'save', source)
    closeCookiePreferences()
  }

  function isDirtyDraft(draft: CookieConsentCategories): boolean {
    return !categoriesEqual(draft, categories.value)
  }

  return {
    preferencesOpen: cookiePreferencesOpen,
    hasChoice,
    categories,
    analyticsEnabled,
    marketingEnabled,
    personalizationEnabled,
    showBanner,
    acceptAll,
    rejectAll,
    savePreferences,
    isDirtyDraft,
    openPreferences: openCookiePreferences,
    closePreferences: closeCookiePreferences,
  }
}
