/** Parse SK/EU money input ("10,50" or "10.50") to a number. */
export function parseMoneyInput(
  raw: string | number | null | undefined,
): number | null {
  if (raw === '' || raw == null) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? normalizeMoneyAmount(raw) : null;
  }
  const normalized = String(raw).trim().replace(/\s/g, '').replace(',', '.');
  if (!normalized) return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? normalizeMoneyAmount(n) : null;
}

/** Round to two decimal places for storage and display. */
export function normalizeMoneyAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Format for text inputs (SK decimal comma, no thousands separator). */
export function formatMoneyInputField(amount: number): string {
  if (!Number.isFinite(amount)) return '';
  return normalizeMoneyAmount(amount).toLocaleString('sk-SK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}
