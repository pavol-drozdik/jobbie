import { Controller, Get, Header } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { SeoService } from './seo.service';

@Controller('seo')
@Public()
export class SeoController {
  constructor(private readonly seo: SeoService) {}

  @Get('sitemap')
  @Header('Cache-Control', 'public, max-age=300')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  sitemap() {
    return this.seo.buildSitemapPayload();
  }
}
