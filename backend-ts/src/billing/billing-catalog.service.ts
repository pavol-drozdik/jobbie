import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { SupabaseService } from '../supabase/supabase.service';

import { CatalogCacheService } from '../redis/catalog-cache.service';
import { StripeService } from '../payments/stripe.service';
import { resolveSubscriptionStripePriceId } from '../payments/stripe-catalog-prices';
import { SubscriptionTrialService } from './subscription-trial.service';

import {
  CREDIT_PACKAGES,
  SUBSCRIPTION_PLAN_SPECS,
} from './billing.config';
import { getPublicPlanTierCreditCosts } from './plan-tier-credit-costs';
import {
  PUBLIC_SUBSCRIPTION_PLAN_SLUGS,
  filterPublicSubscriptionPlans,
} from './public-pricing-catalog';



export type MarketingCreditPackage = {

  slug: string;

  nameSk: string;

  credits: number;

  priceCents: number;

  currency: string;

  badge: string | null;

  stripePriceId?: string | null;

};



export type MarketingSubscriptionPlan = {

  slug: string;

  nameSk: string;

  priceMonthlyCents: number;

  monthlyCredits: number;

  maxActiveOffers: number;

  maxCvUnlocksMonthly: number | null;

  maxCvContactsMonthly: number | null;

  maxCvPdfDownloadsMonthly: number | null;

  badge: 'recommended' | null;

  /** From Stripe Price `recurring.trial_period_days` (0 = no trial on that price). */
  trialPeriodDays: number;

};



/** Public catalog from DB (credit_packs, subscription_plans); spend costs stay in billing.config.ts. */

@Injectable()

export class BillingCatalogService {

  private readonly logger = new Logger(BillingCatalogService.name);



  constructor(
    private readonly supabase: SupabaseService,
    private readonly catalogCache: CatalogCacheService,
    private readonly config: ConfigService,
    private readonly subscriptionTrial: SubscriptionTrialService,
    @Inject(forwardRef(() => StripeService))
    private readonly stripeService: StripeService,
  ) {}



  async getCreditPackages(): Promise<MarketingCreditPackage[]> {

    return this.catalogCache.getOrSet(

      'catalog:credit-packs',

      () => this.loadCreditPackages(),

      600,

    );

  }



  private async loadCreditPackages(): Promise<MarketingCreditPackage[]> {

    const { data, error } = await this.supabase

      .getClient()

      .from('credit_packs')

      .select(

        'slug, name_sk, credits, unit_amount, currency, badge, stripe_price_id, sort_order',

      )

      .eq('active', true)

      .neq('slug', 'agentura')

      .order('sort_order', { ascending: true });



    if (error) {

      this.logger.warn(`credit_packs load failed: ${error.message}`);

      return this.creditPackagesFromConfig();

    }



    const rows = (data ?? []) as Array<{

      slug: string;

      name_sk: string;

      credits: number;

      unit_amount: number;

      currency: string;

      badge: string | null;

      stripe_price_id: string | null;

    }>;



    if (rows.length === 0) {

      return this.creditPackagesFromConfig();

    }



    return rows.map((row) => ({

      slug: row.slug,

      nameSk: row.name_sk,

      credits: row.credits,

      priceCents: row.unit_amount,

      currency: row.currency ?? 'eur',

      badge: row.badge,

      stripePriceId: row.stripe_price_id,

    }));

  }



  async getSubscriptionPlans(): Promise<MarketingSubscriptionPlan[]> {

    return this.catalogCache.getOrSet(

      'catalog:subscription-plans',

      () => this.loadSubscriptionPlans(),

      900,

    );

  }



