import type {
  CookieConsentAction,
  CookieConsentCategories,
  CookieConsentSource,
} from '~/utils/cookie-consent-state'
import { COOKIE_POLICY_VERSION, ensureConsentVisitorId } from '~/utils/cookie-consent-state'

export function logCookieConsentEvent(opts: {
  action: CookieConsentAction
  source: CookieConsentSource
  categories: CookieConsentCategories
}): void {
  if (!import.meta.client) {
    return
  }
  const visitorId = ensureConsentVisitorId()
  const route = useRoute()
  const { api } = useApi()
  void api('/api/consent/cookie', {
    method: 'POST',
    body: {
      visitor_id: visitorId,
      action: opts.action,
      source: opts.source,
      analytics: opts.categories.analytics,
      marketing: opts.categories.marketing,
      personalization: opts.categories.personalization,
      policy_version: COOKIE_POLICY_VERSION,
      page_path: route.path.slice(0, 512),
    },
    skipSessionExpiry: true,
  }).catch(() => {
    /* consent UX must not block on network */
  })
}
