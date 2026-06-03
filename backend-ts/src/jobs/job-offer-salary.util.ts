/** Format salary for legacy `salary` column and card display. */
export function formatJobSalaryDisplay(input: {
  salary_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_negotiable?: boolean | null;
}): string | null {
  if (input.salary_negotiable || input.salary_type === 'negotiable') {
    return 'Dohodou';
  }
  const min =
    input.salary_min !== null && input.salary_min !== undefined
      ? Number(input.salary_min)
      : null;
  const max =
    input.salary_max !== null && input.salary_max !== undefined
      ? Number(input.salary_max)
      : null;
  const fmt = (n: number) =>
    n.toLocaleString('sk-SK', {
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  const unit =
    input.salary_type === 'hourly'
      ? ' €/hod.'
      : input.salary_type === 'one_time'
        ? ' €'
        : input.salary_type === 'task_based'
          ? ' € / úloha'
          : ' € mesačne';
  if (min != null && Number.isFinite(min) && max != null && Number.isFinite(max)) {
    if (min === max) return `${fmt(min)}${unit}`;
    return `${fmt(min)} – ${fmt(max)}${unit}`;
  }
  if (min != null && Number.isFinite(min)) {
    return `Od ${fmt(min)}${unit}`;
  }
  if (max != null && Number.isFinite(max)) {
    return `Do ${fmt(max)}${unit}`;
  }
  return null;
}

/** Map Worki salary to legacy compensation fields for backward-compatible cards. */
export function deriveLegacyCompensation(input: {
  salary_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_negotiable?: boolean | null;
}): {
  compensation_type: string | null;
  compensation_amount: number | null;
} {
  if (input.salary_negotiable || input.salary_type === 'negotiable') {
    return { compensation_type: 'on_request', compensation_amount: null };
  }
  const amount =
    input.salary_min !== null && input.salary_min !== undefined
      ? Number(input.salary_min)
      : input.salary_max !== null && input.salary_max !== undefined
        ? Number(input.salary_max)
        : null;
  if (amount === null || !Number.isFinite(amount)) {
    return { compensation_type: null, compensation_amount: null };
  }
  if (input.salary_type === 'hourly') {
    return { compensation_type: 'hourly', compensation_amount: amount };
  }
  if (input.salary_type === 'one_time' || input.salary_type === 'task_based') {
    return { compensation_type: 'fixed', compensation_amount: amount };
  }
  return { compensation_type: 'fixed', compensation_amount: amount };
}

export function resolveWorkModeFromModes(
  workModes: string[] | null | undefined,
  fallback?: string | null,
): string {
  const modes = (workModes ?? []).filter((m) =>
    ['on_site', 'hybrid', 'remote'].includes(m),
  );
  if (modes.length > 0) return modes[0]!;
  if (fallback && ['on_site', 'hybrid', 'remote'].includes(fallback)) {
    return fallback;
  }
  return 'on_site';
}

export function workFromHomeFromModes(workModes: string[] | null | undefined): boolean {
  const modes = workModes ?? [];
  return modes.includes('hybrid') || modes.includes('remote');
}