  private async loadSubscriptionPlans(): Promise<MarketingSubscriptionPlan[]> {

    const badgeBySlug = Object.fromEntries(

      SUBSCRIPTION_PLAN_SPECS.map((p) => [p.slug, p.badge]),

    ) as Record<string, 'recommended' | null>;



    const cvLimitsBySlug = Object.fromEntries(

      SUBSCRIPTION_PLAN_SPECS.map((p) => [

        p.slug,

        {

          maxCvUnlocksMonthly: p.maxCvUnlocksMonthly,

          maxCvContactsMonthly: p.maxCvContactsMonthly,

          maxCvPdfDownloadsMonthly: p.maxCvPdfDownloadsMonthly,

        },

      ]),

    );



    const { data, error } = await this.supabase

      .getClient()

      .from('subscription_plans')

      .select(

        'slug, name_sk, price_monthly_cents, monthly_credits, max_active_jobs, max_cv_unlocks_monthly, max_cv_contacts_monthly, max_cv_pdf_downloads_monthly, sort_order, active, stripe_price_id',

      )

      .eq('active', true)

      .in('slug', [...PUBLIC_SUBSCRIPTION_PLAN_SLUGS])

      .order('sort_order', { ascending: true });



    if (error) {

      this.logger.warn(`subscription_plans load failed: ${error.message}`);

      return this.subscriptionPlansFromConfig();

    }



    const rows = (data ?? []) as Array<{

      slug: string;

      name_sk: string;

      price_monthly_cents: number;

      monthly_credits: number;

      max_active_jobs: number;

      max_cv_unlocks_monthly: number | null;

      max_cv_contacts_monthly: number | null;

      max_cv_pdf_downloads_monthly: number | null;

      stripe_price_id: string | null;

    }>;



    if (rows.length === 0) {

      return this.subscriptionPlansFromConfig();

    }

    let stripe: ReturnType<StripeService['getStripeClientForTrialChecks']> | null =
      null;
    try {
      stripe = this.stripeService.getStripeClientForTrialChecks();
    } catch {
      stripe = null;
    }
    const filtered = filterPublicSubscriptionPlans(rows);
    const plans = await Promise.all(
      filtered.map(async (row) => {
        const fallback = cvLimitsBySlug[row.slug];
        const stripePriceId = resolveSubscriptionStripePriceId(
          this.config,
          row.slug,
          row.stripe_price_id,
        );
        const trialPeriodDays =
          stripe && stripePriceId
            ? await this.subscriptionTrial.getTrialPeriodDaysForPrice(
                stripe,
                stripePriceId,
              )
            : 0;
        return {
          slug: row.slug,
          nameSk: row.name_sk,
          priceMonthlyCents: row.price_monthly_cents,
          monthlyCredits: row.monthly_credits,
          maxActiveOffers: row.max_active_jobs,
          maxCvUnlocksMonthly:
            row.max_cv_unlocks_monthly ?? fallback?.maxCvUnlocksMonthly ?? null,
          maxCvContactsMonthly:
            row.max_cv_contacts_monthly ?? fallback?.maxCvContactsMonthly ?? null,
          maxCvPdfDownloadsMonthly:
            row.max_cv_pdf_downloads_monthly ??
            fallback?.maxCvPdfDownloadsMonthly ??
            null,
          badge: badgeBySlug[row.slug] ?? null,
          trialPeriodDays,
        };
      }),
    );
    return plans;
  }



  private creditPackagesFromConfig(): MarketingCreditPackage[] {

    return CREDIT_PACKAGES.map((p) => ({

      slug: p.slug,

      nameSk: p.nameSk,

      credits: p.credits,

      priceCents: p.priceCents,

      currency: p.currency,

      badge: p.badge,

    }));

  }



  private subscriptionPlansFromConfig(): MarketingSubscriptionPlan[] {

    return SUBSCRIPTION_PLAN_SPECS.map((p) => ({

      slug: p.slug,

      nameSk: p.nameSk,

      priceMonthlyCents: p.priceMonthlyCents,

      monthlyCredits: p.monthlyCredits,

      maxActiveOffers: p.maxActiveOffers,

      maxCvUnlocksMonthly: p.maxCvUnlocksMonthly,

      maxCvContactsMonthly: p.maxCvContactsMonthly,

      maxCvPdfDownloadsMonthly: p.maxCvPdfDownloadsMonthly,

      badge: p.badge,

      trialPeriodDays: 0,

    }));

  }



  async getPublicBillingConfig(): Promise<Record<string, unknown>> {
    return this.catalogCache.getOrSet('catalog:billing-config:v8', async () => {
      const [creditPackages, subscriptionPlans] = await Promise.all([
        this.getCreditPackages(),
        this.getSubscriptionPlans(),
      ]);
      const trialFromPlans = subscriptionPlans.reduce(
        (max, p) => (p.trialPeriodDays > max ? p.trialPeriodDays : max),
        0,
      );
      return {
        creditPackages,
        subscriptionPlans,
        planTierCreditCosts: getPublicPlanTierCreditCosts(),
        subscriptionTrial: {
          enabled: trialFromPlans > 0,
          periodDays: trialFromPlans,
        },
      };
    }, 600);
  }

}

