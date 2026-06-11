import { Controller, Get, Header, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { SeoFeedService } from './seo-feed.service';
import { SeoService } from './seo.service';

@Controller('seo')
@Public()
export class SeoController {
  constructor(
    private readonly seo: SeoService,
    private readonly feeds: SeoFeedService,
  ) {}

  @Get('sitemap')
  @Header('Cache-Control', 'public, max-age=300')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  sitemap() {
    return this.seo.buildSitemapPayload();
  }

  @Get('feeds/jobs')
  @Header('Cache-Control', 'public, max-age=300')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  jobsFeed(@Query('limit') limit?: string) {
    return this.feeds.listJobFeedItems(limit ? Number(limit) : undefined);
  }

  @Get('feeds/ads')
  @Header('Cache-Control', 'public, max-age=300')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  adsFeed(@Query('limit') limit?: string) {
    return this.feeds.listAdFeedItems(limit ? Number(limit) : undefined);
  }
}
