/** Keyset cursor for (created_at, id) descending lists. */

export type KeysetCursorV1 = {
  readonly v: 1;
  readonly t: string;
  readonly i: string;
};

export function encodeKeysetCursor(createdAt: string, id: string): string {
  const payload: KeysetCursorV1 = { v: 1, t: createdAt, i: id };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeKeysetCursor(
  raw: string | undefined,
): { createdAt: string; id: string } | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(raw.trim(), 'base64url').toString('utf8'),
    ) as KeysetCursorV1;
    if (
      parsed?.v === 1 &&
      typeof parsed.t === 'string' &&
      parsed.t.length > 0 &&
      typeof parsed.i === 'string' &&
      parsed.i.length > 0
    ) {
      return { createdAt: parsed.t, id: parsed.i };
    }
  } catch {
    // ignore
  }
  return null;
}
