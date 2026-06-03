import {
  getPlanTierCreditCost,
  getPublicPlanTierCreditCosts,
} from './plan-tier-credit-costs';

describe('plan-tier-credit-costs', () => {
  it('charges 3 credits per job/service ad month on all tiers', () => {
    for (const slug of ['zadarmo', 'start', 'plus', 'pro'] as const) {
      expect(getPlanTierCreditCost(slug, 'publishJobMonth')).toBe(3);
      expect(getPlanTierCreditCost(slug, 'publishServiceAdMonth')).toBe(3);
    }
  });

  it('urgent publish is 2 on free tiers and 0 on plus/pro', () => {
    expect(getPlanTierCreditCost('zadarmo', 'publishUrgentJob')).toBe(2);
    expect(getPlanTierCreditCost('start', 'publishUrgentJob')).toBe(2);
    expect(getPlanTierCreditCost('plus', 'publishUrgentJob')).toBe(0);
    expect(getPlanTierCreditCost('pro', 'publishUrgentJob')).toBe(0);
  });

  it('top listing tier costs', () => {
    expect(getPlanTierCreditCost('zadarmo', 'topOfCategory7Days')).toBe(10);
    expect(getPlanTierCreditCost('start', 'topOfCategory7Days')).toBe(10);
    expect(getPlanTierCreditCost('plus', 'topOfCategory7Days')).toBe(5);
    expect(getPlanTierCreditCost('pro', 'topOfCategory7Days')).toBe(0);
  });

  it('exports public matrix for all public slugs', () => {
    const matrix = getPublicPlanTierCreditCosts();
    expect(Object.keys(matrix).sort()).toEqual(['plus', 'pro', 'start', 'zadarmo']);
  });
});
