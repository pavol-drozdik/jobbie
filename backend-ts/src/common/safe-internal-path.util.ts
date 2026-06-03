const UNSAFE_SCHEME = /^(javascript|data|vbscript|file|blob):/i;

/** Server-side internal navigation path (notifications, push). */
export function sanitizeInternalLinkPath(
  input: string | null | undefined,
  fallback = '/',
): string {
  if (!input || typeof input !== 'string') return fallback;
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (UNSAFE_SCHEME.test(trimmed)) return fallback;
  if (/[\\]/.test(trimmed)) return fallback;
  if (trimmed.includes('@')) return fallback;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('%2f%2f') ||
    lower.includes('%5c%5c') ||
    lower.includes('%2f%5c')
  ) {
    return fallback;
  }
  return trimmed;
}
