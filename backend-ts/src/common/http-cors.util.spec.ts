import {
  createExpressCorsMiddleware,
  shouldBypassCors,
  buildNestCorsOptions,
} from './http-cors.util';

describe('shouldBypassCors', () => {
  it('allows /health without Origin for Docker and load-balancer probes', () => {
    expect(shouldBypassCors('/health')).toBe(true);
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
});
