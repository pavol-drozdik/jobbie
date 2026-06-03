import { timingSafeEqual } from 'crypto';

/**
 * Constant-time comparison of two strings.
 *
 * Returns false when either input is empty or lengths differ (length is not a
 * secret — checking it first is safe and avoids passing different-length
 * buffers to `timingSafeEqual` which throws).
 *
 * Use for comparing CSRF tokens, refresh-token hashes, HMAC-style shared
 * secrets (metrics bearer, debug header secrets, search-analytics secret).
 */
export function timingSafeStringEqual(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
