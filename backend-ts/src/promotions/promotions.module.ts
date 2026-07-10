import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { BillingModule } from '../billing/billing.module';
import { PromoCampaignController } from './promo-campaign.controller';
import { PromoCampaignService } from './promo-campaign.service';
import { PromoStripeCouponService } from './promo-stripe-coupon.service';

@Module({
  imports: [AuditModule, BillingModule],
  controllers: [PromoCampaignController],
  providers: [PromoCampaignService, PromoStripeCouponService],
  exports: [PromoCampaignService],
})
export class PromotionsModule {}
