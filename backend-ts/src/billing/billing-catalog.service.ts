import { Injectable, Logger } from '@nestjs/common';

import { SupabaseService } from '../supabase/supabase.service';

import { CatalogCacheService } from '../redis/catalog-cache.service';

import {
  CREDIT_PACKAGES,
  SUBSCRIPTION_PLAN_SPECS,
  formatPricePerCredit,
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

  pricePerCredit: string;

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

};



/** Public catalog from DB (credit_packs, subscription_plans); spend costs stay in billing.config.ts. */

@Injectable()

export class BillingCatalogService {

  private readonly logger = new Logger(BillingCatalogService.name);



  constructor(

    private readonly supabase: SupabaseService,

    private readonly catalogCache: CatalogCacheService,

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

      pricePerCredit: formatPricePerCredit(row.unit_amount, row.credits),

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

        'slug, name_sk, price_monthly_cents, monthly_credits, max_active_jobs, max_cv_unlocks_monthly, max_cv_contacts_monthly, max_cv_pdf_downloads_monthly, sort_order, active',

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

    }>;



    if (rows.length === 0) {

      return this.subscriptionPlansFromConfig();

    }



    return filterPublicSubscriptionPlans(rows).map((row) => {

      const fallback = cvLimitsBySlug[row.slug];

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

      };

    });

  }



  private creditPackagesFromConfig(): MarketingCreditPackage[] {

    return CREDIT_PACKAGES.map((p) => ({

      slug: p.slug,

      nameSk: p.nameSk,

      credits: p.credits,

      priceCents: p.priceCents,

      currency: p.currency,

      badge: p.badge,

      pricePerCredit: formatPricePerCredit(p.priceCents, p.credits),

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

    }));

  }



  async getPublicBillingConfig(): Promise<Record<string, unknown>> {
    return this.catalogCache.getOrSet('catalog:billing-config:v5', async () => {
      const [creditPackages, subscriptionPlans] = await Promise.all([
        this.getCreditPackages(),
        this.getSubscriptionPlans(),
      ]);
      return {
        creditPackages,
        subscriptionPlans,
        planTierCreditCosts: getPublicPlanTierCreditCosts(),
      };
    }, 600);
  }

}

