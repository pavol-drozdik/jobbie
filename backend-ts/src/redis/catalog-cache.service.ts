import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

const DEFAULT_TTL_SECONDS = 600;
const MAX_INFLIGHT = 200;

@Injectable()
export class CatalogCacheService {
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(private readonly redis: RedisService) {}

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  ): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        await this.redis.del(key);
      }
    }
    const existing = this.inflight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }
    const loader = (async (): Promise<T> => {
      try {
        const value = await factory();
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
        return value;
      } finally {
        this.inflight.delete(key);
      }
    })();
    if (this.inflight.size >= MAX_INFLIGHT) {
      const first = this.inflight.keys().next().value;
      if (first) {
        this.inflight.delete(first);
      }
    }
    this.inflight.set(key, loader);
    return loader;
  }

  async invalidate(prefix: string): Promise<void> {
    void prefix;
  }
}
