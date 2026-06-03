-- Live Stripe catalog Price IDs (Jobbie account acct_1TA4bgRAwyxxavec).
-- Verified via Stripe MCP search (2026-05-31). Run in hosted Supabase SQL editor (production).
-- Do NOT run against local Supabase when using sk_test_ — use stripe-catalog-prices.ts SANDBOX_* instead.

update public.credit_packs set stripe_price_id = 'price_1TctRwRAwyxxavecenOeaDKx', updated_at = now() where slug = 'starter';
update public.credit_packs set stripe_price_id = 'price_1TctRxRAwyxxavecThaNjaMl', updated_at = now() where slug = 'popular';
update public.credit_packs set stripe_price_id = 'price_1TctRxRAwyxxavecZ1RNk5c7', updated_at = now() where slug = 'value';
update public.credit_packs set stripe_price_id = 'price_1TctRyRAwyxxavecZyT0rjiY', updated_at = now() where slug = 'firmy';

update public.subscription_plans set stripe_price_id = 'price_1TctRyRAwyxxavecMr00FKsW', updated_at = now() where slug = 'start';
update public.subscription_plans set stripe_price_id = 'price_1TctRzRAwyxxavectfFWptiG', updated_at = now() where slug = 'plus';
update public.subscription_plans set stripe_price_id = 'price_1TctS0RAwyxxavecNkiFMNAb', updated_at = now() where slug = 'pro';

select slug, unit_amount, stripe_price_id from public.credit_packs where active = true order by sort_order;
select slug, price_monthly_cents, stripe_price_id from public.subscription_plans where slug in ('zadarmo','start','plus','pro');
