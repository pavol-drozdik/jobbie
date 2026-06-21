import { ConfigService } from '@nestjs/config';

/**
 * Default sandbox Price IDs (sk_test_). Regenerate via scripts/create-stripe-test-catalog.mjs.
 * See docs/stripe-sandbox-catalog.md. Overridable per slug via STRIPE_TEST_PRICE_CREDITS_<SLUG> or
 * STRIPE_PRICE_ID_SUBSCRIPTION_* env vars.
 */
/** Regenerate via `node scripts/create-stripe-test-catalog.mjs` (sk_test_). */
export const SANDBOX_CREDIT_PACK_PRICE_IDS: Readonly<Record<string, string>> = {
  starter: 'price_1Td4bIEXgv7DHN4Dzm8xj6qj',
  popular: 'price_1Td4bJEXgv7DHN4D9qzndWP3',
  value: 'price_1Td4bJEXgv7DHN4DmqrkuiYU',
  firmy: 'price_1Td4bKEXgv7DHN4DQZ0MOgxy',
};

export const SANDBOX_SUBSCRIPTION_PRICE_IDS: Readonly<Record<string, string>> = {
  start: 'price_1Td4bLEXgv7DHN4DmOz9fTpp',
  plus: 'price_1Td4bLEXgv7DHN4Do0RB4gEF',
  pro: 'price_1Td4bMEXgv7DHN4DotUoP8Hl',
};

/** Live Stripe Price IDs: see `supabase/scripts/stripe-live-catalog-price-ids.sql` and DB `stripe_price_id` columns. */
export function isStripeTestMode(config: ConfigService): boolean {
  const key = config.get<string>('STRIPE_SECRET_KEY')?.trim() ?? '';
  return key.startsWith('sk_test_');
}

/** Env fallbacks when DB stripe_price_id is null (live or test). */
export function subscriptionStripePriceIdFromEnv(
  config: ConfigService,
  slug: string,
): string | null {
  const keyBySlug: Record<string, string> = {
    start: 'STRIPE_PRICE_ID_SUBSCRIPTION_START',
    plus: 'STRIPE_PRICE_ID_SUBSCRIPTION_PLUS',
    pro: 'STRIPE_PRICE_ID_SUBSCRIPTION_PRO',
    agentura: 'STRIPE_PRICE_ID_SUBSCRIPTION_AGENTURA',
    basic: 'STRIPE_PRICE_ID_SUBSCRIPTION_START',
    standard: 'STRIPE_PRICE_ID_SUBSCRIPTION_PLUS',
    premium: 'STRIPE_PRICE_ID_SUBSCRIPTION_PRO',
  };
  const envKey = keyBySlug[slug];
  if (!envKey) {
    return null;
  }
  const v = config.get<string>(envKey)?.trim();
  return v && v.startsWith('price_') ? v : null;
}

/**
 * Hosted Supabase may store live Price IDs while local dev uses sk_test_.
 * In test mode, never pass live DB price IDs to Stripe.
 */
export function resolveCreditPackStripePriceId(
  config: ConfigService,
  slug: string,
  dbPriceId: string | null | undefined,
): string | null {
  if (isStripeTestMode(config)) {
    const envKey = `STRIPE_TEST_PRICE_CREDITS_${slug.toUpperCase()}`;
    const fromEnv = config.get<string>(envKey)?.trim();
    if (fromEnv?.startsWith('price_')) {
      return fromEnv;
    }
    return SANDBOX_CREDIT_PACK_PRICE_IDS[slug] ?? null;
  }
  const db = dbPriceId?.trim();
  return db?.startsWith('price_') ? db : null;
}

export function resolveSubscriptionStripePriceId(
  config: ConfigService,
  slug: string,
  dbPriceId: string | null | undefined,
): string | null {
  if (isStripeTestMode(config)) {
    const fromEnv = subscriptionStripePriceIdFromEnv(config, slug);
    if (fromEnv) {
      return fromEnv;
    }
    return SANDBOX_SUBSCRIPTION_PRICE_IDS[slug] ?? null;
  }
  const db = dbPriceId?.trim();
  if (db?.startsWith('price_')) {
    return db;
  }
  return subscriptionStripePriceIdFromEnv(config, slug);
}
