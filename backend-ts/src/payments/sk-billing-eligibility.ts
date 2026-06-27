import { BadRequestException } from '@nestjs/common';
import { normalizeSkIco } from '../registry/sk-rpo-ico.util';
import type { CheckoutBillingDetailsInput } from './stripe-invoice-sk';

export const SK_BILLING_POLICY_MESSAGE =
  'Kredity a predplatné sú dostupné len pre odberateľov s fakturačnou adresou na Slovensku.';

export const SK_BILLING_ICO_MESSAGE = 'Zadajte platné slovenské IČO.';

export const SK_BILLING_INDIVIDUAL_MESSAGE =
  'Vyplňte fakturačnú adresu na Slovensku a potvrďte súhlas.';

export const SK_BILLING_COMPANY_ON_INDIVIDUAL_ACCOUNT_MESSAGE =
  'Tento účet je registrovaný ako fyzická osoba. Firemné platby nie sú dostupné.';

export const SK_BILLING_INDIVIDUAL_ON_COMPANY_ACCOUNT_MESSAGE =
  'Tento účet je registrovaný ako firma. Platba ako fyzická osoba nie je dostupná.';

export type SkBillingEligibilityFailure = 'policy' | 'ico' | 'individual';

export type PurchaserAccountTypeMismatch =
  | 'company_checkout_on_individual'
  | 'individual_checkout_on_company';

export type SkBillingEligibilityInput = CheckoutBillingDetailsInput & {
  billing_attestation_sk_residence?: boolean | null;
};

export function messageForSkBillingEligibilityFailure(
  failure: SkBillingEligibilityFailure,
): string {
  switch (failure) {
    case 'policy':
      return SK_BILLING_POLICY_MESSAGE;
    case 'ico':
      return SK_BILLING_ICO_MESSAGE;
    case 'individual':
      return SK_BILLING_INDIVIDUAL_MESSAGE;
  }
}

function hasRequiredSkAddressFields(billing: SkBillingEligibilityInput): boolean {
  return Boolean(
    billing.address_line1?.trim() &&
      billing.address_city?.trim() &&
      billing.address_postal_code?.trim(),
  );
}

export function validatePurchaserTypeForAccountRole(
  accountRole: string | null | undefined,
  billing: { purchaser_type?: string } | null | undefined,
): PurchaserAccountTypeMismatch | null {
  const purchaserType = billing?.purchaser_type;
  if (!purchaserType) {
    return null;
  }
  if (accountRole === 'company' && purchaserType === 'individual') {
    return 'individual_checkout_on_company';
  }
  if (accountRole !== 'company' && purchaserType === 'company') {
    return 'company_checkout_on_individual';
  }
  return null;
}

export function messageForPurchaserAccountTypeMismatch(
  mismatch: PurchaserAccountTypeMismatch,
): string {
  switch (mismatch) {
    case 'company_checkout_on_individual':
      return SK_BILLING_COMPANY_ON_INDIVIDUAL_ACCOUNT_MESSAGE;
    case 'individual_checkout_on_company':
      return SK_BILLING_INDIVIDUAL_ON_COMPANY_ACCOUNT_MESSAGE;
  }
}

export function assertPurchaserTypeMatchesAccountRole(
  accountRole: string | null | undefined,
  billing: { purchaser_type?: string } | null | undefined,
): void {
  const mismatch = validatePurchaserTypeForAccountRole(accountRole, billing);
  if (mismatch) {
    throw new BadRequestException(messageForPurchaserAccountTypeMismatch(mismatch));
  }
}

/**
 * Pure eligibility checks for SK-only credit/subscription checkout.
 * Returns null when billing passes sync validation.
 */
export function validateSkBillingEligibilitySync(
  billing: SkBillingEligibilityInput | null | undefined,
): SkBillingEligibilityFailure | null {
  if (!billing?.purchaser_type) {
    return 'policy';
  }

  const country = billing.address_country?.trim().toUpperCase();
  if (country !== 'SK') {
    return 'policy';
  }

  if (!hasRequiredSkAddressFields(billing)) {
    return billing.purchaser_type === 'individual' ? 'individual' : 'policy';
  }

  if (billing.purchaser_type === 'individual') {
    if (billing.billing_attestation_sk_residence !== true) {
      return 'individual';
    }
    return null;
  }

  const ico = normalizeSkIco(billing.registration_number);
  if (ico.length !== 8) {
    return 'ico';
  }

  return null;
}

export type SkRpoLookupForBilling = {
  isIcoActiveInRpo(rawIco: string | null | undefined): Promise<boolean>;
};

export async function assertSkBillingEligible(
  billing: SkBillingEligibilityInput | null | undefined,
  rpoLookup: SkRpoLookupForBilling,
  accountRole?: string | null,
): Promise<void> {
  assertPurchaserTypeMatchesAccountRole(accountRole, billing);
  const syncFailure = validateSkBillingEligibilitySync(billing);
  if (syncFailure) {
    throw new BadRequestException(messageForSkBillingEligibilityFailure(syncFailure));
  }

  if (billing!.purchaser_type === 'company') {
    const active = await rpoLookup.isIcoActiveInRpo(billing!.registration_number);
    if (!active) {
      throw new BadRequestException(SK_BILLING_ICO_MESSAGE);
    }
  }
}
