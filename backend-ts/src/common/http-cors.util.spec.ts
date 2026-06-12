import { shouldBypassCors } from './http-cors.util';

describe('shouldBypassCors', () => {
  it('allows /health without Origin for Docker and load-balancer probes', () => {
    expect(shouldBypassCors('/health')).toBe(true);
  });

  it('does not bypass credentialed API routes', () => {
    expect(shouldBypassCors('/api/profiles/me')).toBe(false);
    expect(shouldBypassCors('/metrics')).toBe(false);
  });
});
