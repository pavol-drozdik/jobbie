import type { Invoice, PaymentIntent, Subscription } from './stripe-types';

type ExpandableRef<T extends { id: string }> = string | T | null | undefined;

function refId<T extends { id: string }>(
  ref: ExpandableRef<T>,
): string | null {
  if (!ref) {
    return null;
  }
  if (typeof ref === 'string') {
    return ref.trim() || null;
  }
  return ref.id?.trim() || null;
}

/** Basil+ moved billing period to subscription items (multi-interval subscriptions). */
export function getSubscriptionCurrentPeriodEnd(
  subscription: Subscription,
): number | null {
  const legacy = (subscription as { current_period_end?: number | null })
    .current_period_end;
  if (typeof legacy === 'number' && Number.isFinite(legacy)) {
    return legacy;
  }
  const items = subscription.items?.data ?? [];
  let maxEnd: number | null = null;
  for (const item of items) {
    const end = item.current_period_end;
    if (typeof end === 'number' && Number.isFinite(end)) {
      maxEnd = maxEnd === null ? end : Math.max(maxEnd, end);
    }
  }
  return maxEnd;
}

export function getSubscriptionCurrentPeriodEndIso(
  subscription: Subscription,
): string | null {
  const end = getSubscriptionCurrentPeriodEnd(subscription);
  return end ? new Date(end * 1000).toISOString() : null;
}

/** Invoice.subscription moved under parent.subscription_details (Dahlia). */
export function getInvoiceSubscriptionRef(
  invoice: Invoice,
): string | Subscription | null {
  const parentSub = invoice.parent?.subscription_details?.subscription;
  if (parentSub) {
    return parentSub;
  }
  const legacy = (invoice as { subscription?: string | Subscription | null })
    .subscription;
  return legacy ?? null;
}

export function getInvoiceSubscriptionId(invoice: Invoice): string | null {
  return refId(getInvoiceSubscriptionRef(invoice));
}

/** Invoice.payment_intent moved to payments[] / confirmation_secret (Dahlia). */
export function getInvoicePaymentIntentRef(
  invoice: Invoice,
): string | PaymentIntent | null {
  const payments = invoice.payments?.data ?? [];
  for (const row of payments) {
    const pi = row.payment?.payment_intent;
    if (pi) {
      return pi;
    }
  }
  const legacy = (invoice as { payment_intent?: string | PaymentIntent | null })
    .payment_intent;
  if (legacy) {
    return legacy;
  }
  return null;
}

export function getInvoicePaymentIntentId(invoice: Invoice): string | null {
  return refId(getInvoicePaymentIntentRef(invoice));
}

export function getInvoicePaymentIntentClientSecret(
  invoice: Invoice,
): string | null {
  const piRef = getInvoicePaymentIntentRef(invoice);
  if (piRef && typeof piRef === 'object') {
    return piRef.client_secret?.trim() || null;
  }
  return invoice.confirmation_secret?.client_secret?.trim() || null;
}

export function getInvoiceTaxAmount(invoice: Invoice): number {
  const legacyTax = (invoice as { tax?: number | null }).tax;
  if (typeof legacyTax === 'number' && Number.isFinite(legacyTax)) {
    return legacyTax;
  }
  const legacyAmounts = (
    invoice as { total_tax_amounts?: Array<{ amount?: number }> | null }
  ).total_tax_amounts;
  if (legacyAmounts?.length) {
    return legacyAmounts[0]?.amount ?? 0;
  }
  const taxes = invoice.total_taxes ?? [];
  return taxes.reduce((sum, row) => sum + (row.amount ?? 0), 0);
}
