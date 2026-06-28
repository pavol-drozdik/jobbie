/**
 * Register Stripe Payment Method Domains for Apple Pay / Google Pay on /platba.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node backend-ts/scripts/register-stripe-payment-method-domains.mjs
 *   STRIPE_SECRET_KEY=sk_test_... node backend-ts/scripts/register-stripe-payment-method-domains.mjs
 *
 * Domains default to jobbie.sk + www.jobbie.sk. Override:
 *   STRIPE_PAYMENT_METHOD_DOMAINS=jobbie.sk,www.jobbie.sk,staging.example.com
 *
 * After create, complete verification in Stripe Dashboard → Settings → Payment method domains
 * (DNS or hosted file). Wallets require HTTPS on the registered hostname.
 */
import 'dotenv/config';
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key?.startsWith('sk_')) {
  console.error('Set STRIPE_SECRET_KEY (sk_test_ or sk_live_)');
  process.exit(1);
}

const rawDomains =
  process.env.STRIPE_PAYMENT_METHOD_DOMAINS?.trim() || 'jobbie.sk,www.jobbie.sk';
const domainNames = [
  ...new Set(
    rawDomains
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  ),
];

if (domainNames.length === 0) {
  console.error('No domains to register');
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2026-05-27.dahlia' });

const existing = await stripe.paymentMethodDomains.list({ limit: 100 });
const byName = new Map(existing.data.map((d) => [d.domain_name, d]));

console.log(`Mode: ${key.startsWith('sk_live_') ? 'live' : 'test'}`);
console.log(`Registering: ${domainNames.join(', ')}\n`);

for (const domain_name of domainNames) {
  const found = byName.get(domain_name);
  if (found) {
    console.log(`[skip] ${domain_name} already registered (id=${found.id}, enabled=${found.enabled})`);
    if (found.apple_pay?.status) {
      console.log(`       apple_pay.status=${found.apple_pay.status}`);
    }
    if (found.google_pay?.status) {
      console.log(`       google_pay.status=${found.google_pay.status}`);
    }
    continue;
  }

  try {
    const created = await stripe.paymentMethodDomains.create({ domain_name });
    console.log(`[ok]   ${domain_name} → id=${created.id}`);
    if (created.apple_pay?.status) {
      console.log(`       apple_pay.status=${created.apple_pay.status}`);
    }
    if (created.google_pay?.status) {
      console.log(`       google_pay.status=${created.google_pay.status}`);
    }
  } catch (err) {
    console.error(`[fail] ${domain_name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log('\nNext steps:');
console.log('1. Stripe Dashboard → Settings → Payment method domains → verify each domain');
console.log('2. Settings → Payment methods → ensure Apple Pay and Google Pay are enabled');
console.log('3. Test /platba on HTTPS with Chrome (Android) or Safari (Apple)');
