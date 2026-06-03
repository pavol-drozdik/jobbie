const UNSAFE_SCHEME = /^(javascript|data|vbscript|file|blob):/i;

/**
 * Returns a normalized https URL or null when unsafe / invalid.
 */
export function sanitizeExternalUrl(
  raw: string | null | undefined,
  options?: { allowHttp?: boolean },
): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || UNSAFE_SCHEME.test(trimmed)) return null;
  let href = trimmed;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    href = `https://${href.replace(/^\/+/, '')}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(href);
  } catch {
    return null;
  }
  if (parsed.username || parsed.password) return null;
  const scheme = parsed.protocol.toLowerCase();
  if (scheme === 'https:') return parsed.href;
  if (scheme === 'http:' && options?.allowHttp) return parsed.href;
  return null;
}
