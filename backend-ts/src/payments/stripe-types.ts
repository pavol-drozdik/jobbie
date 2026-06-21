import type { Stripe as StripeCore } from 'stripe/cjs/stripe.core.js';
import type { StripeError } from 'stripe/cjs/Error.js';

/** Pinned with the `stripe` npm major — see docs/deps-upgrade-plan.md */
export const STRIPE_API_VERSION = '2026-05-27.dahlia' as const;

export type StripeClient = StripeCore;

export type Subscription = StripeCore.Subscription;
export type SubscriptionCreateParams = StripeCore.SubscriptionCreateParams;
export type Invoice = StripeCore.Invoice;
export type InvoiceCreateParams = StripeCore.InvoiceCreateParams;
export type InvoiceItemCreateParams = StripeCore.InvoiceItemCreateParams;
export type InvoiceLineItem = StripeCore.InvoiceLineItem;
export type PaymentIntent = StripeCore.PaymentIntent;
export type PaymentIntentUpdateParams = StripeCore.PaymentIntentUpdateParams;
export type PaymentMethod = StripeCore.PaymentMethod;
export type CustomerUpdateParams = StripeCore.CustomerUpdateParams;
export type Charge = StripeCore.Charge;
export type Dispute = StripeCore.Dispute;
export type Event = StripeCore.Event;
export type Price = StripeCore.Price;
export type Address = StripeCore.Address;

export type CheckoutSession = StripeCore.Checkout.Session;
export type CheckoutSessionCreateParams = StripeCore.Checkout.SessionCreateParams;
export type CheckoutSubscriptionData =
  StripeCore.Checkout.SessionCreateParams.SubscriptionData;

export type { StripeError };
