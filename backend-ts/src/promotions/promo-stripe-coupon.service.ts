import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import StripeSdk from 'stripe';
import { STRIPE_API_VERSION, type StripeClient } from '../payments/stripe-types';
import type { PromoCampaignRow } from './promo-campaign.types';

@Injectable()
export class PromoStripeCouponService {
  private readonly logger = new Logger(PromoStripeCouponService.name);

  constructor(private readonly config: ConfigService) {}

  private getStripe(): StripeClient | null {
    const key = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (!key) return null;
    return new StripeSdk(key, { apiVersion: STRIPE_API_VERSION }) as StripeClient;
  }

  async syncCouponForCampaign(campaign: PromoCampaignRow): Promise<string | null> {
    if (campaign.reward_type !== 'subscription_discount') {
      return null;
    }
    const isPercent = (campaign.discount_kind ?? 'percent') === 'percent';
    if (isPercent && !campaign.reward_percent) {
      return null;
    }
    if (!isPercent && !campaign.reward_amount_cents) {
      return null;
    }
    const stripe = this.getStripe();
    if (!stripe) {
      this.logger.warn('Stripe not configured — skipping coupon sync');
      return campaign.stripe_coupon_id;
    }
    const duration = campaign.subscription_discount_duration ?? 'once';
    const name = `Promo ${campaign.code}`.slice(0, 40);

    if (campaign.stripe_coupon_id?.trim()) {
      try {
        await stripe.coupons.del(campaign.stripe_coupon_id);
      } catch (err) {
        this.logger.warn(
          `Could not delete old coupon ${campaign.stripe_coupon_id}: ${String(err)}`,
        );
      }
    }

    const durationParams =
      duration === 'repeating'
        ? {
            duration: 'repeating' as const,
            duration_in_months: campaign.subscription_discount_duration_months ?? 1,
          }
        : { duration: duration as 'once' | 'forever' };

    const coupon = await stripe.coupons.create({
      ...(isPercent
        ? { percent_off: campaign.reward_percent! }
        : {
            amount_off: campaign.reward_amount_cents!,
            currency: 'eur',
          }),
      ...durationParams,
      name,
      metadata: {
        promo_campaign_id: campaign.id,
        promo_code: campaign.code,
      },
    });
    return coupon.id;
  }

  async deleteCouponForCampaign(campaign: PromoCampaignRow): Promise<void> {
    const couponId = campaign.stripe_coupon_id?.trim();
    if (!couponId || campaign.reward_type !== 'subscription_discount') {
      return;
    }
    const stripe = this.getStripe();
    if (!stripe) {
      this.logger.warn('Stripe not configured — skipping coupon delete');
      return;
    }
    try {
      await stripe.coupons.del(couponId);
    } catch (err) {
      this.logger.warn(`Could not delete coupon ${couponId}: ${String(err)}`);
    }
  }
}
