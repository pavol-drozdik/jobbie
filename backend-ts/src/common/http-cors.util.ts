import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { isNodeProduction, parseCorsOriginsFromEnv } from './runtime-env.util';

const CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
const CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'X-CSRF-Token',
];

/**
 * Default dev origin allowlist used when `CORS_ORIGINS` is unset outside of
 * production. We avoid the reflective `origin: true` pattern (which echoes
 * any Origin header alongside `Access-Control-Allow-Credentials: true`) so a
 * preview/staging deployment misconfigured with `NODE_ENV=development`
 * cannot serve authenticated responses to an arbitrary attacker page.
 */
const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
];

function resolveAllowedOrigins(): string[] {
  const fromEnv = parseCorsOriginsFromEnv(process.env.CORS_ORIGINS);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  if (isNodeProduction()) {
    // main.ts boot guard exits before we reach this branch — but be safe.
    return [];
  }
  return DEFAULT_DEV_ORIGINS;
}

function makeOriginValidator(allowed: string[]) {
  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ): void => {
    // Same-origin / non-browser requests have no Origin header. In production
    // we reject because every credentialed request from the PWA *must* carry
    // an Origin header. In non-production we tolerate it (curl/Postman) since
    // there is no credential reflection risk against a chosen attacker host.
    if (!origin) {
      if (isNodeProduction()) {
        callback(new Error('Not allowed by CORS'));
        return;
      }
      callback(null, true);
      return;
    }
    if (allowed.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  };
}

/**
 * Express / Nest HTTP CORS. Always allowlist-based — never reflective. In
 * production `CORS_ORIGINS` is required (main.ts exits if missing). In
 * non-production we fall back to a fixed localhost allowlist.
 */
export function buildNestCorsOptions(): CorsOptions {
  const allowed = resolveAllowedOrigins();
  return {
    credentials: true,
    methods: [...CORS_METHODS],
    allowedHeaders: [...CORS_HEADERS],
    origin: makeOriginValidator(allowed),
  };
}

type SocketIoCorsOrigin =
  | boolean
  | string[]
  | ((
      origin: string | undefined,
      callback: (err: Error | null, ok?: boolean) => void,
    ) => void);

/**
 * Socket.IO `cors.origin` option aligned with {@link buildNestCorsOptions}.
 */
export function buildSocketIoCorsOrigin(): SocketIoCorsOrigin {
  const allowed = resolveAllowedOrigins();
  return makeOriginValidator(allowed);
}
