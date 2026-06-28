import type { RequestHandler } from 'express';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { isNodeProduction, parseCorsOriginsFromEnv } from './runtime-env.util';

type CorsFactory = (options: CorsOptions) => RequestHandler;

// `cors` is CJS (`module.exports = fn`). `import cors from 'cors'` compiles to
// `cors_1.default(...)` and crashes without `esModuleInterop` in tsconfig.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const corsFactory = require('cors') as CorsFactory;

const CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
const CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'X-CSRF-Token',
  'sentry-trace',
  'baggage',
];

/**
 * Default dev origin allowlist used when `CORS_ORIGINS` is unset outside of
 * production. We avoid a reflective CORS origin (echoing any Origin header
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

/**
 * Liveness/monitoring paths — skip credentialed CORS when there is no `Origin`
 * header (Docker, curl, Netdata). Browser probes from the PWA still run CORS.
 */
const CORS_BYPASS_PATHS = new Set(['/health']);

/** Public SEO read-only routes — Nitro server-side $fetch (sitemap, feeds) sends no Origin. */
const CORS_BYPASS_PREFIXES = ['/api/seo/'] as const;

export function shouldBypassCors(path: string): boolean {
  if (CORS_BYPASS_PATHS.has(path)) return true;
  return CORS_BYPASS_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * True when the request has no browser Origin (or Undici's opaque `Origin: null`).
 * Used with {@link shouldBypassCors} for liveness/SEO probe paths only.
 */
export function isCorsProbeOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  return origin === 'null';
}

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
    // Non-browser requests have no Origin header. In production we reject on API
    // routes because credentialed PWA calls must carry Origin (see
    // shouldBypassCors for /health and /api/seo/*). Dev tolerates missing Origin for curl.
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

/** Express CORS middleware — stable CJS load (see corsFactory above). */
export function createExpressCorsMiddleware(options: CorsOptions): RequestHandler {
  return corsFactory(options);
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
