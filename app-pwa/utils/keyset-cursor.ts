/** Keyset cursor for chat message pagination (matches backend `common/keyset-cursor.ts`). */

type KeysetCursorV1 = {
  readonly v: 1
  readonly t: string
  readonly i: string
}

export function encodeKeysetCursor(createdAt: string, id: string): string {
  const payload: KeysetCursorV1 = { v: 1, t: createdAt, i: id }
  const json = JSON.stringify(payload)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf8').toString('base64url')
  }
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
