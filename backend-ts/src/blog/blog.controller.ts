import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { BlogListQueryDto } from './blog.dto';
import { BlogService } from './blog.service';

@Controller('blog')
@Public()
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  list(@Query() query: BlogListQueryDto) {
    return this.blog.listPublic(query);
  }

  @Get(':slug')
  @Header('Cache-Control', 'public, max-age=120')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  getBySlug(@Param('slug') slug: string) {
    return this.blog.getPublicBySlug(slug);
  }
}
