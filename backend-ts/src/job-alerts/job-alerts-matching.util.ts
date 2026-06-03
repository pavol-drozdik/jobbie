import { createHash } from 'crypto';

export const JOB_ALERT_RADIUS_VALUES = [0, 10, 25, 50, 100] as const;
export type JobAlertRadiusKm = (typeof JOB_ALERT_RADIUS_VALUES)[number];

export type AlertCriteriaInput = {
  keywords?: string | null;
  location?: string | null;
  radius_km?: number | null;
  category?: string | null;
  categories?: string[] | null;
  employment_types: string[];
  salary_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  work_mode?: string | null;
  work_modes?: string[] | null;
  work_from_home?: boolean | null;
  education_levels?: number[] | null;
  benefits?: number[] | null;
  suitable_for?: number[] | null;
  driver_licenses?: number[] | null;
  work_shift_modes?: number[] | null;
  language_filters?: unknown;
  pc_skill_filters?: unknown;
  start_types?: string[] | null;
  start_date_from?: string | null;
  frequency: string;
};

/** Alert criteria used for Typesense search (preview, dispatch). */
export type JobAlertSearchCriteria = Omit<AlertCriteriaInput, 'frequency'>;

export function dateKeyEuropeBratislava(ms: number): string {
  return new Date(ms).toLocaleString('sv-SE', {
    timeZone: 'Europe/Bratislava',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** Calendar month key in Europe/Bratislava (`YYYY-MM`). */
export function monthKeyEuropeBratislava(ms: number): string {
  return dateKeyEuropeBratislava(ms).slice(0, 7);
}

/** Overlap buffer (seconds) for Typesense `created_at_ts` lower bound vs last digest. */
export const JOB_ALERT_DISPATCH_WATERMARK_OVERLAP_SEC = 120;

/** Lower bound (unix seconds) for jobs created after the previous successful digest. */
export function computeCreatedAfterTs(
  lastDispatchAt: string | null,
  alertCreatedAt: string,
): number {
  const watermark = lastDispatchAt ?? alertCreatedAt;
  return Math.max(
    0,
    Math.floor(new Date(watermark).getTime() / 1000) -
      JOB_ALERT_DISPATCH_WATERMARK_OVERLAP_SEC,
  );
}

/** Drops job IDs already included in a prior successful digest for this alert. */
export function filterFreshJobIds(
  matchedIds: string[],
  alreadySent: Set<string>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of matchedIds) {
    const key = String(id);
    if (alreadySent.has(key) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }
  return out;
}

export function shouldDispatchJobAlert(
  frequency: string,
  lastDispatchAt: string | null,
  nowMs: number,
): boolean {
  const lastMs = lastDispatchAt ? new Date(lastDispatchAt).getTime() : 0;

  if (frequency === 'immediate') {
    if (lastMs <= 0) {
      return true;
    }
    return nowMs - lastMs >= 15 * 60 * 1000;
  }

  if (frequency === 'daily') {
    if (lastMs <= 0) {
      return true;
    }
    return dateKeyEuropeBratislava(lastMs) < dateKeyEuropeBratislava(nowMs);
  }

  if (frequency === 'weekly') {
    if (lastMs <= 0) {
      return true;
    }
    return nowMs - lastMs >= 7 * 24 * 60 * 60 * 1000;
  }

  if (frequency === 'monthly') {
    if (lastMs <= 0) {
      return true;
    }
    return monthKeyEuropeBratislava(lastMs) < monthKeyEuropeBratislava(nowMs);
  }

  return false;
}

function sanitizeIntArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: number[] = [];
  for (const v of value) {
    const n = Math.trunc(Number(v));
    if (Number.isFinite(n) && n > 0 && !out.includes(n)) {
      out.push(n);
    }
  }
  return out.sort((a, b) => a - b);
}

type LanguageFilter = { language_id: number; level: string };
type PcSkillFilter = { skill_id: number; level: string };

const ALLOWED_LANGUAGE_LEVELS = new Set([
  'undefined',
  'elementary',
  'intermediate',
  'master',
]);

function sanitizeLanguageFilters(value: unknown): LanguageFilter[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: LanguageFilter[] = [];
  const seen = new Set<number>();
  for (const row of value) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const id = Math.trunc(Number((row as Record<string, unknown>).language_id));
    const lvlRaw = (row as Record<string, unknown>).level;
    const lvl = typeof lvlRaw === 'string' ? lvlRaw : 'undefined';
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({
      language_id: id,
      level: ALLOWED_LANGUAGE_LEVELS.has(lvl) ? lvl : 'undefined',
    });
  }
  out.sort((a, b) => a.language_id - b.language_id);
  return out;
}

function sanitizePcSkillFilters(value: unknown): PcSkillFilter[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: PcSkillFilter[] = [];
  const seen = new Set<number>();
  for (const row of value) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const id = Math.trunc(Number((row as Record<string, unknown>).skill_id));
    const lvlRaw = (row as Record<string, unknown>).level;
    const lvl = typeof lvlRaw === 'string' ? lvlRaw : 'undefined';
    if (!Number.isFinite(id) || id <= 0 || seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push({
      skill_id: id,
      level: ALLOWED_LANGUAGE_LEVELS.has(lvl) ? lvl : 'undefined',
    });
  }
  out.sort((a, b) => a.skill_id - b.skill_id);
  return out;
}

function sanitizeStartTypes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set(['asap', 'by_agreement']);
  const out: string[] = [];
  for (const v of value) {
    const s = typeof v === 'string' ? v : String(v ?? '');
    if (allowed.has(s) && !out.includes(s)) {
      out.push(s);
    }
  }
  return out.sort();
}

