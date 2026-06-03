import { COOKIE_ACCESS } from './session/session.constants';

/** Parse jb_at from Socket.IO handshake Cookie header (when Path=/). */
export function readAccessTokenFromSocketHandshake(
  headers: Record<string, string | string[] | undefined> | undefined,
): string | undefined {
  const raw = headers?.cookie;
  const cookieHeader = Array.isArray(raw) ? raw.join('; ') : raw;
  if (!cookieHeader || typeof cookieHeader !== 'string') {
    return undefined;
  }
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${COOKIE_ACCESS}=`)) continue;
    const value = trimmed.slice(COOKIE_ACCESS.length + 1).trim();
    if (value) return decodeURIComponent(value);
  }
  return undefined;
}

export function normalizeSocketBearerToken(
  token: string | undefined,
): string | undefined {
  if (!token || typeof token !== 'string') return undefined;
  const t = token.trim();
  if (!t) return undefined;
  if (t.toLowerCase().startsWith('bearer ')) {
    return t.slice(7).trim() || undefined;
  }
  return t;
}

export function resolveSocketAuthToken(
  handshake: {
    auth?: { token?: string };
    query?: { token?: string };
    headers?: { authorization?: string; cookie?: string };
  },
): string | undefined {
  const fromAuth = normalizeSocketBearerToken(handshake.auth?.token);
  if (fromAuth) return fromAuth;
  const fromQuery = normalizeSocketBearerToken(
    typeof handshake.query?.token === 'string' ? handshake.query.token : undefined,
  );
  if (fromQuery) return fromQuery;
  const authHeader = handshake.headers?.authorization;
  if (typeof authHeader === 'string') {
    const fromHeader = normalizeSocketBearerToken(authHeader);
    if (fromHeader) return fromHeader;
  }
  return readAccessTokenFromSocketHandshake(handshake.headers);
}
