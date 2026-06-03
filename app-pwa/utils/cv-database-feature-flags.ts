/**
 * Discrimination-sensitive filters are off by default. Flip these
 * here (and mirror in the backend service) only when consent /
 * privacy review is complete.
 */
export const CV_DB_FEATURE_FLAGS = {
  /** Gender filter is hidden by default to reduce discrimination risk. */
  enableGenderFilter: false,
  /** Disability filter requires `disability_sharing_consent` column. */
  enableDisabilityFilter: false,
} as const
