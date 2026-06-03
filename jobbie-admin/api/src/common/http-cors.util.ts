import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { isNodeProduction, parseCorsOriginsFromEnv } from './runtime-env.util';

const CORS_METHODS = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] as const;
const CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'Accept',
  'X-CSRF-Token',
];

/**
 * Express / Nest HTTP CORS: allowlist from CORS_ORIGINS in production; permissive in dev.
 */
export function buildNestCorsOptions(): CorsOptions {
  const allowed = parseCorsOriginsFromEnv(process.env.CORS_ORIGINS);
  const base: Pick<CorsOptions, 'credentials' | 'methods' | 'allowedHeaders'> = {
    credentials: true,
    methods: [...CORS_METHODS],
    allowedHeaders: [...CORS_HEADERS],
  };
  if (!isNodeProduction() || !allowed) {
    return { ...base, origin: true };
  }
  return {
    ...base,
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
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
  const allowed = parseCorsOriginsFromEnv(process.env.CORS_ORIGINS);
  if (!isNodeProduction() || !allowed) {
    return true;
  }
  return (
    origin: string | undefined,
    callback: (err: Error | null, ok?: boolean) => void,
  ) => {
    if (!origin) {
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
