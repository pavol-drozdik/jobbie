import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { PricingInquiryDto } from './pricing-inquiry.dto';
import { PricingInquiriesService } from './pricing-inquiries.service';

/**
 * Public pricing / addon services contact form (no JWT). Rate-limited to reduce abuse.
 */
@Controller('pricing-inquiries')
@Public()
export class PricingInquiriesController {
  constructor(private readonly inquiries: PricingInquiriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(@Body() body: PricingInquiryDto): Promise<{ ok: true }> {
    return this.inquiries.submit(body);
  }
}
