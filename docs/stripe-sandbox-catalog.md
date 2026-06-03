# Stripe sandbox (test mode) catalog

Created for the **Jobbie sandbox** Stripe account (`acct_1TA4bmEXgv7DHN4D`, “Jobbie sandbox”) using `sk_test_` from `backend-ts/.env`. Use the Stripe MCP plugin in **test** mode to audit this catalog.

**Do not** replace production `stripe_price_id` values in hosted Supabase with these IDs — production uses **live** Prices on account `acct_1TA4bgRAwyxxavec` (see [stripe-live-catalog-price-ids.sql](../supabase/scripts/stripe-live-catalog-price-ids.sql)).

Subscription Prices are **recurring monthly** (`type: recurring`, `interval: month`) — required for [Stripe Billing Subscriptions](https://docs.stripe.com/billing/subscriptions/overview). Credit pack Prices are **one-time**.

Re-create test catalog anytime:

```bash
cd backend-ts
node scripts/create-stripe-test-catalog.mjs
```

Then update `SANDBOX_*` in [`stripe-catalog-prices.ts`](../backend-ts/src/payments/stripe-catalog-prices.ts) if Price IDs changed.

## Test Price IDs (2026-05-31, regenerated via script + MCP audit)

### Credit packs

| Slug | Amount | `price_id` |
|------|--------|------------|
| `starter` | €5.00 | `price_1Td4bIEXgv7DHN4Dzm8xj6qj` |
| `popular` | €10.00 | `price_1Td4bJEXgv7DHN4D9qzndWP3` |
| `value` | €20.00 | `price_1Td4bJEXgv7DHN4DmqrkuiYU` |
| `firmy` | €45.00 | `price_1Td4bKEXgv7DHN4DQZ0MOgxy` |

### Subscription plans (monthly EUR, recurring)

| Slug | Amount | `price_id` |
|------|--------|------------|
| `start` | €4.99 | `price_1Td4bLEXgv7DHN4DmOz9fTpp` |
| `plus` | €9.99 | `price_1Td4bLEXgv7DHN4Do0RB4gEF` |
| `pro` | €19.99 | `price_1Td4bMEXgv7DHN4DotUoP8Hl` |

## Local development options

### A. Same Supabase project as production (typical)

Hosted DB holds **live** `stripe_price_id` values. With `sk_test_` locally, Stripe rejects live Price IDs.

When `STRIPE_SECRET_KEY` starts with `sk_test_`, the Nest API **automatically** uses sandbox Price IDs from [`stripe-catalog-prices.ts`](../backend-ts/src/payments/stripe-catalog-prices.ts) instead of DB live IDs. Restart the API after pulling this change.

Optional overrides in `backend-ts/.env`:

```env
STRIPE_PRICE_ID_SUBSCRIPTION_START=price_1Td4bLEXgv7DHN4DmOz9fTpp
STRIPE_PRICE_ID_SUBSCRIPTION_PLUS=price_1Td4bLEXgv7DHN4Do0RB4gEF
STRIPE_PRICE_ID_SUBSCRIPTION_PRO=price_1Td4bMEXgv7DHN4DotUoP8Hl
STRIPE_TEST_PRICE_CREDITS_STARTER=price_1Td4bIEXgv7DHN4Dzm8xj6qj
```

Ensure `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is a **test** publishable key (`pk_test_...`) when using `sk_test_`.

### B. Local Supabase (`supabase start`)

Run updates from [`supabase/scripts/stripe-catalog-price-ids.sql.template`](../supabase/scripts/stripe-catalog-price-ids.sql.template) using the test `price_...` values from the table above.

### C. Stripe MCP in Cursor

The Stripe plugin connects to **one mode per session** (test or live). Use `search_stripe_resources` with `products:name~"JOBBIE"` to audit. For test catalog creation, prefer `create-stripe-test-catalog.mjs` (requires `sk_test_` in `.env`).

## Live mode catalog

Live Products/Prices verified via Stripe MCP (Jobbie account `acct_1TA4bgRAwyxxavec`). Apply to hosted Supabase:

[`supabase/scripts/stripe-live-catalog-price-ids.sql`](../supabase/scripts/stripe-live-catalog-price-ids.sql)

Constants also in `LIVE_*` maps in [`stripe-catalog-prices.ts`](../backend-ts/src/payments/stripe-catalog-prices.ts) (reference only — production API reads DB).

## Invoice & receipt emails

Enable in Stripe Dashboard for **both** test and live: [stripe-invoice-emails.md](./stripe-invoice-emails.md).
