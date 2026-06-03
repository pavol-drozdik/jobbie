import { ConfigService } from '@nestjs/config';
import { SkRpoLookupService } from './sk-rpo-lookup.service';

describe('SkRpoLookupService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns false when IČO is not 8 digits (no fetch)', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    const config = { get: jest.fn() } as unknown as ConfigService;
    const service = new SkRpoLookupService(config);
    await expect(service.isIcoActiveInRpo('123')).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns true on 200 and active result JSON', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ id: 1, termination: null }] }),
    }) as unknown as typeof fetch;
    const config = { get: jest.fn().mockReturnValue('https://api.example/rpo/v1') } as unknown as ConfigService;
    const service = new SkRpoLookupService(config);
    await expect(service.isIcoActiveInRpo('50881337')).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example/rpo/v1/search?identifier=50881337&onlyActive=true',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('returns false on non-OK response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    }) as unknown as typeof fetch;
    const config = { get: jest.fn() } as unknown as ConfigService;
    const service = new SkRpoLookupService(config);
    await expect(service.isIcoActiveInRpo('50881337')).resolves.toBe(false);
  });

  it('returns false on fetch throw', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as unknown as typeof fetch;
    const config = { get: jest.fn() } as unknown as ConfigService;
    const service = new SkRpoLookupService(config);
    await expect(service.isIcoActiveInRpo('50881337')).resolves.toBe(false);
  });
});
