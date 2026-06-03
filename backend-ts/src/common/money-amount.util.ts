/** Normalize monetary amounts to two decimal places (hourly rate, fixed price, etc.). */
export function normalizeMoneyAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseOptionalMoneyAmount(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return normalizeMoneyAmount(n);
}
