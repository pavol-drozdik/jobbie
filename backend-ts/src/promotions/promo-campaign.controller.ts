import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { OptionalAuth } from '../auth/optional-auth.decorator';
import { Public } from '../auth/public.decorator';
import { PromoRedeemDto, PromoValidateDto } from './promo-campaign.dto';
import { PromoCampaignService } from './promo-campaign.service';

@Controller('promotions')
export class PromoCampaignController {
  constructor(private readonly promos: PromoCampaignService) {}

  @Get('active')
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  async active() {
    return this.promos.getPublicActive();
  }

  @Post('validate')
  @OptionalAuth()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async validate(
    @Req() req: Request,
    @Body() body: PromoValidateDto,
  ) {
    const user = (req as Request & { user?: CurrentUser | null }).user ?? null;
    const originalCents =
      body.context === 'credit_checkout' || body.context === 'subscription_checkout'
        ? await this.promos.getListPriceCents({
            context: body.context,
            packSlug: body.pack_slug,
            planSlug: body.plan_slug,
          })
        : undefined;
    const result = await this.promos.validateForUser(user?.id ?? null, {
      code: body.code,
      context: body.context,
      packSlug: body.pack_slug,
      planSlug: body.plan_slug,
      originalCents,
    });
    return {
      valid: result.valid,
      preview: result.preview,
      reasons: PromoCampaignService.filterPublicValidateReasons(result.reasons),
    };
  }

  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async redeem(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: PromoRedeemDto,
  ) {
    if (body.context !== 'signup' && body.context !== 'first_publish') {
      return { ok: false, reason: 'invalid_context' };
    }
    return this.promos.redeemFreeCredits(
      user.id,
      body.context,
      body.code,
      body.use_metadata_fallback === true,
    );
  }
}
