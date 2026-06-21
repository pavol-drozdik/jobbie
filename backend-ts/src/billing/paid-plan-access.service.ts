/** Mirrors PWA SubscriptionStatusPanel `hasPaidPlanAccess`. */
export function hasPaidPlanAccessFromRow(
  planSlug: string,
  status: string,
  cancelAtPeriodEnd: boolean,
  currentPeriodEnd: string | null,
): boolean {
  if (!planSlug || planSlug === 'zadarmo') {
    return false;
  }
  const normalizedStatus = (status ?? '').trim();
  const hasActivePaidStatus =
    Boolean(normalizedStatus) && normalizedStatus !== 'canceled';
  if (hasActivePaidStatus) {
    return true;
  }
  if (cancelAtPeriodEnd) {
    return true;
  }
  if (currentPeriodEnd) {
    return new Date(currentPeriodEnd).getTime() > Date.now();
  }
  return false;
}
