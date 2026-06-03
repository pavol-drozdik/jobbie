/**
 * Returns true when the API is running in production (Node convention).
 */
export function isNodeProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Parses comma-separated CORS origins (trimmed). Empty string yields null (caller: use dev fallback).
 */
export function parseCorsOriginsFromEnv(raw: string | undefined): string[] | null {
  const s = raw?.trim();
  if (!s) return null;
  const parts = s
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : null;
}
