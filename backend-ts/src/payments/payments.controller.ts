import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  ServiceUnavailableException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import Stripe from 'stripe';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { StripeService } from './stripe.service';
import {
  CreateCheckoutSessionDto,
  CreateSubscriptionCheckoutDto,
  CreateCreditsCheckoutDto,
  CreateCheckoutSessionResponseDto,
  CreatePaymentIntentCreditsDto,
  CreatePaymentIntentJobDto,
  PaymentIntentResponseDto,
  CreditPackDto,
} from './payments.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private supabase: SupabaseService,
    private stripe: StripeService,
    private config: ConfigService,
  ) {}

  @Post('checkout-session')
  @UseGuards(JwksAuthGuard)
  async createCheckoutSession(
    @CurrentUserDecorator() user: CurrentUser,
    @Body()
    body: CreateCheckoutSessionDto,
  ): Promise<CreateCheckoutSessionResponseDto> {
    const successUrl =
      body.success_url ?? 'https://yourapp.com/jobs?paid=1';
    const cancelUrl =
      body.cancel_url ?? 'https://yourapp.com/jobs?cancel=1';
    const result = await this.stripe.createCheckoutSession(
      user.id,
      body.job_id,
      successUrl,
      cancelUrl,
    );
    return result;
  }

  @Get('credit-packs')
  async getCreditPacks(): Promise<CreditPackDto[]> {
    return this.stripe.listCreditPacks();
  }

  @Get('credit-packs-config')
  getCreditPacksConfig() {
    return this.stripe.getCreditsConfigHint();
  }

  @Get('config')
  getConfig(): { publishableKey: string | null } {
    return {
      publishableKey: this.stripe.getPublishableKey(),
    };
  }

  @Post('create-payment-intent-credits')
  @UseGuards(JwksAuthGuard)
  async createPaymentIntentCredits(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CreatePaymentIntentCreditsDto,
  ): Promise<PaymentIntentResponseDto> {
    let priceId: string;
    let creditsAmount: number;
    const packs = await this.stripe.listCreditPacks();
    if (body.price_id && packs.length > 0) {
      const pack = packs.find((p) => p.price_id === body.price_id);
      if (!pack) {
        throw new BadRequestException('Neplatný balík kreditov.');
      }
      priceId = pack.price_id;
      creditsAmount = pack.credits;
    } else {
      const defaultPriceId = this.stripe.getDefaultCreditsPriceId();
      if (!defaultPriceId) {
        throw new ServiceUnavailableException(
          'Stripe credits price not configured',
        );
      }
      priceId = defaultPriceId;
      creditsAmount = Math.min(
        Math.max(1, Math.floor(body.credits_amount)),
        1000,
      );
    }
    return this.stripe.createPaymentIntentCredits(
      user.id,
      priceId,
      creditsAmount,
    );
  }

  @Post('create-payment-intent-job')
  @UseGuards(JwksAuthGuard)
  async createPaymentIntentJob(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CreatePaymentIntentJobDto,
  ): Promise<PaymentIntentResponseDto> {
    const { data: job, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('id, company_id')
      .eq('id', body.job_id)
      .single();
    if (error || !job) {
      throw new NotFoundException('Ponuka nebola nájdená.');
    }
    const row = job as { company_id: string };
    if (row.company_id !== user.id) {
      throw new BadRequestException('Ponuka nepatrí aktuálnemu používateľovi.');
    }
    return this.stripe.createPaymentIntentJobPost(user.id, body.job_id);
  }

  @Post('checkout-credits')
  @UseGuards(JwksAuthGuard)
  async createCreditsCheckout(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CreateCreditsCheckoutDto,
  ): Promise<CreateCheckoutSessionResponseDto> {
    const baseUrl =
      this.config.get<string>('PUBLIC_API_URL') ??
      'https://api.heycocreate.com';
    const thanks = (credits: string) =>
      `${baseUrl.replace(/\/$/, '')}/thanks?credits=${credits}`;
    const successUrl = body.success_url ?? thanks('success');
    const cancelUrl = body.cancel_url ?? thanks('cancel');
    let priceId: string;
    let creditsAmount: number;
    const packs = await this.stripe.listCreditPacks();
    if (body.price_id && packs.length > 0) {
      const pack = packs.find((p) => p.price_id === body.price_id);
      if (!pack) {
        throw new BadRequestException('Neplatný balík kreditov.');
      }
      priceId = pack.price_id;
      creditsAmount = pack.credits;
    } else {
      const defaultPriceId = this.stripe.getDefaultCreditsPriceId();
      if (!defaultPriceId) {
        throw new ServiceUnavailableException(
          'Stripe credits price not configured',
        );
      }
      priceId = defaultPriceId;
      creditsAmount = Math.min(
        Math.max(1, Math.floor(body.credits_amount)),
        1000,
      );
    }
    return this.stripe.createCreditsCheckoutSession(
      user.id,
      priceId,
      creditsAmount,
      successUrl,
      cancelUrl,
    );
  }

  @Post('checkout-subscription')
  @UseGuards(JwksAuthGuard)
  async createSubscriptionCheckout(
    @CurrentUserDecorator() user: CurrentUser,
    @Body()
    body: CreateSubscriptionCheckoutDto,
  ): Promise<CreateCheckoutSessionResponseDto> {
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
      price_monthly_cents: number;
      stripe_price_id: string | null;
    };
    if (p.price_monthly_cents === 0) {
      await this.supabase
        .getClient()
        .from('user_subscriptions')
        .upsert(
          {
            user_id: user.id,
            plan_id: p.id,
            status: 'active',
          },
          { onConflict: 'user_id' },
        );
      return { checkout_url: '', session_id: '' };
    }
    const stripePriceId = p.stripe_price_id;
    if (!stripePriceId) {
      throw new ServiceUnavailableException(
        'Plán ešte nie je nakonfigurovaný pre platbu.',
      );
    }
    const successUrl =
      body.success_url ?? 'https://yourapp.com/plany?success=1';
    const cancelUrl =
      body.cancel_url ?? 'https://yourapp.com/plany?cancel=1';
    return this.stripe.createSubscriptionCheckoutSession(
      user.id,
      body.plan_id,
      stripePriceId,
      successUrl,
      cancelUrl,
    );
  }

  @Post('webhook')
  async webhook(@Req() req: Request): Promise<{ received: boolean }> {
    const rawBody = req.body as Buffer;
    const sig = req.headers['stripe-signature'];
    if (typeof sig !== 'string') {
      throw new BadRequestException('Invalid signature');
    }
    let event: Stripe.Event;
    try {
      event = this.stripe.constructWebhookEvent(
        rawBody,
        sig,
      ) as unknown as Stripe.Event;
    } catch {
      throw new BadRequestException('Invalid payload or signature');
    }
    const supabase = this.supabase.getClient();

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { metadata?: Record<string, string> };
      const meta = (session.metadata ?? {}) as Record<string, string>;
      if (meta.type === 'credits' && meta.user_id && meta.credits) {
        const userId = meta.user_id;
        const addCredits = parseInt(meta.credits, 10) || 0;
        if (addCredits > 0) {
          const { data: row } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();
          const current = (row as { credits?: number } | null)?.credits ?? 0;
          await supabase
            .from('profiles')
            .update({ credits: current + addCredits })
            .eq('id', userId);
        }
      }
      const jobId = meta.job_id;
      if (jobId) {
        await supabase
          .from('job_offers')
          .update({ is_active: true })
          .eq('id', jobId);
      }
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as { metadata?: Record<string, string> };
      const meta = (pi.metadata ?? {}) as Record<string, string>;
      if (
        meta.type === 'credits' &&
        meta.user_id &&
        meta.credits
      ) {
        const userId = meta.user_id;
        const addCredits = parseInt(meta.credits, 10) || 0;
        if (addCredits > 0) {
          const { data: row } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();
          const current =
            (row as { credits?: number } | null)?.credits ?? 0;
          await supabase
            .from('profiles')
            .update({ credits: current + addCredits })
            .eq('id', userId);
        }
      }
      const jobId = meta.job_id;
      if (jobId) {
        await supabase
          .from('job_offers')
          .update({ is_active: true })
          .eq('id', jobId);
      }
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated'
    ) {
      const sub = event.data.object as unknown as Stripe.Subscription;
      const meta = (sub.metadata ?? {}) as Record<string, string>;
      const userId = meta.user_id;
      const planId = meta.plan_id;
      if (userId && planId) {
        const periodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
        await supabase.from('user_subscriptions').upsert(
          {
            user_id: userId,
            plan_id: planId,
            status: sub.status ?? 'active',
            stripe_subscription_id: sub.id,
            stripe_customer_id: sub.customer ?? null,
            current_period_end: periodEnd,
          },
          { onConflict: 'user_id' },
        );
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as unknown as Stripe.Subscription;
      const meta = (sub.metadata ?? {}) as Record<string, string>;
      const userId = meta.user_id;
      if (userId) {
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('user_id', userId);
      }
    }

    return { received: true };
  }
}
