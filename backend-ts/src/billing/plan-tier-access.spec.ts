import {
  hasPlusOrProAccessFromRow,
  isPlusOrProPlanSlug,
} from './plan-tier-access';

describe('plan-tier-access', () => {
  describe('isPlusOrProPlanSlug', () => {
    it('accepts plus and pro including legacy slugs', () => {
      expect(isPlusOrProPlanSlug('plus')).toBe(true);
      expect(isPlusOrProPlanSlug('pro')).toBe(true);
      expect(isPlusOrProPlanSlug('standard')).toBe(true);
      expect(isPlusOrProPlanSlug('premium')).toBe(true);
    });

    it('rejects free and start tiers', () => {
      expect(isPlusOrProPlanSlug('zadarmo')).toBe(false);
      expect(isPlusOrProPlanSlug('start')).toBe(false);
      expect(isPlusOrProPlanSlug('basic')).toBe(false);
    });
  });

  describe('hasPlusOrProAccessFromRow', () => {
    it('returns false for active start plan', () => {
      expect(
        hasPlusOrProAccessFromRow('start', 'active', false, null),
      ).toBe(false);
    });

    it('returns true for active plus plan', () => {
      expect(
        hasPlusOrProAccessFromRow('plus', 'active', false, null),
      ).toBe(true);
    });

    it('returns true for pro until period end', () => {
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(
        hasPlusOrProAccessFromRow('pro', 'canceled', false, future),
      ).toBe(true);
    });
  });
});
