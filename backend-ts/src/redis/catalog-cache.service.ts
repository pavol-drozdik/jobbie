import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

const DEFAULT_TTL_SECONDS = 600;
const MAX_INFLIGHT = 200;

/** Redis keys for public billing catalog (flush via `invalidateCatalog()`). */
export const CATALOG_CACHE_KEYS = {
  plansList: 'catalog:plans-list:v7',
  billingConfig: 'catalog:billing-config:v9',
  subscriptionPlans: 'catalog:subscription-plans:v2',
  creditPacks: 'catalog:credit-packs:v2',
} as const;

@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);
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
    const trimmed = prefix.trim();
    if (!trimmed) {
      return;
    }
    const deleted = await this.redis.delByPrefix(trimmed);
    if (deleted > 0) {
      this.logger.log(`catalog cache invalidated prefix=${trimmed} keys=${deleted}`);
    }
  }

  /** Drop all known public catalog cache entries after `subscription_plans` / `credit_packs` edits. */
  async invalidateCatalog(): Promise<void> {
    await this.invalidate('catalog:');
  }
}
