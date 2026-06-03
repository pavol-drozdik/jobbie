import { fetchWithTimeout, resolveOutboundTimeoutMs } from './fetch-with-timeout';

describe('fetchWithTimeout', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses resolveOutboundTimeoutMs default', () => {
    expect(resolveOutboundTimeoutMs()).toBeGreaterThan(0);
  });

  it('rejects when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as typeof fetch;
    await expect(
      fetchWithTimeout('https://example.test', { timeoutMs: 100 }),
    ).rejects.toThrow('network');
  });
});
