/** Opaque cursor for search pagination (offset-based; stable for a given query). */

export type SearchOffsetCursorV1 = {
  readonly v: 1;
  readonly o: number;
};

const MAX_OFFSET = 8000;

export function encodeSearchOffsetCursor(offset: number): string {
  const o = Math.min(Math.max(Math.floor(offset), 0), MAX_OFFSET);
  const payload: SearchOffsetCursorV1 = { v: 1, o };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

/** Returns validated offset or null if invalid. */
export function decodeSearchOffsetCursor(raw: string | undefined): number | null {
  if (!raw?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(raw.trim(), 'base64url').toString('utf8'),
    ) as SearchOffsetCursorV1;
    if (
      parsed?.v === 1 &&
      typeof parsed.o === 'number' &&
      Number.isFinite(parsed.o) &&
      parsed.o >= 0 &&
      parsed.o <= MAX_OFFSET
    ) {
      return Math.floor(parsed.o);
    }
  } catch {
    // ignore
  }
  return null;
}

export function resolveSearchOffset(params: {
  cursor?: string;
  offset?: number;
  page?: number;
  limit?: number;
}): number {
  const page = Number(params.page);
  const limit = Number(params.limit);
  if (
    Number.isFinite(page) &&
    page >= 1 &&
    Number.isFinite(limit) &&
    limit >= 1
  ) {
    return Math.min(Math.floor((page - 1) * limit), MAX_OFFSET);
  }
  const fromCursor = decodeSearchOffsetCursor(params.cursor);
  if (fromCursor !== null) {
    return fromCursor;
  }
  const o = Math.max(Number(params.offset) || 0, 0);
  return Math.min(o, MAX_OFFSET);
}
