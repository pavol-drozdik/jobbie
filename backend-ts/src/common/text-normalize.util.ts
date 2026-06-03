/**
 * Accent-insensitive search normalization (parity with Postgres jobbie_unaccent for ASCII folding).
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('sk-SK')
    .trim();
}
