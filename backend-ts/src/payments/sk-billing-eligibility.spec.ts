import { BadRequestException } from '@nestjs/common';
import {
  SK_BILLING_ICO_MESSAGE,
  SK_BILLING_INDIVIDUAL_MESSAGE,
  SK_BILLING_POLICY_MESSAGE,
  assertSkBillingEligible,
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

describe('assertSkBillingEligible', () => {
  it('passes SK company when RPO confirms active IČO', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn().mockResolvedValue(true) };
    await expect(
      assertSkBillingEligible(skCompanyBilling, rpo),
    ).resolves.toBeUndefined();
    expect(rpo.isIcoActiveInRpo).toHaveBeenCalledWith('50881337');
  });

  it('rejects company when RPO returns no match', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn().mockResolvedValue(false) };
    await expect(assertSkBillingEligible(skCompanyBilling, rpo)).rejects.toThrow(
      BadRequestException,
    );
    await expect(assertSkBillingEligible(skCompanyBilling, rpo)).rejects.toThrow(
      SK_BILLING_ICO_MESSAGE,
    );
  });

  it('does not call RPO for individuals', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn().mockResolvedValue(false) };
    await expect(
      assertSkBillingEligible(skIndividualBilling, rpo),
    ).resolves.toBeUndefined();
    expect(rpo.isIcoActiveInRpo).not.toHaveBeenCalled();
  });

  it('throws policy message for non-SK country', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn() };
    await expect(
      assertSkBillingEligible(
        { ...skIndividualBilling, address_country: 'DE' },
        rpo,
      ),
    ).rejects.toThrow(SK_BILLING_POLICY_MESSAGE);
  });

  it('throws individual message when attestation missing', async () => {
    const rpo = { isIcoActiveInRpo: jest.fn() };
    await expect(
      assertSkBillingEligible(
        { ...skIndividualBilling, billing_attestation_sk_residence: undefined },
        rpo,
      ),
    ).rejects.toThrow(SK_BILLING_INDIVIDUAL_MESSAGE);
  });
});