function sanitizeWorkModes(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set(['on_site', 'hybrid', 'remote']);
  const out: string[] = [];
  for (const v of value) {
    const s = typeof v === 'string' ? v.trim() : '';
    if (allowed.has(s) && !out.includes(s)) {
      out.push(s);
    }
  }
  return out.sort();
}

function sanitizeCategories(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: string[] = [];
  for (const v of value) {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s && s !== 'all' && !out.includes(s)) {
      out.push(s);
    }
  }
  return out.sort();
}

export function stableCriteriaPayload(input: AlertCriteriaInput): string {
  const employment = [...(input.employment_types ?? [])]
    .map((s) => String(s).trim())
    .filter(Boolean)
    .sort();
  const workModes = sanitizeWorkModes(input.work_modes);
  const categories = sanitizeCategories(input.categories);
  return JSON.stringify({
    keywords: String(input.keywords ?? '').trim().toLowerCase(),
    location: String(input.location ?? '').trim().toLowerCase(),
    radius_km: input.radius_km === undefined || input.radius_km === null ? null : input.radius_km,
    category: input.category?.trim() || null,
    categories,
    employment_types: employment,
    salary_type: input.salary_type?.trim() || null,
    salary_min:
      input.salary_min !== undefined && input.salary_min !== null
        ? Number(input.salary_min)
        : null,
    salary_max:
      input.salary_max !== undefined && input.salary_max !== null
        ? Number(input.salary_max)
        : null,
    work_mode: input.work_mode?.trim() || null,
    work_modes: workModes,
    work_from_home: Boolean(input.work_from_home),
    education_levels: sanitizeIntArray(input.education_levels),
    benefits: sanitizeIntArray(input.benefits),
    suitable_for: sanitizeIntArray(input.suitable_for),
    driver_licenses: sanitizeIntArray(input.driver_licenses),
    work_shift_modes: sanitizeIntArray(input.work_shift_modes),
    language_filters: sanitizeLanguageFilters(input.language_filters),
    pc_skill_filters: sanitizePcSkillFilters(input.pc_skill_filters),
    start_types: sanitizeStartTypes(input.start_types),
    start_date_from: input.start_date_from?.trim() || null,
    frequency: String(input.frequency).trim(),
  });
}

