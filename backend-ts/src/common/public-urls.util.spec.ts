import {
  resolvePublicApiOrigin,
  resolvePublicAppOrigin,
} from './public-urls.util';

function mockConfig(values: Record<string, string | undefined>): {
  get: (key: string) => string | undefined;
} {
  return {
    get: (key: string) => values[key],
  };
}

describe('resolvePublicAppOrigin', () => {
  it('prefers PUBLIC_APP_ORIGIN over PUBLIC_APP_URL', () => {
    const origin = resolvePublicAppOrigin(
      mockConfig({
        PUBLIC_APP_ORIGIN: 'https://app.jobbie.sk/',
        PUBLIC_APP_URL: 'https://other.example.com',
      }),
    );
    expect(origin).toBe('https://app.jobbie.sk');
  });

  it('falls back to PUBLIC_APP_URL', () => {
    expect(
      resolvePublicAppOrigin(
        mockConfig({ PUBLIC_APP_URL: 'https://jobbie.app/' }),
      ),
    ).toBe('https://jobbie.app');
  });
});

describe('resolvePublicApiOrigin', () => {
  it('uses PUBLIC_API_URL when set', () => {
    expect(
      resolvePublicApiOrigin(
        mockConfig({
          PUBLIC_API_URL: 'http://localhost:8000/',
          PUBLIC_APP_URL: 'http://localhost:3001',
        }),
      ),
    ).toBe('http://localhost:8000');
  });

  it('strips trailing /api from PUBLIC_API_URL', () => {
    expect(
      resolvePublicApiOrigin(
        mockConfig({ PUBLIC_API_URL: 'https://api.jobbie.sk/api' }),
      ),
    ).toBe('https://api.jobbie.sk');
  });

  it('falls back to app origin when PUBLIC_API_URL unset', () => {
    expect(
      resolvePublicApiOrigin(
        mockConfig({ PUBLIC_APP_URL: 'https://jobbie.app' }),
      ),
    ).toBe('https://jobbie.app');
  });
});
