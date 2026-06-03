import {

  CREDIT_COSTS,

  CREDIT_PACKAGES,

  SUBSCRIPTION_PLAN_SPECS,

  publishServiceProfileCredits,

} from './billing.config';

import {

  EXPECTED_CREDIT_PACK_SEEDS,

  EXPECTED_SUBSCRIPTION_PLAN_SEEDS,

} from './billing-catalog.seed-alignment';



describe('billing.config', () => {

  it('defines four credit packages with expected prices', () => {

    expect(CREDIT_PACKAGES).toHaveLength(4);

    const bySlug = Object.fromEntries(CREDIT_PACKAGES.map((p) => [p.slug, p]));

    expect(bySlug.starter?.credits).toBe(5);

    expect(bySlug.starter?.priceCents).toBe(500);

    expect(bySlug.popular?.credits).toBe(12);

    expect(bySlug.popular?.priceCents).toBe(1000);

    expect(bySlug.value?.credits).toBe(30);

    expect(bySlug.value?.priceCents).toBe(2000);

    expect(bySlug.firmy?.credits).toBe(75);

    expect(bySlug.firmy?.priceCents).toBe(4500);

  });



  it('defines subscription plans with monthly credits and limits', () => {

    const bySlug = Object.fromEntries(

      SUBSCRIPTION_PLAN_SPECS.map((p) => [p.slug, p]),

    );

    expect(bySlug.zadarmo?.monthlyCredits).toBe(5);

    expect(bySlug.zadarmo?.maxActiveOffers).toBe(1);

    expect(bySlug.zadarmo?.maxCvUnlocksMonthly).toBe(10);

    expect(bySlug.zadarmo?.maxCvContactsMonthly).toBe(5);

    expect(bySlug.zadarmo?.maxCvPdfDownloadsMonthly).toBe(5);

    expect(bySlug.start?.monthlyCredits).toBe(10);

    expect(bySlug.start?.maxActiveOffers).toBe(3);

    expect(bySlug.start?.maxCvUnlocksMonthly).toBe(50);

    expect(bySlug.start?.maxCvContactsMonthly).toBe(25);

    expect(bySlug.start?.maxCvPdfDownloadsMonthly).toBe(25);

    expect(bySlug.plus?.monthlyCredits).toBe(25);

    expect(bySlug.plus?.maxActiveOffers).toBe(6);

    expect(bySlug.plus?.maxCvUnlocksMonthly).toBe(75);

    expect(bySlug.plus?.maxCvContactsMonthly).toBe(50);

    expect(bySlug.plus?.maxCvPdfDownloadsMonthly).toBe(50);

    expect(bySlug.pro?.monthlyCredits).toBe(60);

    expect(bySlug.pro?.maxActiveOffers).toBe(15);

    expect(bySlug.pro?.maxCvUnlocksMonthly).toBeNull();

    expect(bySlug.pro?.maxCvContactsMonthly).toBeNull();

    expect(bySlug.pro?.maxCvPdfDownloadsMonthly).toBeNull();

  });



  it('charges 3 credits per job publish (fallback) and 9 for 3-month service profile', () => {

    expect(CREDIT_COSTS.publishJob30Days).toBe(3);

    expect(CREDIT_COSTS.publishUrgentJob30Days).toBe(3);

    expect(CREDIT_COSTS.renewJob30Days).toBe(3);

    expect(CREDIT_COSTS.renewUrgentJob30Days).toBe(3);

    expect(publishServiceProfileCredits(3)).toBe(9);

  });



  it('defines promotion costs', () => {

    expect(CREDIT_COSTS.urgentBadge7Days).toBe(2);

  });



  it('exports seed alignment constants matching billing.config (DB migration gate)', () => {

    expect(EXPECTED_CREDIT_PACK_SEEDS).toHaveLength(CREDIT_PACKAGES.length);

    for (const pack of EXPECTED_CREDIT_PACK_SEEDS) {

      const cfg = CREDIT_PACKAGES.find((p) => p.slug === pack.slug);

      expect(cfg?.credits).toBe(pack.credits);

      expect(cfg?.priceCents).toBe(pack.unitAmount);

    }

    for (const plan of EXPECTED_SUBSCRIPTION_PLAN_SEEDS) {

      const cfg = SUBSCRIPTION_PLAN_SPECS.find((p) => p.slug === plan.slug);

      expect(cfg?.monthlyCredits).toBe(plan.monthlyCredits);

      expect(cfg?.maxActiveOffers).toBe(plan.maxActiveJobs);

      expect(cfg?.priceMonthlyCents).toBe(plan.priceMonthlyCents);

      expect(cfg?.maxCvUnlocksMonthly).toBe(plan.maxCvUnlocksMonthly);

      expect(cfg?.maxCvContactsMonthly).toBe(plan.maxCvContactsMonthly);

      expect(cfg?.maxCvPdfDownloadsMonthly).toBe(plan.maxCvPdfDownloadsMonthly);

    }

  });

});


