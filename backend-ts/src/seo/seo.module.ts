import { Module } from '@nestjs/common';
import { BlogModule } from '../blog/blog.module';
import { RedisModule } from '../redis/redis.module';
import { SeoController } from './seo.controller';
import { SeoFeedService } from './seo-feed.service';
import { IndexNowService } from './indexnow.service';
import { SeoService } from './seo.service';

@Module({
  imports: [BlogModule, RedisModule],
  controllers: [SeoController],
  providers: [SeoService, SeoFeedService, IndexNowService],
  exports: [IndexNowService],
})
export class SeoModule {}
