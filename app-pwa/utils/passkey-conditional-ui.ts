/** Whether the browser can show passkeys in the username/email autofill UI. */
export async function isPasskeyConditionalUiAvailable(): Promise<boolean> {
  if (!import.meta.client) return false
  if (typeof window.PublicKeyCredential === 'undefined') return false
  const probe = PublicKeyCredential as PublicKeyCredential & {
    isConditionalMediationAvailable?: () => Promise<boolean>
  }
  if (typeof probe.isConditionalMediationAvailable !== 'function') return false
  try {
    return await probe.isConditionalMediationAvailable()
  } catch {
    return false
  }
}

export function isWebAuthnAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const name = 'name' in err ? String((err as { name?: string }).name ?? '') : ''
  return name === 'AbortError'
}
