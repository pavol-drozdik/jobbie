import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CatalogCacheService } from './catalog-cache.service';

@Global()
@Module({
  providers: [RedisService, CatalogCacheService],
  exports: [RedisService, CatalogCacheService],
})
export class RedisModule {}
