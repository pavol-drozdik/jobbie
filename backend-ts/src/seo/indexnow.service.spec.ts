import { IndexNowService } from './indexnow.service';

describe('IndexNowService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function makeService(env: Record<string, string | undefined>): IndexNowService {
    return new IndexNowService({
      get: (key: string) => env[key],
    } as never);
  }

  it('skips when INDEXNOW_KEY is unset', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const svc = makeService({ PUBLIC_APP_URL: 'https://jobbie.sk' });
    svc.notifyJobPublished('job-1');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts IndexNow payload when configured', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;
    const svc = makeService({
      INDEXNOW_KEY: 'abc-key',
      PUBLIC_APP_URL: 'https://jobbie.sk',
    });
    svc.notifyJobPublished('job-1');
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.indexnow.org/indexnow',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.urlList).toEqual(['https://jobbie.sk/ponuka/job-1']);
    expect(body.keyLocation).toBe('https://jobbie.sk/abc-key.txt');
  });
});
