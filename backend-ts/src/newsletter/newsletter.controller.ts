import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { NewsletterService } from './newsletter.service';
import { SubscribeDto } from './subscribe.dto';
import { Public } from '../auth/public.decorator';

/**
 * Public newsletter signup (no JWT). Rate-limited to reduce abuse.
 */
@Controller('subscribe')
@Public()
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async subscribe(@Body() body: SubscribeDto): Promise<{ ok: true; id: string }> {
    return this.newsletter.subscribe(body);
  }
}