export function computeCriteriaHash(payload: string): string {
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

export function hasAtLeastOneSearchCriterion(o: {
  keywords?: string | null;
  location?: string | null;
  radius_km?: number | null;
  employment_types?: string[];
  work_modes?: string[];
  work_mode?: string | null;
  categories?: string[];
  category?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  work_from_home?: boolean;
  education_levels?: number[];
  benefits?: number[];
  suitable_for?: number[];
  driver_licenses?: number[];
  work_shift_modes?: number[];
  language_filters?: unknown;
  pc_skill_filters?: unknown;
  start_types?: string[];
  start_date_from?: string | null;
}): boolean {
  if (String(o.keywords ?? '').trim()) {
    return true;
  }
  const loc = String(o.location ?? '').trim();
  if (loc) {
    const wholeSk = o.radius_km === null || o.radius_km === undefined;
    if (!wholeSk) {
      return true;
    }
  }
  if ((o.employment_types ?? []).filter(Boolean).length > 0) {
    return true;
  }
  if ((o.work_modes ?? []).filter(Boolean).length > 0) {
    return true;
  }
  const wm = String(o.work_mode ?? '').trim();
  if (wm && ['on_site', 'hybrid', 'remote'].includes(wm)) {
    return true;
  }
  if ((o.categories ?? []).filter(Boolean).length > 0) {
    return true;
  }
  const cat = String(o.category ?? '').trim();
  if (cat && cat !== 'all') {
    return true;
  }
  if (o.salary_min != null && Number.isFinite(Number(o.salary_min)) && Number(o.salary_min) > 0) {
    return true;
  }
  if (o.salary_max != null && Number.isFinite(Number(o.salary_max)) && Number(o.salary_max) > 0) {
    return true;
  }
  if (o.work_from_home) {
    return true;
  }
  if (sanitizeIntArray(o.education_levels).length > 0) {
    return true;
  }
  if (sanitizeIntArray(o.benefits).length > 0) {
    return true;
  }
  if (sanitizeIntArray(o.suitable_for).length > 0) {
    return true;
  }
  if (sanitizeIntArray(o.driver_licenses).length > 0) {
    return true;
  }
  if (sanitizeIntArray(o.work_shift_modes).length > 0) {
    return true;
  }
  if (sanitizeLanguageFilters(o.language_filters).length > 0) {
    return true;
  }
  if (sanitizePcSkillFilters(o.pc_skill_filters).length > 0) {
    return true;
  }
  if (sanitizeStartTypes(o.start_types).length > 0) {
    return true;
  }
  if (String(o.start_date_from ?? '').trim()) {
    return true;
  }
  return false;
}

/** Map alert criteria to Typesense query params (preview + dispatch). */
export function buildTypesenseParamsFromCriteria(criteria: {
  keywords?: string | null;
  location?: string | null;
  radius_km?: number | null;
  category?: string | null;
  categories?: string[] | null;
  employment_types?: string[] | null;
  salary_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  work_mode?: string | null;
  work_modes?: string[] | null;
  work_from_home?: boolean | null;
  education_levels?: number[] | null;
  benefits?: number[] | null;
  suitable_for?: number[] | null;
  driver_licenses?: number[] | null;
  work_shift_modes?: number[] | null;
  language_filters?: unknown;
  pc_skill_filters?: unknown;
  start_types?: string[] | null;
  start_date_from?: string | null;
}): {
  q?: string;
  location?: string;
  category?: string;
  jobTypes?: string[];
  workMode?: string;
  workModes?: string[];
  workFromHomeOnly?: boolean;
  salaryType?: string;
  salaryMin?: number;
  salaryMax?: number;
  educationLevelsAny?: number[];
  benefitsAll?: number[];
  suitableForAny?: number[];
  driverLicensesAny?: number[];
  workShiftModesAny?: number[];
  languageIdsAny?: number[];
  pcSkillIdsAny?: number[];
  startTypesAny?: string[];
  startDateFromTs?: number;
} {
  const cats = sanitizeCategories(criteria.categories);
  let category: string | undefined;
  if (cats.length > 1) {
    category = cats.join(',');
  } else if (cats.length === 1) {
    category = cats[0];
  } else {
    const c = criteria.category?.trim();
    category =
      c && c !== 'all' ? c : undefined;
  }

  const employment = Array.isArray(criteria.employment_types)
    ? criteria.employment_types.filter(Boolean)
    : [];
  const salaryMinNum =
    criteria.salary_min !== null &&
    criteria.salary_min !== undefined &&
    Number.isFinite(Number(criteria.salary_min))
      ? Number(criteria.salary_min)
      : undefined;
  const salaryMaxNum =
    criteria.salary_max !== null &&
    criteria.salary_max !== undefined &&
    Number.isFinite(Number(criteria.salary_max))
      ? Number(criteria.salary_max)
      : undefined;
  const languages = sanitizeLanguageFilters(criteria.language_filters).map(
    (l) => l.language_id,
  );
  const pcSkills = sanitizePcSkillFilters(criteria.pc_skill_filters).map(
    (s) => s.skill_id,
  );
  const startTypes = sanitizeStartTypes(criteria.start_types);
  let startDateFromTs: number | undefined;
  if (criteria.start_date_from && criteria.start_date_from.trim()) {
    const ts = Math.floor(new Date(criteria.start_date_from).getTime() / 1000);
    if (Number.isFinite(ts) && ts > 0) {
      startDateFromTs = ts;
    }
  }

  const wm = sanitizeWorkModes(criteria.work_modes);
  const workModes = wm.length > 0 ? wm : undefined;
  const workMode =
    !workModes && criteria.work_mode?.trim() && ['on_site', 'hybrid', 'remote'].includes(criteria.work_mode.trim())
      ? criteria.work_mode.trim()
      : undefined;

  const loc = criteria.location?.trim() || undefined;
  const wholeSk =
    criteria.radius_km === null || criteria.radius_km === undefined;

  return {
    q: criteria.keywords?.trim() || undefined,
    location: wholeSk ? undefined : loc,
    category,
    jobTypes: employment.length > 0 ? employment : undefined,
    workMode,
    workModes,
    workFromHomeOnly: criteria.work_from_home === true ? true : undefined,
    salaryType: criteria.salary_type?.trim() || undefined,
    salaryMin: salaryMinNum,
    salaryMax: salaryMaxNum,
    educationLevelsAny: sanitizeIntArray(criteria.education_levels),
    benefitsAll: sanitizeIntArray(criteria.benefits),
    suitableForAny: sanitizeIntArray(criteria.suitable_for),
    driverLicensesAny: sanitizeIntArray(criteria.driver_licenses),
    workShiftModesAny: sanitizeIntArray(criteria.work_shift_modes),
    languageIdsAny: languages.length > 0 ? languages : undefined,
    pcSkillIdsAny: pcSkills.length > 0 ? pcSkills : undefined,
    startTypesAny: startTypes.length > 0 ? startTypes : undefined,
    startDateFromTs,
  };
}

export {
  sanitizeIntArray,
  sanitizeLanguageFilters,
  sanitizePcSkillFilters,
  sanitizeStartTypes,
  sanitizeWorkModes,
  sanitizeCategories,
};
