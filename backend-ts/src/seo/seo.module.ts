import { Module } from '@nestjs/common';
import { BlogModule } from '../blog/blog.module';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';

@Module({
  imports: [BlogModule],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
