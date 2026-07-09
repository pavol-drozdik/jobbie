import { Logger } from '@nestjs/common';

const logger = new Logger('AdminPromoStripe');

export async function deleteStripeCouponIfConfigured(
  couponId: string | null | undefined,
): Promise<void> {
  const id = couponId?.trim();
  if (!id) return;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    logger.warn('STRIPE_SECRET_KEY not set — skipping coupon delete');
    return;
  }
  try {
    const res = await fetch(`https://api.stripe.com/v1/coupons/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      const body = await res.text();
      logger.warn(`Stripe coupon delete ${id} failed: ${res.status} ${body.slice(0, 200)}`);
    }
  } catch (err) {
    logger.warn(`Stripe coupon delete ${id} error: ${String(err)}`);
  }
}
