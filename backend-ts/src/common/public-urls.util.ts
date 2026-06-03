import type { ConfigService } from '@nestjs/config';

type ConfigLike = Pick<ConfigService, 'get'>;

const DEFAULT_PUBLIC_APP_ORIGIN = 'https://jobbie.app';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** Removes a trailing `/api` segment from an API base URL. */
function stripTrailingApiSegment(url: string): string {
  const base = stripTrailingSlash(url);
  return base.toLowerCase().endsWith('/api') ? base.slice(0, -4) : base;
}

/** PWA origin for deep links in email (manage hub, unsubscribe page). */
export function resolvePublicAppOrigin(config: ConfigLike): string {
  const raw =
    config.get<string>('PUBLIC_APP_ORIGIN')?.trim() ||
    config.get<string>('PUBLIC_APP_URL')?.trim() ||
    DEFAULT_PUBLIC_APP_ORIGIN;
  return stripTrailingSlash(raw);
}

/** Nest API origin for server actions linked from email (e.g. pause GET). */
export function resolvePublicApiOrigin(config: ConfigLike): string {
  const api = config.get<string>('PUBLIC_API_URL')?.trim();
  if (api) {
    return stripTrailingApiSegment(api);
  }
  return resolvePublicAppOrigin(config);
}
