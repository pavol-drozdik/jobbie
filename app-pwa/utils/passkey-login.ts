/** True when the user dismissed the WebAuthn / passkey prompt (not a server error). */
export function isPasskeyUserCancellation(message: string | undefined): boolean {
  const lower = message?.trim().toLowerCase() ?? ''
  if (!lower) {
    return false
  }
  return (
    lower.includes('not allowed') ||
    lower.includes('notallowed') ||
    lower.includes('cancel') ||
    lower.includes('abort') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  )
}
