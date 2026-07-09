import { ForbiddenException } from '@nestjs/common';

export type BillingPurchaseProfileRow = {
  customer_role?: boolean;
  provider_role?: boolean;
  is_deleted?: boolean;
};

export const BILLING_PURCHASE_ACCESS_MESSAGE =
  'Kredity a predplatné sú dostupné len s rolou „Poskytujem prácu“ alebo „Ponúkam svoje služby“.';

export function canPurchaseBillingFromRow(
  row: BillingPurchaseProfileRow | null | undefined,
): boolean {
  if (!row || row.is_deleted) return false;
  return Boolean(row.customer_role) || Boolean(row.provider_role);
}

export function assertBillingPurchaseAccess(
  row: BillingPurchaseProfileRow | null | undefined,
  message = BILLING_PURCHASE_ACCESS_MESSAGE,
): void {
  if (!row) {
    throw new ForbiddenException('Profil sa nenašiel.');
  }
  if (row.is_deleted) {
    throw new ForbiddenException('Profil nie je dostupný.');
  }
  if (!canPurchaseBillingFromRow(row)) {
    throw new ForbiddenException(message);
  }
}
