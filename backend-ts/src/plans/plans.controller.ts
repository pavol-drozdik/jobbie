import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CatalogCacheService,
  CATALOG_CACHE_KEYS,
} from '../redis/catalog-cache.service';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { PlanResponseDto, MySubscriptionResponseDto } from './plans.dto';
import { Public } from '../auth/public.decorator';
import {
  PUBLIC_SUBSCRIPTION_PLAN_SLUGS,
  filterPublicSubscriptionPlans,
} from '../billing/public-pricing-catalog';
import { SubscriptionTrialService } from '../billing/subscription-trial.service';
import { BillingPurchaseAuthorizationService } from '../billing/billing-purchase-authorization.service';
import { StripeService } from '../payments/stripe.service';
import { resolveSubscriptionStripePriceId } from '../payments/stripe-catalog-prices';

@Controller('plans')
export class PlansController {
  constructor(
    private supabase: SupabaseService,
    private readonly catalogCache: CatalogCacheService,
    private readonly config: ConfigService,
    private readonly subscriptionTrial: SubscriptionTrialService,
    private readonly stripeService: StripeService,
    private readonly billingPurchaseAuth: BillingPurchaseAuthorizationService,
  ) {}

  /** Public: pricing table can load before the client session is ready. */
  @Get()
  @Public()
  @Header('Cache-Control', 'public, max-age=300')
  async list(): Promise<PlanResponseDto[]> {
    return this.catalogCache.getOrSet(CATALOG_CACHE_KEYS.plansList, async () => {
      const { data, error } = await this.supabase
        .getClient()
        .from('subscription_plans')
        .select(
          'id,slug,name_sk,price_monthly_cents,max_active_jobs,monthly_credits,max_cv_unlocks_monthly,max_cv_contacts_monthly,max_cv_pdf_downloads_monthly,sort_order,active,stripe_price_id',
        )
        .in('slug', [...PUBLIC_SUBSCRIPTION_PLAN_SLUGS])
        .order('sort_order');
      const rows = (data ?? []) as Array<
        PlanResponseDto & { active?: boolean; stripe_price_id?: string | null }
      >;
      const activeOnly = error
        ? rows
        : rows.filter((row) => row.active !== false);
      const filtered = filterPublicSubscriptionPlans(activeOnly);
      let stripe: ReturnType<StripeService['getStripeClientForTrialChecks']> | null =
        null;
      try {
        stripe = this.stripeService.getStripeClientForTrialChecks();
      } catch {
        stripe = null;
      }
      return Promise.all(
        filtered.map(async (row) => {
          const stripePriceId = resolveSubscriptionStripePriceId(
            this.config,
            row.slug,
            row.stripe_price_id ?? null,
          );
          const trial_period_days =
            stripe && stripePriceId
              ? await this.subscriptionTrial.getTrialPeriodDaysForPrice(
                  stripe,
                  stripePriceId,
                )
              : 0;
          return {
            ...row,
            trial_period_days,
          };
        }),
      );
    }, 900);
  }

  @Get('me')
  @UseGuards(JwksAuthGuard)
  async getMySubscription(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<MySubscriptionResponseDto | null> {
    await this.billingPurchaseAuth.assertBillingPurchaseAccessForUser(user.id);
    const { data: subData } = await this.supabase
      .getClient()
      .from('user_subscriptions')
      .select('plan_id,status,current_period_end')
      .eq('user_id', user.id)
      .limit(1);
    const sub = Array.isArray(subData) && subData.length > 0 ? subData[0] : null;
    if (!sub) return null;
    const { data: planData } = await this.supabase
      .getClient()
      .from('subscription_plans')
      .select('name_sk')
      .eq('id', (sub as { plan_id: string }).plan_id)
      .single();
    const name_sk =
      (planData as { name_sk?: string } | null)?.name_sk ?? '';
    return {
      plan_id: (sub as { plan_id: string }).plan_id,
      plan_name_sk: name_sk,
      status: (sub as { status: string }).status,
      current_period_end: (sub as { current_period_end?: string }).current_period_end ?? null,
    };
  }
}
