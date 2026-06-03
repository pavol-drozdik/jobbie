/** Industry slugs for jobs and company ads. Must match `app-pwa/utils/job.ts` `CATEGORIES`. */

export const JOB_CATEGORY_SLUGS = [

  'stavba',

  'domacnost',

  'zahrada',

  'stahovanie',

  'sklad',

  'eventy',

  'starostlivost',

  'gastro',

  'auto',

  'ine',

] as const;



export type JobCategorySlug = (typeof JOB_CATEGORY_SLUGS)[number];



export const JOB_CATEGORY_LABELS: Record<JobCategorySlug, string> = {

  stavba: 'Stavba',

  domacnost: 'Domácnosť',

  zahrada: 'Záhrada',

  stahovanie: 'Sťahovanie',

  sklad: 'Sklad',

  eventy: 'Eventy',

  starostlivost: 'Starostlivosť',

  gastro: 'Gastro',

  auto: 'Auto',

  ine: 'Iné',

};



/** Legacy DB / Base44 values → canonical slugs. Keep in sync with `app-pwa/utils/app-icons.ts` `LEGACY_CATEGORY_SLUG_ALIASES`. */

export const LEGACY_JOB_CATEGORY_SLUG_ALIASES: Record<string, JobCategorySlug> = {

  construction: 'stavba',

  moving: 'stahovanie',

  cleaning: 'domacnost',

  warehouse: 'sklad',

  garden: 'zahrada',

  events: 'eventy',

  care: 'starostlivost',

  food: 'gastro',

  restaurant: 'gastro',

  transport: 'auto',

  logistics: 'auto',

  doprava: 'auto',

  other: 'ine',

};



export function normalizeJobCategorySlug(

  category: string | null | undefined,

): JobCategorySlug | null {

  if (category == null) return null;

  const raw = category.trim().toLowerCase();

  if (!raw) return null;

  const aliased = LEGACY_JOB_CATEGORY_SLUG_ALIASES[raw];

  if (aliased) return aliased;

  if ((JOB_CATEGORY_SLUGS as readonly string[]).includes(raw)) {

    return raw as JobCategorySlug;

  }

  return null;

}



/** Returns canonical slug or null when unknown (does not pass through legacy raw values). */

export function normalizeJobCategorySlugOrNull(

  category: string | null | undefined,

): string | null {

  return normalizeJobCategorySlug(category);

}



export function getJobCategoryLabel(slug: string): string {

  const normalized = normalizeJobCategorySlug(slug);

  if (normalized) {

    return JOB_CATEGORY_LABELS[normalized];

  }

  return slug;

}


