import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Optional Redis connection for caching and BullMQ.
 * When REDIS_URL is unset, all operations no-op / return null.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL')?.trim();
    if (!url) {
      this.client = null;
      return;
    }
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: false,
      });
      this.client.on('error', (err: Error) => {
        this.logger.warn(`Redis error: ${err.message}`);
      });
    } catch (err) {
      this.logger.warn(`Redis disabled: ${String(err)}`);
      this.client = null;
    }
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  getRawClient(): Redis | null {
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) {
      return null;
    }
    try {
      const v = await this.client.get(key);
      return v ?? null;
    } catch {
      return null;
    }
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.client.setex(key, ttlSeconds, value);
    } catch {
      // ignore
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) {
      return;
    }
    try {
      await this.client.del(key);
    } catch {
      // ignore
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => undefined);
    }
  }
}
