import {
  BadRequestException,
  Controller,
  Get,
  Header,
  Patch,
  Body,
  Query,
} from '@nestjs/common';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { CREDIT_COSTS } from './billing.config';
import { BillingCatalogService } from './billing-catalog.service';
import { CreditsService } from './credits.service';
import { CvDatabaseQuotaService } from './cv-database-quota.service';
import { SubscriptionLimitsService } from './subscription-limits.service';
import { SupabaseService } from '../supabase/supabase.service';
import { Public } from '../auth/public.decorator';
import { StripeService } from '../payments/stripe.service';
import { ConfigService } from '@nestjs/config';
import { getBillingInvoiceSupplier } from '../payments/stripe-invoice-sk';
import { hasPlusOrProAccessFromRow } from './plan-tier-access';
import { SubscriptionTrialService } from './subscription-trial.service';
import { BillingPurchaseAuthorizationService } from './billing-purchase-authorization.service';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly credits: CreditsService,
    private readonly limits: SubscriptionLimitsService,
    private readonly catalog: BillingCatalogService,
    private readonly cvQuota: CvDatabaseQuotaService,
    private readonly supabase: SupabaseService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
    private readonly subscriptionTrial: SubscriptionTrialService,
    private readonly billingPurchaseAuth: BillingPurchaseAuthorizationService,
  ) {}

  @Get('config')
  @Public()
  @Header('Cache-Control', 'public, max-age=300')
  async getConfig() {
    const base = await this.catalog.getPublicBillingConfig();
    return {
      ...base,
      invoice_supplier: getBillingInvoiceSupplier(this.config),
    };
  }

  /** Auth: GlobalAuthGuard (BFF cookies + Bearer). */
  @Get('account')
  async getAccount(@CurrentUserDecorator() user: CurrentUser) {
    await this.billingPurchaseAuth.assertBillingPurchaseAccessForUser(user.id);
    await this.stripe.reconcileUserSubscription(user.id);

    const balance = await this.credits.getBalance(user.id);
    const planLimits = await this.limits.getPlanLimits(user.id);
    const activeOffers = await this.limits.countActiveOffers(user.id);
    const [cvLimits, cvUsage] = await Promise.all([
      this.cvQuota.getLimits(user.id),
      this.cvQuota.getUsage(user.id),
    ]);

    const { data: sub } = await this.supabase
      .getClient()
      .from('user_subscriptions')
      .select('status, current_period_end, plan_id, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    const subscriptionStatus = (sub as { status?: string } | null)?.status ?? null;
    const currentPeriodEnd =
      (sub as { current_period_end?: string } | null)?.current_period_end ?? null;
    const cancelAtPeriodEnd =
      (sub as { cancel_at_period_end?: boolean } | null)?.cancel_at_period_end ??
      false;

    let subscriptionTrialEligible = false;
    try {
      const stripe = this.stripe.getStripeClientForTrialChecks();
      const userEligible =
        await this.subscriptionTrial.isUserEligibleForSubscriptionTrial(
          user.id,
          stripe,
        );
      const publicTrial = await this.catalog.getPublicBillingConfig();
      const trialCfg = publicTrial.subscriptionTrial as
        | { enabled?: boolean }
        | undefined;
      subscriptionTrialEligible =
        userEligible && trialCfg?.enabled === true;
    } catch {
      subscriptionTrialEligible = false;
    }

    return {
      credits: balance.credits,
      planNameSk: planLimits.planNameSk,
      planSlug: planLimits.planSlug,
      hasPlusOrProAccess: hasPlusOrProAccessFromRow(
        planLimits.planSlug,
        subscriptionStatus ?? '',
        cancelAtPeriodEnd,
        currentPeriodEnd,
      ),
      monthlyCredits: planLimits.monthlyCredits,
      maxActiveOffers: planLimits.maxActiveOffers,
      activeOffersCount: activeOffers,
      subscriptionStatus,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      subscriptionTrialEligible,
      cvLimits,
      cvUsage,
    };
  }

  @Get('credit-ledger')
  async getCreditLedger(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('filter') filter?: string,
    @Query('limit') limitRaw?: string,
    @Query('cursor') cursor?: string,
  ) {
    await this.billingPurchaseAuth.assertBillingPurchaseAccessForUser(user.id);
    const allowed = ['all', 'purchases', 'spending', 'grants', 'adjustments'] as const;
    const f = allowed.includes(filter as (typeof allowed)[number])
      ? (filter as (typeof allowed)[number])
      : 'all';
    const limit = Math.min(Math.max(Number(limitRaw) || 50, 1), 100);
    const { entries, next_cursor } = await this.credits.listLedger({
      userId: user.id,
      filter: f,
      limit,
      cursor,
    });
    const balance = await this.credits.getBalance(user.id);
    return {
      credits: balance.credits,
      entries,
      next_cursor,
    };
  }

  @Patch('account')
  async patchBillingDetails(
    @CurrentUserDecorator() user: CurrentUser,
    @Body()
    body: {
      billing_details?: Record<string, unknown>;
      company_name?: string | null;
      tax_id?: string | null;
      vat_id?: string | null;
      registration_number?: string | null;
    },
  ) {
    await this.billingPurchaseAuth.assertBillingPurchaseAccessForUser(user.id);
    const update: Record<string, unknown> = {};
    if (body.billing_details && typeof body.billing_details === 'object') {
      const { data: row } = await this.supabase
        .getClient()
        .from('profiles')
        .select('billing_details')
        .eq('id', user.id)
        .maybeSingle();
      const prev =
        row &&
        typeof (row as { billing_details?: unknown }).billing_details === 'object'
          ? {
              ...((row as { billing_details: Record<string, unknown> })
                .billing_details),
            }
          : {};
      update.billing_details = { ...prev, ...body.billing_details };
    }
    if (body.company_name !== undefined) {
      update.company_name = body.company_name;
    }
    if (body.tax_id !== undefined) {
      update.tax_id = body.tax_id;
    }
    if (body.vat_id !== undefined) {
      update.vat_id = body.vat_id;
    }
    if (body.registration_number !== undefined) {
      update.registration_number = body.registration_number;
    }
    if (Object.keys(update).length === 0) {
      return { ok: true };
    }
    const { error } = await this.supabase
      .getClient()
      .from('profiles')
      .update(update)
      .eq('id', user.id);
    if (error) {
      throw new BadRequestException(error.message);
    }
    return { ok: true };
  }
}
