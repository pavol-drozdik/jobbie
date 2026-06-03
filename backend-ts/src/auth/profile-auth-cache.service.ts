import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  profileAuthCacheHitsTotal,
  profileAuthCacheInvalidationsTotal,
  profileAuthCacheMissesTotal,
} from '../observability/metrics';
import { RedisService } from '../redis/redis.service';
import type { AppRole } from './auth.types';

const REDIS_KEY_PREFIX = 'jobbie:profile:auth:v1:';

export type CachedProfileAuthPayload = {
  role: 'individual' | 'company';
  appRole: AppRole;
  permissionScopes: string[];
  accountStatus: 'active' | 'suspended' | 'closed';
};

type MemoryEntry = {
  value: CachedProfileAuthPayload;
  expiresAt: number;
};

@Injectable()
export class ProfileAuthCacheService {
  private readonly memory = new Map<string, MemoryEntry>();

  private readonly ttlMs: number;

  private readonly maxMemoryEntries: number;

  constructor(
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    const ttlSec = Number(this.config.get<string>('PROFILE_AUTH_CACHE_TTL_SEC') ?? 300);
    this.ttlMs = Math.max(30, ttlSec) * 1000;
    this.maxMemoryEntries = Math.max(
      100,
      Number(this.config.get<string>('PROFILE_AUTH_CACHE_MAX_ENTRIES') ?? 10_000),
    );
  }

  async get(userId: string): Promise<CachedProfileAuthPayload | null> {
    const now = Date.now();
    if (this.redis.isEnabled()) {
      const raw = await this.redis.get(`${REDIS_KEY_PREFIX}${userId}`);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as CachedProfileAuthPayload & { expiresAt?: number };
          if (!parsed.expiresAt || parsed.expiresAt > now) {
            profileAuthCacheHitsTotal.inc({ layer: 'redis' });
            return parsed;
          }
          await this.redis.del(`${REDIS_KEY_PREFIX}${userId}`);
        } catch {
          await this.redis.del(`${REDIS_KEY_PREFIX}${userId}`);
        }
      }
    }
    const mem = this.memory.get(userId);
    if (mem && mem.expiresAt > now) {
      profileAuthCacheHitsTotal.inc({ layer: 'memory' });
      return mem.value;
    }
    if (mem) {
      this.memory.delete(userId);
    }
    return null;
  }

  async set(userId: string, value: CachedProfileAuthPayload): Promise<void> {
    const expiresAt = Date.now() + this.ttlMs;
    if (this.redis.isEnabled()) {
      const ttlSec = Math.ceil(this.ttlMs / 1000);
      await this.redis.setex(
        `${REDIS_KEY_PREFIX}${userId}`,
        ttlSec,
        JSON.stringify({ ...value, expiresAt }),
      );
    }
    this.memory.set(userId, { value, expiresAt });
    while (this.memory.size > this.maxMemoryEntries) {
      const oldest = this.memory.keys().next().value;
      if (!oldest) {
        break;
      }
      this.memory.delete(oldest);
    }
  }

  recordMiss(): void {
    profileAuthCacheMissesTotal.inc();
  }

  async invalidate(userId: string): Promise<void> {
    profileAuthCacheInvalidationsTotal.inc();
    this.memory.delete(userId);
    if (this.redis.isEnabled()) {
      await this.redis.del(`${REDIS_KEY_PREFIX}${userId}`);
    }
  }
}
