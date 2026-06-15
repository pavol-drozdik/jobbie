import fs from 'node:fs';
import path from 'node:path';
import Stripe from 'stripe';

const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) {
  console.log('NO_STRIPE_KEY');
  process.exit(0);
}

const price =
  process.env.STRIPE_TEST_PRICE_PLUS?.trim() ||
  'price_1TctTxEXgv7DHN4D8bqQApYd';

async function test(apiVersion, uiMode) {
  const stripe = new Stripe(key, { apiVersion });
  try {
    const s = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ui_mode: uiMode,
      return_url: 'http://localhost:3000/cennik?success=1',
      line_items: [{ price, quantity: 1 }],
    });
    console.log(
      JSON.stringify({
        apiVersion,
        uiMode,
        sessionUiMode: s.ui_mode,
        hasSecret: Boolean(s.client_secret),
        hasUrl: Boolean(s.url),
      }),
    );
  } catch (e) {
    console.log(
      JSON.stringify({
        apiVersion,
        uiMode,
        error: e.message,
      }),
    );
  }
}

for (const uiMode of ['embedded', 'embedded_page']) {
  await test('2026-05-27.dahlia', uiMode);
}
