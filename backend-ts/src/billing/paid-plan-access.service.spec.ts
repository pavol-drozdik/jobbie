import { hasPaidPlanAccessFromRow } from './paid-plan-access.service';

describe('hasPaidPlanAccessFromRow', () => {
  it('returns false for zadarmo', () => {
    expect(
      hasPaidPlanAccessFromRow('zadarmo', 'active', false, null),
    ).toBe(false);
  });

  it('returns true for active paid plan', () => {
    expect(hasPaidPlanAccessFromRow('start', 'active', false, null)).toBe(
      true,
    );
  });

  it('returns true when cancel at period end is scheduled', () => {
    expect(hasPaidPlanAccessFromRow('plus', 'canceled', true, null)).toBe(
      true,
    );
  });

  it('returns true when period end is still in the future', () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      hasPaidPlanAccessFromRow('pro', 'canceled', false, future),
    ).toBe(true);
  });

  it('returns false when paid slug but access expired', () => {
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(
      hasPaidPlanAccessFromRow('start', 'canceled', false, past),
    ).toBe(false);
  });
});
