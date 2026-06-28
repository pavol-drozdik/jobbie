import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Param,
  Query,
  Logger,
  ServiceUnavailableException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  getInvoicePaymentIntentId,
  getInvoiceSubscriptionId,
  getSubscriptionCurrentPeriodEndIso,
} from './stripe-api-compat';
import type {
  Charge,
  CheckoutSession,
  Dispute,
  Event,
  Invoice,
  PaymentIntent,
  Subscription,
} from './stripe-types';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { StripeService } from './stripe.service';
import { SubscriptionCreditsService } from './subscription-credits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { stripeWebhookDurationSeconds } from '../observability/metrics';
import {
  ActivateFreePlanDto,
  CreatePaymentIntentCreditsDto,
  CreatePaymentIntentSubscriptionDto,
  ConfirmSubscriptionPurchaseDto,
  PaymentIntentResponseDto,
  SubscriptionCheckoutPreviewDto,
  CreditPackDto,
  ConfirmCreditsPurchaseDto,
  CancelSubscriptionDto,
  ConfirmPaymentMethodDto,
} from './payments.dto';
import { isPublicSubscriptionPlanSlug } from '../billing/public-pricing-catalog';
import { SubscriptionTrialService } from '../billing/subscription-trial.service';
import { resolveSubscriptionStripePriceId } from './stripe-catalog-prices';

const CREDITS_CATALOG_UNAVAILABLE =
  'Nákup kreditov nie je momentálne dostupný. V Stripe vytvorte jednorazové ceny (Price) a uložte ich do tabuľky credit_packs.stripe_price_id, alebo nastavte STRIPE_PRICE_ID_CREDITS v .env backendu (fallback len keď tabuľka nemá platné riadky).';

const SUBSCRIPTION_STRIPE_NOT_CONFIGURED =
  'Plán ešte nie je nakonfigurovaný pre platbu. V Stripe vytvorte mesačné ceny (Price) pre plány start, plus a pro a uložte ich do subscription_plans.stripe_price_id, alebo nastavte STRIPE_PRICE_ID_SUBSCRIPTION_START, STRIPE_PRICE_ID_SUBSCRIPTION_PLUS a STRIPE_PRICE_ID_SUBSCRIPTION_PRO v .env backendu (legacy názvy basic/standard/premium tiež fungujú).';

