/** Extract PaymentIntent id from a PaymentIntent client_secret (`pi_…_secret_…`). */
export function paymentIntentIdFromClientSecret(clientSecret: string): string | null {
  const trimmed = clientSecret.trim()
  const secretIdx = trimmed.indexOf('_secret_')
  if (secretIdx > 0) {
    const prefix = trimmed.slice(0, secretIdx)
    if (prefix.startsWith('pi_')) return prefix
  }
  const match = trimmed.match(/^(pi_[a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}

/** Extract SetupIntent id from a SetupIntent client_secret (`seti_…_secret_…`). */
export function setupIntentIdFromClientSecret(clientSecret: string): string | null {
  const trimmed = clientSecret.trim()
  const secretIdx = trimmed.indexOf('_secret_')
  if (secretIdx > 0) {
    const prefix = trimmed.slice(0, secretIdx)
    if (prefix.startsWith('seti_')) return prefix
  }
  const match = trimmed.match(/^(seti_[a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}

export function isSetupIntentClientSecret(clientSecret: string): boolean {
  return clientSecret.trim().startsWith('seti_')
}
