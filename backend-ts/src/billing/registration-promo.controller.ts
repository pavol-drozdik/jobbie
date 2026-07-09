import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { Public } from '../auth/public.decorator';
import {
  RegistrationPromoRedeemDto,
  RegistrationPromoValidateDto,
} from './registration-promo.dto';
import { RegistrationPromoService } from './registration-promo.service';
import { BillingPurchaseAuthorizationService } from './billing-purchase-authorization.service';

@Controller('promotions/registration')
export class RegistrationPromoController {
  constructor(
    private readonly promos: RegistrationPromoService,
    private readonly billingPurchaseAuth: BillingPurchaseAuthorizationService,
  ) {}

  @Get('status')
  @Public()
  @Header('Cache-Control', 'public, max-age=60')
  async status() {
    return this.promos.getPublicStatus();
  }

  @Post('validate')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async validate(@Body() body: RegistrationPromoValidateDto) {
    return this.promos.validateCode(body.code);
  }

  @Post('redeem')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async redeem(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: RegistrationPromoRedeemDto,
  ) {
    await this.billingPurchaseAuth.assertBillingPurchaseAccessForUser(user.id);
    return this.promos.redeem(
      user.id,
      body.code,
      body.use_metadata_fallback === true,
    );
  }
}
