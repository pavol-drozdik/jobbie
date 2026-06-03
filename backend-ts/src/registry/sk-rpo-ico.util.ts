/**
 * Slovak IČO (identifikačné číslo organizácie): 8 digits, often formatted with spaces.
 */
export function normalizeSkIco(raw: string | null | undefined): string {
  if (raw == null) return '';
  return String(raw).replace(/\s+/g, '').replace(/\D/g, '');
}

function parseIsoDateBoundary(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return ms;
}

/**
 * RPO search item: treat as active employer record when termination is absent or in the future.
 * ŠÚ SR JSON uses `termination` on the subject (see RPO OpenAPI / Apiary mock).
 */
export function isRpoSearchResultActive(row: Record<string, unknown>): boolean {
  const endMs = parseIsoDateBoundary(row.termination);
  if (endMs == null) return true;
  return endMs > Date.now();
}

/**
 * Parses GET /rpo/v1/search?identifier=… JSON: `{ results: [ … ] }`.
 * Returns true when at least one result looks like an active subject.
 */
export function parseRpoSearchResponseIndicatesActiveSubject(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const o = json as Record<string, unknown>;
  const results = o.results;
  if (!Array.isArray(results) || results.length === 0) return false;
  for (const item of results) {
    if (item && typeof item === 'object' && isRpoSearchResultActive(item as Record<string, unknown>)) {
      return true;
    }
  }
  return false;
}
