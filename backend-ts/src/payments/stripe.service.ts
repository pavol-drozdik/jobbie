import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;

  constructor(private config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key, { apiVersion: '2023-10-16' });
    }
  }

  private getStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe not configured');
    }
    return this.stripe;
  }

  createCheckoutSession(
    companyId: string,
    jobId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ checkout_url: string; session_id: string }> {
    const priceId = this.config.get<string>('STRIPE_PRICE_ID_JOB_POST');
    if (!priceId) {
      throw new ServiceUnavailableException('Stripe price not configured');
    }
    return this.getStripe()
      .checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { company_id: companyId, job_id: jobId },
        success_url: successUrl,
        cancel_url: cancelUrl,
      })
      .then((s) => ({
        checkout_url: s.url ?? '',
        session_id: s.id,
      }));
  }

  createSubscriptionCheckoutSession(
    userId: string,
    planId: string,
    stripePriceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ checkout_url: string; session_id: string }> {
    return this.getStripe()
      .checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: stripePriceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          metadata: { user_id: userId, plan_id: planId },
        },
      })
      .then((s) => ({
        checkout_url: s.url ?? '',
        session_id: s.id,
      }));
  }

  constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
  ): Stripe.Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('Webhook secret not configured');
    }
    return this.getStripe().webhooks.constructEvent(
      payload,
      signature,
      secret,
    );
  }
}
