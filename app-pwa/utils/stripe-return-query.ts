/** Stripe Payment Element return query keys — strip from the URL immediately after read. */
export const STRIPE_RETURN_QUERY_KEYS = [
  'payment_intent',
  'payment_intent_client_secret',
  'redirect_status',
  'setup_intent',
  'setup_intent_client_secret',
] as const

export function readStripeReturnQuery(search: string): {
  paymentIntent: string | null
  setupIntent: string | null
  clientSecret: string | null
  redirectStatus: string | null
} {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const pi = params.get('payment_intent')?.trim() ?? null
  const si = params.get('setup_intent')?.trim() ?? null
  const secret = params.get('payment_intent_client_secret')?.trim() ?? null
  const redirectStatus = params.get('redirect_status')?.trim() ?? null
  return {
    paymentIntent: pi && pi.startsWith('pi_') ? pi : null,
    setupIntent: si && si.startsWith('seti_') ? si : null,
    clientSecret: secret,
    redirectStatus,
  }
}

/** Remove Stripe secrets from the address bar without a full navigation. */
export function stripStripeReturnQueryFromBrowserUrl(): void {
  if (!import.meta.client || typeof window === 'undefined') return
  const url = new URL(window.location.href)
  let changed = false
  for (const key of STRIPE_RETURN_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (!changed) return
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}
