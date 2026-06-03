/** Typesense job search input (internal + shared with alert worker). */
export type TypesenseJobSortMode =
  | 'relevance'
  | 'created_at'
  | 'compensation_amount';

export type JobTypesenseQueryParams = {
  q?: string;
  location?: string;
  category?: string;
  jobType?: string;
  /** OR filter: any of these `job_type` values (takes precedence over single `jobType` when non-empty). */
  jobTypes?: string[];
  /** Indexed `work_mode` on job documents: on_site | hybrid | remote */
  workMode?: string;
  /** OR filter: any of these `work_mode` values (takes precedence over single `workMode` when non-empty). */
  workModes?: string[];
  urgentOnly?: boolean;
  minHourlyWage?: number;
  maxHourlyWage?: number;
  /** Unix seconds — filter `created_at_ts >= value` */
  createdAfterTs?: number;
  /** Unix seconds — filter `created_at_ts <= value` */
  createdBeforeTs?: number;
  /** Match documents whose `skill_tags` contains any of these values */
  skillTagsAny?: string[];
  featuredOnly?: boolean;
  /** Indexed field `compensation_type` (e.g. hourly, fixed, on_request). */
  compensationType?: string;
  /** Only jobs that allow home office (indexed `work_from_home`). */
  workFromHomeOnly?: boolean;
  /** Indexed `salary_type` (monthly | hourly) when range is salary_type-specific. */
  salaryType?: string;
  /** Range on indexed `salary_min`/`salary_max`. */
  salaryMin?: number;
  salaryMax?: number;
  /** Worki-style multi-filter on int arrays (any-of for inclusive, all-of for benefits). */
  educationLevelsAny?: number[];
  benefitsAll?: number[];
  suitableForAny?: number[];
  driverLicensesAny?: number[];
  workShiftModesAny?: number[];
  /** Required language IDs (any-of); levels are not enforced in the index. */
  languageIdsAny?: number[];
  /** Required PC skill IDs (any-of). */
  pcSkillIdsAny?: number[];
  /** Match any of these `start_type` values. */
  startTypesAny?: string[];
  /** Filter on indexed `start_date_ts` (unix seconds). */
  startDateFromTs?: number;
  /** When set, filter catalog to domestic (`false`) or foreign (`true`) jobs. */
  isForeign?: boolean;
};

export type TypesenseFacetCountGroup = {
  field: string;
  counts: Array<{ value: string; count: number }>;
};

export type TypesenseJobSearchResult = {
  ids: string[];
  found: number;
  facetCounts: TypesenseFacetCountGroup[];
};
