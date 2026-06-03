import { IoAdapter } from '@nestjs/platform-socket.io';
import { Logger } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';
import type { INestApplication } from '@nestjs/common';

/**
 * Socket.IO adapter backed by Redis pub/sub when REDIS_URL is set.
 * Required for horizontal scaling across multiple API instances.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null;

  constructor(
    app: INestApplication,
    private readonly redisUrl: string | undefined,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const url = this.redisUrl?.trim();
    if (!url) {
      return;
    }
    const pub = new Redis(url, { maxRetriesPerRequest: 2 });
    const sub = pub.duplicate();
    pub.on('error', (err) => this.logger.warn(`Redis pub: ${err.message}`));
    sub.on('error', (err) => this.logger.warn(`Redis sub: ${err.message}`));
    this.adapterConstructor = createAdapter(pub, sub);
    this.logger.log('Socket.IO Redis adapter enabled');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
