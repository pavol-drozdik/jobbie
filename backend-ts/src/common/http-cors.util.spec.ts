import type { NextFunction, Request, Response } from 'express';
import {
  createExpressCorsMiddleware,
  shouldBypassCors,
  buildNestCorsOptions,
} from './http-cors.util';

type CorsTestResult = {
  statusCode: number;
  acao?: string;
  acac?: string;
  acah?: string;
  rejected: boolean;
};

function runCorsMiddleware(
  origin: string | undefined,
  allowedOrigins: string[],
  requestHeaders?: Record<string, string>,
): CorsTestResult {
  const prev = process.env.CORS_ORIGINS;
  process.env.CORS_ORIGINS = allowedOrigins.join(',');
  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const mw = createExpressCorsMiddleware(buildNestCorsOptions());
  const req = {
    method: 'OPTIONS',
    headers: {
      ...(origin ? { origin } : {}),
      ...(requestHeaders ?? {}),
    },
  } as Request;
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
    },
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
    end() {
      /* noop */
    },
  } as unknown as Response;

  let rejected = false;
  const next: NextFunction = (err?: unknown) => {
    if (err) rejected = true;
  };
  mw(req, res, next);

  process.env.CORS_ORIGINS = prev;
  process.env.NODE_ENV = prevNodeEnv;

  return {
    statusCode: res.statusCode,
    acao: headers['access-control-allow-origin'],
    acac: headers['access-control-allow-credentials'],
    acah: headers['access-control-allow-headers'],
    rejected,
  };
}

describe('shouldBypassCors', () => {
  it('allows /health without Origin for Docker and load-balancer probes', () => {
    expect(shouldBypassCors('/health')).toBe(true);
  });

  it('allows /api/seo/* without Origin for Nitro server-side fetches', () => {
    expect(shouldBypassCors('/api/seo/sitemap')).toBe(true);
    expect(shouldBypassCors('/api/seo/feeds/jobs')).toBe(true);
    expect(shouldBypassCors('/api/seo/feeds/ads')).toBe(true);
  });

  it('does not bypass credentialed API routes', () => {
    expect(shouldBypassCors('/api/profiles/me')).toBe(false);
    expect(shouldBypassCors('/metrics')).toBe(false);
  });
});

describe('createExpressCorsMiddleware', () => {
  it('returns an Express middleware function', () => {
    const mw = createExpressCorsMiddleware(buildNestCorsOptions());
    expect(typeof mw).toBe('function');
    expect(mw.length).toBe(3);
  });

  it('reflects allowed origin exactly, never wildcard', () => {
    const allowed = 'https://jobbie.sk';
    const result = runCorsMiddleware(allowed, [allowed]);
    expect(result.acao).toBe(allowed);
    expect(result.acao).not.toBe('*');
    expect(result.acac).toBe('true');
    expect(result.rejected).toBe(false);
  });

  it('does not allow evil origin or Access-Control-Allow-Origin: *', () => {
    const result = runCorsMiddleware('https://evil.example', [
      'https://jobbie.sk',
    ]);
    expect(result.acao).toBeUndefined();
    expect(result.rejected).toBe(true);
  });

  it('allows Sentry distributed-tracing headers on preflight', () => {
    const result = runCorsMiddleware(
      'https://www.jobbie.sk',
      ['https://www.jobbie.sk'],
      {
        'access-control-request-headers': 'baggage,content-type,sentry-trace',
      },
    );
    expect(result.rejected).toBe(false);
    expect(result.acah?.toLowerCase()).toContain('baggage');
    expect(result.acah?.toLowerCase()).toContain('sentry-trace');
  });
});
