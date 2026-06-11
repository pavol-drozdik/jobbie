import { describe, expect, it } from 'vitest'
import { isWebAuthnAbortError } from '~/utils/passkey-conditional-ui'

describe('isWebAuthnAbortError', () => {
  it('detects AbortError', () => {
    expect(isWebAuthnAbortError({ name: 'AbortError', message: 'aborted' })).toBe(true)
  })

  it('ignores other errors', () => {
    expect(isWebAuthnAbortError(new Error('NotAllowedError'))).toBe(false)
  })
})
