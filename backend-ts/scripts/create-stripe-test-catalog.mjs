import 'dotenv/config';
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key?.startsWith('sk_test_')) {
  console.error('STRIPE_SECRET_KEY must be sk_test_ for sandbox catalog');
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2023-10-16' });

const creditPacks = [
  { slug: 'starter', name: 'JOBBIE Credits – Starter', desc: '5 credits', amount: 500 },
  { slug: 'popular', name: 'JOBBIE Credits – Popular', desc: '12 credits', amount: 1000 },
  { slug: 'value', name: 'JOBBIE Credits – Value', desc: '30 credits', amount: 2000 },
  { slug: 'firmy', name: 'JOBBIE Credits – Firmy', desc: '75 credits', amount: 4500 },
];

const plans = [
  { slug: 'start', name: 'JOBBIE Plan – Start', amount: 499 },
  { slug: 'plus', name: 'JOBBIE Plan – Plus', amount: 999 },
  { slug: 'pro', name: 'JOBBIE Plan – Pro', amount: 1999 },
];

const out = { livemode: null, creditPacks: {}, plans: {} };

for (const p of creditPacks) {
  const product = await stripe.products.create({
    name: p.name,
    description: p.desc,
    metadata: {
      jobbie_slug: p.slug,
      jobbie_catalog: 'credit_packs',
    },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: p.amount,
    currency: 'eur',
    metadata: { jobbie_slug: p.slug },
  });
  out.creditPacks[p.slug] = { product_id: product.id, price_id: price.id };
  if (out.livemode === null) out.livemode = price.livemode;
}

for (const p of plans) {
  const product = await stripe.products.create({
    name: p.name,
    description: `Monthly subscription – ${p.slug}`,
    metadata: { jobbie_slug: p.slug, jobbie_catalog: 'subscription_plans' },
  });
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: p.amount,
    currency: 'eur',
    recurring: { interval: 'month' },
    metadata: { jobbie_slug: p.slug },
  });
  out.plans[p.slug] = { product_id: product.id, price_id: price.id };
}

console.log(JSON.stringify(out, null, 2));
