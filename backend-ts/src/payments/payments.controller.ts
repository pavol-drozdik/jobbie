import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  ServiceUnavailableException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
  CreateCheckoutSessionResponseDto,
} from './payments.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private supabase: SupabaseService,
    private stripe: StripeService,
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
