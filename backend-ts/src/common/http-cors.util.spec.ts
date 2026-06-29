import type { NextFunction, Request, Response } from 'express';
import {
  createExpressCorsMiddleware,
  isCorsProbeOrigin,
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
  method = 'OPTIONS',
): CorsTestResult {
  const prev = process.env.CORS_ORIGINS;
  process.env.CORS_ORIGINS = allowedOrigins.join(',');
  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  const mw = createExpressCorsMiddleware(buildNestCorsOptions());
  const req = {
    method,
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

  it('allows /metrics without Origin for bearer scrapes (admin Infra, curl)', () => {
    expect(shouldBypassCors('/metrics')).toBe(true);
  });

  it('does not bypass credentialed API routes', () => {
    expect(shouldBypassCors('/api/profiles/me')).toBe(false);
  });
});

/** Mirrors `main.ts`: skip CORS only when bypass path and probe origin. */
function shouldApplyCorsMiddleware(path: string, origin: string | undefined): boolean {
  return !(shouldBypassCors(path) && isCorsProbeOrigin(origin));
}

describe('isCorsProbeOrigin', () => {
  it('treats missing Origin as a probe', () => {
    expect(isCorsProbeOrigin(undefined)).toBe(true);
  });

  it('treats Undici opaque Origin null as a probe', () => {
    expect(isCorsProbeOrigin('null')).toBe(true);
  });

  it('does not treat browser origins as probes', () => {
    expect(isCorsProbeOrigin('https://www.jobbie.sk')).toBe(false);
  });
});

describe('health browser probe CORS (main.ts)', () => {
  it('skips CORS for /health without Origin (Docker, curl)', () => {
    expect(shouldApplyCorsMiddleware('/health', undefined)).toBe(false);
  });

  it('skips CORS for /health with Undici Origin null (image HEALTHCHECK fetch)', () => {
    expect(shouldApplyCorsMiddleware('/health', 'null')).toBe(false);
  });

  it('applies CORS for /health when the PWA sends Origin', () => {
    expect(shouldApplyCorsMiddleware('/health', 'https://www.jobbie.sk')).toBe(
      true,
    );
    const result = runCorsMiddleware(
      'https://www.jobbie.sk',
      ['https://www.jobbie.sk', 'https://jobbie.sk'],
      undefined,
      'GET',
    );
    expect(result.acao).toBe('https://www.jobbie.sk');
    expect(result.rejected).toBe(false);
  });
});

describe('metrics probe CORS (main.ts)', () => {
  it('skips CORS for /metrics without Origin (admin Infra, curl)', () => {
    expect(shouldApplyCorsMiddleware('/metrics', undefined)).toBe(false);
  });

  it('skips CORS for /metrics with Undici Origin null', () => {
    expect(shouldApplyCorsMiddleware('/metrics', 'null')).toBe(false);
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
