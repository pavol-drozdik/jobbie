import { ConfigService } from '@nestjs/config';
import { ProfileAuthCacheService } from './profile-auth-cache.service';
import { RedisService } from '../redis/redis.service';

describe('ProfileAuthCacheService', () => {
  it('stores and reads from memory when redis is disabled', async () => {
    const redis = {
      isEnabled: () => false,
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    } as unknown as RedisService;
    const config = {
      get: (key: string) => {
        if (key === 'PROFILE_AUTH_CACHE_TTL_SEC') return '300';
        if (key === 'PROFILE_AUTH_CACHE_MAX_ENTRIES') return '100';
        return undefined;
      },
    } as ConfigService;
    const cache = new ProfileAuthCacheService(config, redis);
    const payload = {
      role: 'individual' as const,
      appRole: 'user' as const,
      permissionScopes: [],
      accountStatus: 'active' as const,
    };
    await cache.set('user-1', payload);
    const hit = await cache.get('user-1');
    expect(hit).toEqual(payload);
    await cache.invalidate('user-1');
    expect(await cache.get('user-1')).toBeNull();
  });
});
