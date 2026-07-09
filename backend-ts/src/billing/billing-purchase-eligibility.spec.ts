import { ForbiddenException } from '@nestjs/common';
import {
  assertBillingPurchaseAccess,
  canPurchaseBillingFromRow,
} from './billing-purchase-eligibility';

describe('billing-purchase-eligibility', () => {
  describe('canPurchaseBillingFromRow', () => {
    it('allows customer role', () => {
      expect(
        canPurchaseBillingFromRow({ customer_role: true, provider_role: false }),
      ).toBe(true);
    });

    it('allows provider role', () => {
      expect(
        canPurchaseBillingFromRow({ customer_role: false, provider_role: true }),
      ).toBe(true);
    });

    it('blocks worker-only', () => {
      expect(
        canPurchaseBillingFromRow({
          customer_role: false,
          provider_role: false,
        }),
      ).toBe(false);
    });

    it('blocks deleted profile', () => {
      expect(
        canPurchaseBillingFromRow({
          customer_role: true,
          is_deleted: true,
        }),
      ).toBe(false);
    });
  });

  describe('assertBillingPurchaseAccess', () => {
    it('throws when profile missing', () => {
      expect(() => assertBillingPurchaseAccess(null)).toThrow(ForbiddenException);
    });

    it('throws when worker-only', () => {
      expect(() =>
        assertBillingPurchaseAccess({
          customer_role: false,
          provider_role: false,
        }),
      ).toThrow(ForbiddenException);
    });

    it('passes when customer or provider', () => {
      expect(() =>
        assertBillingPurchaseAccess({ customer_role: true }),
      ).not.toThrow();
    });
  });
});
