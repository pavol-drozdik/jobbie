import { BadRequestException } from '@nestjs/common';
import {
  SK_BILLING_COMPANY_ON_INDIVIDUAL_ACCOUNT_MESSAGE,
  SK_BILLING_ICO_MESSAGE,
  SK_BILLING_INDIVIDUAL_MESSAGE,
  SK_BILLING_INDIVIDUAL_ON_COMPANY_ACCOUNT_MESSAGE,
  SK_BILLING_POLICY_MESSAGE,
  assertPurchaserTypeMatchesAccountRole,
  assertSkBillingEligible,
  validatePurchaserTypeForAccountRole,
  validateSkBillingEligibilitySync,
} from './sk-billing-eligibility';

const skIndividualBilling = {
  purchaser_type: 'individual' as const,
  address_line1: 'Hlavná 1',
  address_city: 'Bratislava',
  address_postal_code: '81101',
  address_country: 'SK',
  billing_attestation_sk_residence: true,
};

const skCompanyBilling = {
  purchaser_type: 'company' as const,
  company_name: 'Test s.r.o.',
  registration_number: '50881337',
  address_line1: 'Hlavná 1',
  address_city: 'Bratislava',
  address_postal_code: '81101',
  address_country: 'SK',
};

describe('validateSkBillingEligibilitySync', () => {
  it('passes for SK individual with address and attestation', () => {
    expect(validateSkBillingEligibilitySync(skIndividualBilling)).toBeNull();
  });

  it('passes for SK company with valid IČO format', () => {
    expect(validateSkBillingEligibilitySync(skCompanyBilling)).toBeNull();
  });

  it('rejects non-SK country', () => {
    expect(
      validateSkBillingEligibilitySync({
        ...skIndividualBilling,
        address_country: 'CZ',
      }),
    ).toBe('policy');
  });

  it('rejects company with bad IČO format', () => {
    expect(
      validateSkBillingEligibilitySync({
        ...skCompanyBilling,
        registration_number: '123',
      }),
    ).toBe('ico');
  });

  it('rejects individual without attestation', () => {
    expect(
      validateSkBillingEligibilitySync({
        ...skIndividualBilling,
        billing_attestation_sk_residence: false,
      }),
    ).toBe('individual');
  });

  it('rejects individual missing address field', () => {
    expect(
      validateSkBillingEligibilitySync({
        ...skIndividualBilling,
        address_city: '',
      }),
    ).toBe('individual');
  });

  it('rejects missing billing', () => {
    expect(validateSkBillingEligibilitySync(undefined)).toBe('policy');
  });
});

describe('validatePurchaserTypeForAccountRole', () => {
  it('allows individual checkout on individual account', () => {
    expect(
      validatePurchaserTypeForAccountRole('individual', skIndividualBilling),
    ).toBeNull();
  });

  it('allows company checkout on company account', () => {
    expect(
      validatePurchaserTypeForAccountRole('company', skCompanyBilling),
    ).toBeNull();
  });

  it('rejects company checkout on individual account', () => {
    expect(
      validatePurchaserTypeForAccountRole('individual', skCompanyBilling),
    ).toBe('company_checkout_on_individual');
  });

  it('rejects individual checkout on company account', () => {
    expect(
      validatePurchaserTypeForAccountRole('company', skIndividualBilling),
    ).toBe('individual_checkout_on_company');
  });
});

describe('assertPurchaserTypeMatchesAccountRole', () => {
  it('throws for company checkout on individual account', () => {
    expect(() =>
      assertPurchaserTypeMatchesAccountRole('individual', skCompanyBilling),
    ).toThrow(SK_BILLING_COMPANY_ON_INDIVIDUAL_ACCOUNT_MESSAGE);
  });

  it('throws for individual checkout on company account', () => {
    expect(() =>
      assertPurchaserTypeMatchesAccountRole('company', skIndividualBilling),
    ).toThrow(SK_BILLING_INDIVIDUAL_ON_COMPANY_ACCOUNT_MESSAGE);
  });
});

describe('assertSkBillingEligible', () => {
  it('passes SK company when RPO confirms active IČO', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn().mockResolvedValue(true) };
    await expect(
      assertSkBillingEligible(skCompanyBilling, rpo, 'company'),
    ).resolves.toBeUndefined();
    expect(rpo.isIcoActiveInRpo).toHaveBeenCalledWith('50881337');
  });

  it('rejects company when RPO returns no match', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn().mockResolvedValue(false) };
    await expect(assertSkBillingEligible(skCompanyBilling, rpo, 'company')).rejects.toThrow(
      BadRequestException,
    );
    await expect(assertSkBillingEligible(skCompanyBilling, rpo, 'company')).rejects.toThrow(
      SK_BILLING_ICO_MESSAGE,
    );
  });

  it('does not call RPO for individuals', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn().mockResolvedValue(false) };
    await expect(
      assertSkBillingEligible(skIndividualBilling, rpo, 'individual'),
    ).resolves.toBeUndefined();
    expect(rpo.isIcoActiveInRpo).not.toHaveBeenCalled();
  });

  it('throws policy message for non-SK country', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn() };
    await expect(
      assertSkBillingEligible(
        { ...skIndividualBilling, address_country: 'DE' },
        rpo,
        'individual',
      ),
    ).rejects.toThrow(SK_BILLING_POLICY_MESSAGE);
  });

  it('throws individual message when attestation missing', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn() };
    await expect(
      assertSkBillingEligible(
        { ...skIndividualBilling, billing_attestation_sk_residence: undefined },
        rpo,
        'individual',
      ),
    ).rejects.toThrow(SK_BILLING_INDIVIDUAL_MESSAGE);
  });

  it('rejects company checkout on individual account before RPO', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn() };
    await expect(
      assertSkBillingEligible(skCompanyBilling, rpo, 'individual'),
    ).rejects.toThrow(SK_BILLING_COMPANY_ON_INDIVIDUAL_ACCOUNT_MESSAGE);
    expect(rpo.isIcoActiveInRpo).not.toHaveBeenCalled();
  });
});
