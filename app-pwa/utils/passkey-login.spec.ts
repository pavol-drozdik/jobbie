import { describe, expect, it } from 'vitest'
import { isPasskeyUserCancellation } from '~/utils/passkey-login'

describe('isPasskeyUserCancellation', () => {
  it('detects user dismissal', () => {
    expect(isPasskeyUserCancellation('The operation either timed out or was not allowed.')).toBe(
      true,
    )
  })

  it('does not treat server errors as cancellation', () => {
    expect(isPasskeyUserCancellation('Credential verification failed')).toBe(false)
  })
})
