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

  getDefaultCreditsPriceId(): string | null {
    return this.config.get<string>('STRIPE_PRICE_ID_CREDITS') ?? null;
  }

  getPublishableKey(): string | null {
    return this.config.get<string>('STRIPE_PUBLISHABLE_KEY') ?? null;
  }

  async createPaymentIntentCredits(
    userId: string,
    priceId: string,
    creditsAmount: number,
  ): Promise<{ client_secret: string }> {
    const stripe = this.getStripe();
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount ?? 0;
    const currency = price.currency ?? 'eur';
    if (amount < 1) {
      throw new ServiceUnavailableException('Invalid price amount');
    }
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: userId,
        credits: String(creditsAmount),
        type: 'credits',
      },
    });
    return {
      client_secret: pi.client_secret ?? '',
    };
  }

  async createPaymentIntentJobPost(
    companyId: string,
    jobId: string,
  ): Promise<{ client_secret: string }> {
    const priceId = this.config.get<string>('STRIPE_PRICE_ID_JOB_POST');
    if (!priceId) {
      throw new ServiceUnavailableException('Stripe price not configured');
    }
    const stripe = this.getStripe();
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount ?? 0;
    const currency = price.currency ?? 'eur';
    if (amount < 1) {
      throw new ServiceUnavailableException('Invalid job post price');
    }
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        company_id: companyId,
        job_id: jobId,
      },
    });
    return {
      client_secret: pi.client_secret ?? '',
    };
  }

  getCreditsConfigHint(): {
    stripeConfigured: boolean;
    hasDefaultPrice: boolean;
    hasProductId: boolean;
    hasCreditProductIds: boolean;
  } {
    const stripeConfigured = !!this.config.get<string>('STRIPE_SECRET_KEY');
    const hasDefaultPrice = !!this.getDefaultCreditsPriceId();
    const hasProductId = !!this.config.get<string>('STRIPE_PRODUCT_ID_CREDITS');
    const raw = this.config.get<string>('STRIPE_CREDIT_PRODUCT_IDS');
    const hasCreditProductIds = !!raw?.split(',').some((id) => id.trim());
    return {
      stripeConfigured,
      hasDefaultPrice,
      hasProductId,
      hasCreditProductIds,
    };
  }

  async listCreditPacks(): Promise<
    Array<{ price_id: string; credits: number; unit_amount: number; currency: string }>
  > {
    if (!this.stripe) return [];
    const multipleIds = this.config.get<string>('STRIPE_CREDIT_PRODUCT_IDS');
    if (multipleIds) {
      const productIds = multipleIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      const out: Array<{
        price_id: string;
        credits: number;
        unit_amount: number;
        currency: string;
      }> = [];
      for (const prodId of productIds) {
        try {
          const product = await this.stripe.products.retrieve(prodId);
          const productCreditsRaw = product.metadata?.credits;
          const productCredits =
            typeof productCreditsRaw === 'string'
              ? parseInt(productCreditsRaw, 10)
              : NaN;
          const prices = await this.stripe.prices.list({
            product: prodId,
            active: true,
          });
          const oneTimePrice = prices.data.find(
            (p) =>
              (p as { type?: string }).type === 'one_time' || !p.recurring,
          );
          if (!oneTimePrice) continue;
          const priceCreditsRaw = oneTimePrice.metadata?.credits;
          const priceCredits =
            typeof priceCreditsRaw === 'string'
              ? parseInt(priceCreditsRaw, 10)
              : NaN;
          const credits = Number.isFinite(priceCredits) && priceCredits >= 1
            ? priceCredits
            : Number.isFinite(productCredits) && productCredits >= 1
              ? productCredits
              : 10;
          out.push({
            price_id: oneTimePrice.id,
            credits,
            unit_amount: oneTimePrice.unit_amount ?? 0,
            currency: oneTimePrice.currency ?? 'eur',
          });
        } catch {
          continue;
        }
      }
      if (out.length > 0) return out;
    }
    const productId = this.config.get<string>('STRIPE_PRODUCT_ID_CREDITS');
    if (productId) {
      let productCredits = NaN;
      try {
        const product = await this.stripe.products.retrieve(productId);
        const raw = product.metadata?.credits;
        if (typeof raw === 'string')
          productCredits = parseInt(raw, 10);
      } catch {
        // ignore
      }
      const prices = await this.stripe.prices.list({
        product: productId,
        active: true,
      });
      const out: Array<{
        price_id: string;
        credits: number;
        unit_amount: number;
        currency: string;
      }> = [];
      for (const p of prices.data) {
        const oneTime =
          (p as { type?: string }).type === 'one_time' || !p.recurring;
        if (!oneTime) continue;
        const priceCreditsRaw = p.metadata?.credits;
        const priceCredits =
          typeof priceCreditsRaw === 'string'
            ? parseInt(priceCreditsRaw, 10)
            : NaN;
        const credits =
          Number.isFinite(priceCredits) && priceCredits >= 1
            ? priceCredits
            : Number.isFinite(productCredits) && productCredits >= 1
              ? productCredits
              : 10;
        const unit_amount = p.unit_amount ?? 0;
        out.push({
          price_id: p.id,
          credits,
          unit_amount,
          currency: p.currency ?? 'eur',
        });
      }
      if (out.length > 0) return out;
    }
    const defaultPriceId = this.getDefaultCreditsPriceId();
    if (!defaultPriceId) return [];
    try {
      const p = await this.stripe.prices.retrieve(defaultPriceId);
      const creditsRaw = p.metadata?.credits;
      const credits =
        typeof creditsRaw === 'string' ? parseInt(creditsRaw, 10) : NaN;
      const creditsAmount =
        Number.isFinite(credits) && credits >= 1 ? credits : 10;
      return [
        {
          price_id: p.id,
          credits: creditsAmount,
          unit_amount: p.unit_amount ?? 0,
          currency: p.currency ?? 'eur',
        },
      ];
    } catch {
      return [];
    }
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

  createCreditsCheckoutSession(
    userId: string,
    priceId: string,
    creditsAmount: number,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ checkout_url: string; session_id: string }> {
    return this.getStripe()
      .checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: {
          user_id: userId,
          credits: String(creditsAmount),
          type: 'credits',
        },
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