@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private supabase: SupabaseService,
    private stripe: StripeService,
    private config: ConfigService,
    private audit: AuditService,
    private notifications: NotificationsService,
    private subscriptionCredits: SubscriptionCreditsService,
    private subscriptionTrial: SubscriptionTrialService,
  ) {}

  /** Non-blocking user notifications after Stripe DB work commits. */
  private deferWebhookNotification(
    input: Parameters<NotificationsService['createForUser']>[0],
  ): void {
    setImmediate(() => {
      void this.notifications.createForUser(input).catch((err) => {
        this.logger.warn(`Deferred webhook notification failed: ${String(err)}`);
      });
    });
  }

  @Get('credit-packs')
  @Public()
  async getCreditPacks(): Promise<CreditPackDto[]> {
    return this.stripe.listCreditPacks();
  }

  @Get('payment-method')
  async getPaymentMethod(@CurrentUserDecorator() user: CurrentUser) {
    return this.stripe.getPaymentMethodForUser(user.id);
  }

  @Post('payment-method/setup')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async createPaymentMethodSetup(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ client_secret: string }> {
    const linked = await this.stripe.resolveStripeCustomerId(user.id);
    if (!linked && !user.email?.trim()) {
      throw new BadRequestException(
        'Pre platbu je potrebný e-mail na účte (Stripe faktúry a potvrdenia).',
      );
    }
    return this.stripe.createPaymentMethodSetupIntent(
      user.id,
      user.email ?? '',
    );
  }

  @Post('payment-method/confirm')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async confirmPaymentMethod(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ConfirmPaymentMethodDto,
  ) {
    return this.stripe.setDefaultPaymentMethodFromSetupIntent(
      user.id,
      body.setup_intent_id,
    );
  }

  @Get('invoices')
  async listInvoices(@CurrentUserDecorator() user: CurrentUser) {
    const customerId = await this.stripe.resolveStripeCustomerId(user.id);
    if (!customerId) {
      return { invoices: [], stripe_customer_linked: false };
    }
    const invoices = await this.stripe.listCustomerInvoices(customerId);
    return { invoices, stripe_customer_linked: true };
  }

  @Get('invoices/:invoiceId')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getInvoice(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.stripe.getCustomerInvoiceDetail(user.id, invoiceId);
  }

  @Post('cancel-subscription')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async cancelSubscription(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CancelSubscriptionDto,
  ): Promise<{
    canceled: boolean;
    cancel_at_period_end?: boolean;
    current_period_end?: string | null;
  }> {
    const { data: sub } = await this.supabase
      .getClient()
      .from('user_subscriptions')
      .select('stripe_subscription_id, plan_id')
      .eq('user_id', user.id)
      .maybeSingle();
    const row = sub as {
      stripe_subscription_id?: string | null;
      plan_id?: string;
    } | null;
    const planId = row?.plan_id?.trim();
    if (!planId) {
      throw new BadRequestException('Nemáte aktívne platené predplatné.');
    }
    const { data: plan } = await this.supabase
      .getClient()
      .from('subscription_plans')
      .select('price_monthly_cents')
      .eq('id', planId)
      .maybeSingle();
    if (((plan as { price_monthly_cents?: number } | null)?.price_monthly_cents ?? 0) < 1) {
      throw new BadRequestException('Nemáte aktívne platené predplatné.');
    }
    return this.stripe.cancelUserSubscriptionAtPeriodEnd(user.id, {
      reason_code: body.reason_code,
      reason_detail: body.reason_detail?.trim() || null,
    });
  }

  @Post('resume-subscription')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async resumeSubscription(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{
    resumed: boolean;
    cancel_at_period_end?: boolean;
    current_period_end?: string | null;
  }> {
    const { data: sub } = await this.supabase
      .getClient()
      .from('user_subscriptions')
      .select('stripe_subscription_id, cancel_at_period_end')
      .eq('user_id', user.id)
      .maybeSingle();
    const row = sub as {
      stripe_subscription_id?: string | null;
      cancel_at_period_end?: boolean;
    } | null;
    if (!row?.stripe_subscription_id?.trim()) {
      throw new BadRequestException('Nemáte platené predplatné na obnovenie.');
    }
    if (!row.cancel_at_period_end) {
      return { resumed: true, cancel_at_period_end: false };
    }
    return this.stripe.resumeUserSubscription(user.id);
  }

  @Get('subscription-checkout-preview')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getSubscriptionCheckoutPreview(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('plan_id') planId: string,
  ): Promise<SubscriptionCheckoutPreviewDto> {
    const id = planId?.trim();
    if (!id) {
      throw new BadRequestException('Chýba identifikátor plánu.');
    }
    return this.stripe.getSubscriptionCheckoutPreview(user.id, id);
  }

  @Post('create-payment-intent-credits')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async createPaymentIntentCredits(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CreatePaymentIntentCreditsDto,
  ): Promise<PaymentIntentResponseDto> {
    const packs = await this.stripe.listCreditPacks();
    if (packs.length === 0) {
      throw new ServiceUnavailableException(CREDITS_CATALOG_UNAVAILABLE);
    }
    if (!body.price_id?.trim()) {
      throw new BadRequestException(
        'Vyberte platný balík kreditov. Priame zadanie počtu kreditov nie je podporované.',
      );
    }
    const pack = packs.find((p) => p.price_id === body.price_id);
    if (!pack) {
      throw new BadRequestException('Neplatný balík kreditov.');
    }
    return this.stripe.createPaymentIntentCredits(
      user.id,
      pack.price_id,
      pack.credits,
      user.email,
      body.billing,
    );
  }

  // Fallback when webhook is delayed — still verifies PI via Stripe API + fulfillment table.
  @Post('confirm-credits')
  async confirmCreditsPurchase(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ConfirmCreditsPurchaseDto,
  ): Promise<{ ok: boolean; invoice_id?: string }> {
    const id = body.payment_intent_id?.trim();
    if (!id || !id.startsWith('pi_')) {
      throw new BadRequestException('Neplatný identifikátor platby.');
    }
    if (body.billing) {
      await this.stripe.applyCheckoutBillingDetails(user.id, body.billing);
    }
    const result = await this.stripe.fulfillCreditsIfNeeded(id, {
      assertUserId: user.id,
    });
    if (!result.applied) {
      this.logger.warn(
        `confirm-credits: fulfillment not applied for PI ${id} (user=${user.id}): reason=${result.reason}`,
      );
      if (result.reason === 'not_succeeded') {
        throw new ServiceUnavailableException(
          'Kredity z tejto platby ešte nie je možné pripísať. Skúste znova o chvíľu alebo kontaktujte podporu.',
        );
      }
      throw new BadRequestException(
        'Kredity z tejto platby ešte nie je možné pripísať. Skúste znova o chvíľu alebo kontaktujte podporu.',
      );
    }
    const invoiceId = await this.stripe.ensureCreditPaymentInvoice(id, {
      assertUserId: user.id,
    });
    if (!invoiceId) {
      this.logger.error(
        `confirm-credits: credits granted for PI ${id} but SK faktúra was not created`,
      );
    }
    return { ok: true, invoice_id: invoiceId ?? undefined };
  }

  @Post('create-payment-intent-subscription')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async createPaymentIntentSubscription(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CreatePaymentIntentSubscriptionDto,
  ): Promise<PaymentIntentResponseDto> {
    const { data: plan, error } = await this.supabase
      .getClient()
      .from('subscription_plans')
      .select('id, slug, price_monthly_cents, stripe_price_id')
      .eq('id', body.plan_id)
      .single();
    if (error || !plan) {
      throw new NotFoundException('Plán nebol nájdený.');
    }
    const p = plan as {
      id: string;
      slug: string;
      price_monthly_cents: number;
      stripe_price_id: string | null;
    };
    if (!isPublicSubscriptionPlanSlug(p.slug)) {
      throw new BadRequestException('Tento plán už nie je dostupný.');
    }
    if (p.price_monthly_cents < 1) {
      throw new BadRequestException(
        'Bezplatný plán aktivujte priamo na stránke cenníka.',
      );
    }
    const stripePriceId = resolveSubscriptionStripePriceId(
      this.config,
      p.slug,
      p.stripe_price_id,
    );
    if (!stripePriceId) {
      throw new ServiceUnavailableException(SUBSCRIPTION_STRIPE_NOT_CONFIGURED);
    }
    return this.stripe.createSubscriptionPaymentIntent(
      user.id,
      p.id,
      stripePriceId,
      user.email,
      body.billing,
    );
  }

  @Post('confirm-subscription')
  async confirmSubscriptionPurchase(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ConfirmSubscriptionPurchaseDto,
  ): Promise<{ ok: boolean }> {
    const piId = body.payment_intent_id?.trim();
    const setupId = body.setup_intent_id?.trim();
    if (!piId && !setupId) {
      throw new BadRequestException('Neplatný identifikátor platby.');
    }
    if (piId && !piId.startsWith('pi_')) {
      throw new BadRequestException('Neplatný identifikátor platby.');
    }
    if (setupId && !setupId.startsWith('seti_')) {
      throw new BadRequestException('Neplatný identifikátor platby.');
    }
    if (body.billing) {
      await this.stripe.applyCheckoutBillingDetails(user.id, body.billing);
    }
    const result = setupId
      ? await this.stripe.syncSubscriptionFromSetupIntent(setupId, {
          assertUserId: user.id,
        })
      : await this.stripe.syncSubscriptionFromPaymentIntent(piId!, {
          assertUserId: user.id,
        });
    if (!result.applied) {
      if (result.reason === 'not_succeeded') {
        throw new BadRequestException(
          'Platba ešte nebola dokončená. Skúste znova o chvíľu.',
        );
      }
      throw new BadRequestException(
        'Predplatné z tejto platby ešte nie je možné aktivovať. Skúste znova alebo kontaktujte podporu.',
      );
    }
    const { data: subRow } = await this.supabase
      .getClient()
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', user.id)
      .maybeSingle();
    const stripeSubId = (
      subRow as { stripe_subscription_id?: string | null } | null
    )?.stripe_subscription_id?.trim();
    if (stripeSubId) {
      const grantResult =
        await this.subscriptionCredits.ensureCreditsFromStripeSubscription(
          stripeSubId,
        );
      if (!grantResult.applied) {
        this.logger.warn(
          `confirm-subscription: subscription synced for user ${user.id} but monthly credits not granted yet (sub=${stripeSubId})`,
        );
      }
    }
    return { ok: true };
  }

  private jobActivationOwnerId(meta: Record<string, string>): string | null {
    const ownerId = (meta.user_id ?? meta.company_id ?? '').trim();
    return ownerId || null;
  }

  private async activateJobFromStripeMetadata(
    meta: Record<string, string>,
  ): Promise<{ jobId: string; companyId: string; title: string | null } | null> {
    const jobId = (meta.job_id ?? '').trim();
    if (!jobId) return null;
    const ownerId = this.jobActivationOwnerId(meta);
    if (!ownerId) {
      this.logger.warn(
        `Stripe job activation skipped: missing company_id/user_id for job ${jobId}`,
      );
      return null;
    }
    const supabase = this.supabase.getClient();
    const { data: updated, error } = await supabase
      .from('job_offers')
      .update({ is_active: true, is_draft: false })
      .eq('id', jobId)
      .eq('company_id', ownerId)
      .select('company_id, title')
      .maybeSingle();
    if (error) {
      this.logger.warn(
        `Stripe job activation failed for ${jobId}: ${error.message}`,
      );
      return null;
    }
    if (!updated) {
      this.logger.warn(
        `Stripe job activation: no row updated for job ${jobId} (owner ${ownerId})`,
      );
      return null;
    }
    const row = updated as { company_id: string; title?: string | null };
    return {
      jobId,
      companyId: row.company_id,
      title: row.title ?? null,
    };
  }

  @Post('activate-free-plan')
  async activateFreePlan(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ActivateFreePlanDto,
  ): Promise<{ ok: boolean }> {
    await this.stripe.activateFreeSubscriptionPlan(
      user.id,
      body.plan_id,
      body.confirm_downgrade === true,
    );
    await this.subscriptionCredits.ensureFreePlanCreditsForCurrentMonth(user.id);
    return { ok: true };
  }

  // Raw body required for signature verify — see main.ts express.raw on this path.
  @Post('webhook')
  @Public()
  @SkipThrottle()
  async webhook(@Req() req: Request): Promise<{ received: boolean }> {
    const rawBody = req.body as Buffer;
    const sig = req.headers['stripe-signature'];
    if (typeof sig !== 'string') {
      throw new BadRequestException('Invalid signature');
    }
    let event: Event;
    try {
      event = this.stripe.constructWebhookEvent(
        rawBody,
        sig,
      ) as unknown as Event;
    } catch {
      throw new BadRequestException('Invalid payload or signature');
    }
    const supabase = this.supabase.getClient();
    const claimed = await this.claimStripeWebhookEvent(supabase, event);
    if (!claimed) {
      return { received: true };
    }
    const webhookStarted = Date.now();
    try {
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as CheckoutSession;
        const meta = (session.metadata ?? {}) as Record<string, string>;
        const piRef = session.payment_intent;
        const piId =
          typeof piRef === 'string'
            ? piRef
            : piRef && typeof piRef === 'object' && 'id' in piRef
              ? (piRef as { id: string }).id
              : null;
        if (meta.type === 'credits' && piId) {
          const fulfilled = await this.stripe.fulfillCreditsIfNeeded(piId, {
            fallbackMetadata: meta,
          });
          if (fulfilled.applied && meta.user_id) {
            this.deferWebhookNotification({
              userId: meta.user_id,
              type: 'payment_received',
              title: 'Kredity pripísané',
              body: 'Platba bola úspešná a kredity boli pripísané na váš účet.',
              metadata: {},
              omitExternalChannels: true,
            });
          }
        }
        const activatedCheckout = await this.activateJobFromStripeMetadata(meta);
        if (activatedCheckout) {
          const t = (activatedCheckout.title ?? '').trim();
          this.deferWebhookNotification({
            userId: activatedCheckout.companyId,
            type: 'payment_received',
            title: 'Platba prijatá',
            body: t
              ? `Ponuka „${t}“ je teraz aktívna.`
              : 'Vaša ponuka je teraz aktívna.',
            metadata: {
              job_id: activatedCheckout.jobId,
              job_title: t || undefined,
            },
          });
        }
      }
      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as PaymentIntent;
        const meta = (pi.metadata ?? {}) as Record<string, string>;
        try {
          await this.stripe.syncCustomerEmailFromPaymentIntent(pi.id);
        } catch (err) {
          this.logger.warn(
            `syncCustomerEmailFromPaymentIntent failed for ${pi.id}: ${String(err)}`,
          );
        }
        const fulfilled = await this.stripe.fulfillCreditsIfNeeded(pi.id);
        if (fulfilled.applied && meta.user_id) {
          this.deferWebhookNotification({
            userId: meta.user_id,
            type: 'payment_received',
            title: 'Kredity pripísané',
            body: 'Platba bola úspešná a kredity boli pripísané na váš účet.',
            metadata: {},
            omitExternalChannels: true,
          });
        }
        const activatedPi = await this.activateJobFromStripeMetadata(meta);
        if (activatedPi) {
          const t = (activatedPi.title ?? '').trim();
          this.deferWebhookNotification({
            userId: activatedPi.companyId,
            type: 'payment_received',
            title: 'Platba prijatá',
            body: t
              ? `Ponuka „${t}“ je teraz aktívna.`
              : 'Vaša ponuka je teraz aktívna.',
            metadata: {
              job_id: activatedPi.jobId,
              job_title: t || undefined,
            },
          });
        }
      }
      if (event.type === 'payment_intent.canceled') {
        const pi = event.data.object as PaymentIntent;
        try {
          await this.stripe.voidAbandonedInvoiceForCanceledPaymentIntent(pi.id);
        } catch (err) {
          this.logger.warn(
            `voidAbandonedInvoiceForCanceledPaymentIntent failed for ${pi.id}: ${String(err)}`,
          );
        }
      }
      if (event.type === 'invoice.created') {
        const inv = event.data.object as Invoice;
        try {
          await this.stripe.applySkSubscriptionInvoiceTemplateFromEvent(inv);
        } catch (err) {
          this.logger.warn(
            `applySkSubscriptionInvoiceTemplate failed for ${inv.id}: ${String(err)}`,
          );
        }
      }
      if (event.type === 'invoice.paid') {
        const inv = event.data.object as Invoice;
        const piId = getInvoicePaymentIntentId(inv);
        if (piId) {
          try {
            await this.stripe.syncCustomerEmailFromPaymentIntent(piId);
          } catch (err) {
            this.logger.warn(
              `syncCustomerEmailFromPaymentIntent failed for ${piId}: ${String(err)}`,
            );
          }
        }
        // Subscription monthly credits; paid-invoice emails are sent by Stripe
        // when Dashboard invoice email settings are enabled — docs/stripe-invoice-emails.md
        await this.subscriptionCredits.grantFromPaidSubscriptionInvoice(inv);
        if (getInvoiceSubscriptionId(inv)) {
          await this.stripe.syncSubscriptionStatusFromInvoice(inv, 'active');
        }
      }
      if (event.type === 'invoice.payment_failed') {
        const inv = event.data.object as Invoice;
        const userId = await this.stripe.syncSubscriptionStatusFromInvoice(
          inv,
          'past_due',
        );
        if (userId) {
          this.deferWebhookNotification({
            userId,
            type: 'payment_received',
            title: 'Platba predplatného zlyhala',
            body: 'Platba za predplatné neprešla. Aktualizujte platobnú metódu v nastaveniach alebo v e-maile od Stripe.',
            metadata: {},
          });
        }
      }
      if (event.type === 'invoice.payment_action_required') {
        const inv = event.data.object as Invoice;
        const userId = await this.stripe.resolveUserIdFromStripeInvoice(inv);
        if (userId) {
          this.deferWebhookNotification({
            userId,
            type: 'payment_received',
            title: 'Vyžaduje sa potvrdenie platby',
            body: 'Dokončite platbu predplatného podľa pokynov v e-maile od Stripe alebo v nastaveniach účtu.',
            metadata: {},
          });
        }
      }
      if (
        event.type === 'customer.subscription.created' ||
        event.type === 'customer.subscription.updated'
      ) {
        const sub = event.data.object as unknown as Subscription;
        const meta = (sub.metadata ?? {}) as Record<string, string>;
        const userId = meta.user_id;
        const planId = meta.plan_id;
        const periodEnd = getSubscriptionCurrentPeriodEndIso(sub);
        const cancelAtPeriodEnd = sub.cancel_at_period_end ?? false;
        if (userId && planId) {
          await supabase.from('user_subscriptions').upsert(
            {
              user_id: userId,
              plan_id: planId,
              status: sub.status ?? 'active',
              stripe_subscription_id: sub.id,
              stripe_customer_id: sub.customer ?? null,
              current_period_end: periodEnd,
              cancel_at_period_end: cancelAtPeriodEnd,
            },
            { onConflict: 'user_id' },
          );
          if (sub.status === 'trialing') {
            try {
              await this.subscriptionTrial.markSubscriptionTrialUsed(userId);
            } catch (err) {
              this.logger.warn(
                `markSubscriptionTrialUsed failed for ${userId}: ${String(err)}`,
              );
            }
          }
        } else {
          await supabase
            .from('user_subscriptions')
            .update({
              status: sub.status ?? 'active',
              current_period_end: periodEnd,
              cancel_at_period_end: cancelAtPeriodEnd,
            })
            .eq('stripe_subscription_id', sub.id);
        }
      }
      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object as unknown as Subscription;
        const meta = (sub.metadata ?? {}) as Record<string, string>;
        let userId = meta.user_id?.trim() || null;
        if (!userId) {
          const { data: row } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', sub.id)
            .maybeSingle();
          userId = (row as { user_id?: string } | null)?.user_id ?? null;
        }
        if (userId) {
          const { data: freePlan } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('slug', 'zadarmo')
            .maybeSingle();
          const freeId = (freePlan as { id?: string } | null)?.id;
          if (freeId) {
            await supabase
              .from('user_subscriptions')
              .update({
                plan_id: freeId,
                status: 'active',
                stripe_subscription_id: null,
                stripe_customer_id: null,
                current_period_end: null,
                cancel_at_period_end: false,
              })
              .eq('user_id', userId);
          }
        }
      }
      if (event.type === 'charge.refunded') {
        const ch = event.data.object as Charge;
        await this.stripe.handleChargeRefunded(ch);
        const auditId = await this.audit.recordAuditEvent({
          actorUserId: null,
          actorIp: null,
          actorUserAgent: null,
          sessionId: null,
          deviceId: null,
          eventType: 'stripe.charge.refunded',
          subjectType: 'charge',
          subjectId: ch.id,
          payload: {
            amount_refunded: ch.amount_refunded,
            currency: ch.currency,
          },
        });
        await supabase.from('stripe_financial_events').insert({
          stripe_event_id: event.id,
          category: 'refund',
          amount_cents: ch.amount_refunded,
          currency: ch.currency,
          charge_id: ch.id,
          metadata: { customer: ch.customer },
          audit_event_id: auditId,
        });
      }
      if (
        event.type === 'charge.dispute.created' ||
        event.type === 'charge.dispute.closed'
      ) {
        const d = event.data.object as Dispute;
        const auditId = await this.audit.recordAuditEvent({
          actorUserId: null,
          actorIp: null,
          actorUserAgent: null,
          sessionId: null,
          deviceId: null,
          eventType: `stripe.${event.type}`,
          subjectType: 'dispute',
          subjectId: d.id,
          payload: {
            status: d.status,
            amount: d.amount,
            currency: d.currency,
            charge: d.charge,
          },
        });
        await supabase.from('stripe_financial_events').insert({
          stripe_event_id: event.id,
          category: 'dispute',
          amount_cents: d.amount,
          currency: d.currency,
          charge_id: typeof d.charge === 'string' ? d.charge : null,
          metadata: { status: d.status, reason: d.reason },
          audit_event_id: auditId,
        });
      }
      await supabase
        .from('stripe_webhook_events')
        .update({
          processing_status: 'processed',
          error_message: null,
          http_status: 200,
        })
        .eq('stripe_event_id', event.id);
    } catch (err) {
      await supabase
        .from('stripe_webhook_events')
        .update({
          processing_status: 'failed',
          error_message: String(err),
          http_status: 500,
        })
        .eq('stripe_event_id', event.id);
      throw err;
    } finally {
      stripeWebhookDurationSeconds.observe(
        { event_type: event.type },
        (Date.now() - webhookStarted) / 1000,
      );
    }
    return { received: true };
  }

  /**
   * Atomically claim a webhook event for processing (idempotent under concurrent delivery).
   */
  private async claimStripeWebhookEvent(
    supabase: ReturnType<SupabaseService['getClient']>,
    event: Event,
  ): Promise<boolean> {
    const now = new Date().toISOString();
    const { error: insertErr } = await supabase.from('stripe_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      received_at: now,
      processing_status: 'processing',
      http_status: 200,
    });
    if (!insertErr) {
      return true;
    }
    if (insertErr.code !== '23505') {
      throw new ServiceUnavailableException(insertErr.message);
    }
    const { data: row } = await supabase
      .from('stripe_webhook_events')
      .select('processing_status')
      .eq('stripe_event_id', event.id)
      .maybeSingle();
    const status = (row as { processing_status?: string } | null)
      ?.processing_status;
    if (status === 'processed' || status === 'processing') {
      return false;
    }
    if (status === 'failed') {
      const { data: updated, error: upErr } = await supabase
        .from('stripe_webhook_events')
        .update({
          processing_status: 'processing',
          received_at: now,
          error_message: null,
        })
        .eq('stripe_event_id', event.id)
        .eq('processing_status', 'failed')
        .select('stripe_event_id')
        .maybeSingle();
      return !upErr && !!updated;
    }
    return false;
  }
}
