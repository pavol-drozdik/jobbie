import { describe, expect, it } from 'vitest'
import { deserializePasskeyRequestOptions } from '~/utils/passkey-webauthn-serialize'

describe('deserializePasskeyRequestOptions', () => {
  it('converts base64url challenge to ArrayBuffer', () => {
    const options = deserializePasskeyRequestOptions({
      challenge: 'AQID', // bytes 1,2,3
      rpId: 'localhost',
    })
    expect(options.challenge).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(options.challenge as ArrayBuffer)).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('converts allowCredentials ids', () => {
    const options = deserializePasskeyRequestOptions({
      challenge: 'AQ',
      allowCredentials: [{ id: 'Ag', type: 'public-key' }],
    })
    expect(options.allowCredentials?.[0]?.id).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(options.allowCredentials![0]!.id as ArrayBuffer)).toEqual(
      new Uint8Array([2]),
    )
  })
})
