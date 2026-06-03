import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetchWithTimeout } from '../common/fetch-with-timeout';
import type { SkSchoolLevelDto, SkSchoolResponseDto } from '../locations/locations.dto';
import type {
  JobTypesenseQueryParams,
  TypesenseFacetCountGroup,
  TypesenseJobSearchResult,
  TypesenseJobSortMode,
} from './typesense-job-search.types';
import {
  buildSkSchoolsFilterBy,
  mapTypesenseDocToSkSchoolResponse,
  type SkSchoolTypesenseDoc,
} from './typesense-sk-school.util';

type TypesenseDocument = Record<string, unknown>;

type TypesenseJobSearchHit = {
  document?: {
    id?: string;
    title?: string;
    description?: string;
    location?: string;
    location_address?: string;
    requirements?: string;
  };
  /** Present on keyword / hybrid hits; larger = stronger lexical match within this response. */
  text_match?: number;
};

@Injectable()
export class TypesenseService implements OnModuleInit {
  private readonly logger = new Logger(TypesenseService.name);

  /** After a 401 from Typesense, stop calling it until process restart (wrong TYPESENSE_API_KEY). */
  private typesenseAuthRejected = false;

  /** After a connection failure, skip Typesense until process restart (server not running). */
  private typesenseUnreachable = false;
  /** Cached: jobs collection schema defines `is_foreign` (domestic/foreign catalog split). */
  private jobsForeignFilterFieldReady: boolean | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureCollections();
    } catch (err) {
      this.logger.warn(`Typesense bootstrap failed: ${String(err)}`);
    }
  }

  private get enabled(): boolean {
    if (this.typesenseAuthRejected || this.typesenseUnreachable) {
      return false;
    }
    const host = this.config.get<string>('TYPESENSE_HOST')?.trim();
    const key = this.config.get<string>('TYPESENSE_API_KEY')?.trim();
    return Boolean(host && key);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Whether job search can filter by `is_foreign` in Typesense (schema + reindexed docs). */
  async jobsIndexSupportsForeignFilter(): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }
    if (this.jobsForeignFilterFieldReady !== null) {
      return this.jobsForeignFilterFieldReady;
    }
    try {
      const meta = await this.request<{ fields?: Array<{ name?: string }> }>(
        'GET',
        `/collections/${this.jobsCollection}`,
      );
      const names = new Set(
        (meta.fields ?? []).map((f) => String(f.name ?? '')),
      );
      this.jobsForeignFilterFieldReady = names.has('is_foreign');
    } catch {
      this.jobsForeignFilterFieldReady = false;
    }
    return this.jobsForeignFilterFieldReady;
  }

  private markAuthRejectedFrom401(): void {
    if (this.typesenseAuthRejected) {
      return;
    }
    this.typesenseAuthRejected = true;
    this.logger.error(
      'Typesense returned 401 — TYPESENSE_API_KEY must match the Typesense server admin key (same as --api-key / docker env). Typesense is disabled for this process; search uses the DB fallback. Restart after fixing .env.',
    );
  }

  private markUnreachableFromConnection(detail: string): void {
    if (this.typesenseUnreachable) {
      return;
    }
    this.typesenseUnreachable = true;
    this.logger.warn(
      `Typesense unreachable at ${this.baseUrl} (${detail}). Typesense is disabled for this process; search uses the Postgres fallback. Start the server (see backend-ts/README.md) and restart the API, then run: npm run search:reindex -- --schools-only`,
    );
  }

  private isConnectionError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      msg.includes('fetch failed') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ECONNRESET') ||
      msg.includes('connection failed') ||
      msg.includes('ENOTFOUND')
    );
  }

  private get baseUrl(): string {
    const protocol = this.config.get<string>('TYPESENSE_PROTOCOL') || 'http';
    const host = this.config.get<string>('TYPESENSE_HOST')?.trim() || 'localhost';
    const port = this.config.get<string>('TYPESENSE_PORT') || '8108';
    return `${protocol}://${host}:${port}`;
  }

  private get apiKey(): string {
    return this.config.get<string>('TYPESENSE_API_KEY')?.trim() || '';
  }

  private get jobsCollection(): string {
    return this.config.get<string>('TYPESENSE_COLLECTION_JOBS') || 'jobs';
  }

  private get profilesCollection(): string {
    return this.config.get<string>('TYPESENSE_COLLECTION_PROFILES') || 'profiles';
  }

  private get schoolsCollection(): string {
    return this.config.get<string>('TYPESENSE_COLLECTION_SCHOOLS') || 'sk_schools';
  }

  private get schoolsNumTypos(): number {
    const raw = this.config.get<string>('TYPESENSE_SCHOOLS_NUM_TYPOS');
    const n = raw != null ? Number.parseInt(raw, 10) : 2;
    return Number.isFinite(n) && n >= 0 && n <= 4 ? n : 2;
  }

  private get jobsEmbedModel(): string {
    return (
      this.config.get<string>('TYPESENSE_JOBS_EMBED_MODEL') ||
      'ts/all-MiniLM-L12-v2'
    );
  }

  /** Fields combined for auto-embedding (must match searchable text fields). */
  private readonly jobsEmbedFrom = [
    'title',
    'description',
    'location',
    'location_address',
    'requirements',
  ] as const;

  private readonly jobsHybridQueryBy =
    'title,description,location,location_address,requirements,embedding';

  /** Single-token queries this length or shorter use stricter matching (ratio floor + cap). */
  private readonly jobsShortSingleTokenMaxLen = 4;

  /** Lift keep-ratio when the query is one short token (e.g. "web") to shed description noise. */
  private readonly jobsShortSingleTokenRatioFloor = 0.76;

  /** Stricter ratio floor for longer single-token queries (e.g. "pokosenie"). */
  private readonly jobsLongSingleTokenRatioFloor = 0.72;

  /** Max hits kept for a single short-token query after lexical trim (browse-all excluded). */
  private readonly jobsShortSingleTokenMaxHits = 12;

  /** No typos for very short single-token queries (reduces spurious matches). */
  private readonly jobsDisableTyposSingleTokenMaxLen = 3;

  /**
   * Hybrid `query_by_weights` (five integer weights for title,description,location,location_address,embedding).
   * Default balances title with embedding so paraphrases can rank (still guard-railed by lexical tail + caps).
   * Set env to `disable` / `off` / `false` to omit the param.
   */
  private jobsHybridQueryByWeightsResolved(): string | null {
    const raw = this.config.get<string>('TYPESENSE_JOBS_HYBRID_QUERY_BY_WEIGHTS');
    const v = raw?.trim();
    if (!v) {
      return '5,3,2,2,3,4';
    }
    const lowered = v.toLowerCase();
    if (lowered === 'disable' || lowered === 'off' || lowered === 'false') {
      return null;
    }
    return v;
  }

  /** Keyword `query_by_weights` (four fields). Default favors title. Disable same as hybrid. */
  private jobsKeywordQueryByWeightsResolved(): string | null {
    const raw = this.config.get<string>('TYPESENSE_JOBS_KEYWORD_QUERY_BY_WEIGHTS');
    const v = raw?.trim();
    if (!v) {
      return '7,3,2,2,2';
    }
    const lowered = v.toLowerCase();
    if (lowered === 'disable' || lowered === 'off' || lowered === 'false') {
      return null;
    }
    return v;
  }

  /**
   * Keep hits whose text_match is at least this fraction of the best lexical hit.
   * **Default 0.52** when unset. Set `off` / `0` / `false` to disable ratio filtering (semantic cap still applies).
   */
  private jobsKeepTextMatchRatio(): number | null {
    const raw = this.config.get<string>('TYPESENSE_JOBS_KEEP_TEXT_MATCH_RATIO');
    if (raw === undefined || raw === '') {
      return 0.52;
    }
    const lowered = raw.trim().toLowerCase();
    if (lowered === '0' || lowered === 'off' || lowered === 'false') {
      return null;
    }
    const n = parseFloat(raw);
    return Number.isFinite(n) && n > 0 && n <= 1 ? n : 0.52;
  }

  /** When every hit is embedding-only (text_match 0), cap how many we return. */
  private jobsSemanticOnlyMaxHits(): number {
    const raw = this.config.get<string>('TYPESENSE_JOBS_SEMANTIC_ONLY_MAX_HITS');
    if (raw === undefined || raw === '') {
      return 12;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) {
      return 12;
    }
    return Math.min(n, 100);
  }

  /**
   * When false (default), fused hits with no lexical score (text_match) yield no results instead of vector guesses.
   * Set true to return embedding-only matches when nothing matched lexically (broader paraphrase recall).
   */
  private jobsAllowSemanticWithoutLexicalScore(): boolean {
    const raw = this.config.get<string>(
      'TYPESENSE_JOBS_ALLOW_SEMANTIC_WITHOUT_LEXICAL',
    );
    if (raw === undefined || raw === '') {
      return false;
    }
    const v = raw.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  }

  /**
   * Append at most this many embedding-only fusion hits after lexical-refined hits (fusion order preserved).
   * Defaults to 18; short single-token queries use a smaller effective cap inside the service.
   */
  private jobsSemanticTailMaxHits(): number {
    const raw = this.config.get<string>('TYPESENSE_JOBS_SEMANTIC_TAIL_MAX_HITS');
    if (raw === undefined || raw === '') {
      return 18;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) {
      return 18;
    }
    return Math.min(n, 100);
  }

  private jobsSemanticTailMaxHitsForQuery(effectiveQuery: string): number {
    const base = this.jobsSemanticTailMaxHits();
    const tokens = this.tokenizeJobsSearchQuery(effectiveQuery);
    if (
      tokens.length === 1 &&
      tokens[0].length > 1 &&
      tokens[0].length <= this.jobsShortSingleTokenMaxLen
    ) {
      return Math.min(base, 6);
    }
    return base;
  }

  private hitDocumentId(hit: TypesenseJobSearchHit): string | null {
    const id = hit.document?.id;
    return typeof id === 'string' && id.length > 0 ? id : null;
  }

  /** Typos per token for job search (0–2). Lower = fewer false positives. Default 1. */
  private jobsSearchNumTypos(): number {
    const raw = this.config.get<string>('TYPESENSE_JOBS_NUM_TYPOS');
    if (raw === undefined || raw === '') {
      return 1;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0 || n > 2) {
      return 1;
    }
    return n;
  }

  /**
   * If result count &lt; this, Typesense drops query tokens (very broad matches).
   * 0 disables dropping — keeps queries strict so odd tokens do not match random listings.
   */
  private jobsDropTokensThreshold(): number {
    const raw = this.config.get<string>('TYPESENSE_JOBS_DROP_TOKENS_THRESHOLD');
    if (raw === undefined || raw === '') {
      return 0;
    }
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  private tsFilterStringToken(value: string): string {
    const v = value.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
    return `\`${v}\``;
  }

  /** Merges legacy job filter args with extended Typesense params. */
  private buildJobsFilterBy(
    params: JobTypesenseQueryParams & { urgentOnly?: boolean },
  ): string[] {
    const filterBy: string[] = ['is_active:=true', 'is_draft:=false'];
    if (params.isForeign === true) {
      filterBy.push('is_foreign:=true');
    } else if (params.isForeign === false) {
      // !=true matches false and documents indexed before is_foreign existed (optional field).
      filterBy.push('is_foreign:!=true');
    }
    const nowTs = Math.floor(Date.now() / 1000);
    filterBy.push(
      `(application_deadline_ts:=0 || application_deadline_ts:>=${nowTs})`,
    );
    const catRaw = params.category?.trim();
    if (catRaw && catRaw !== 'all') {
      const cats = catRaw
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      if (cats.length === 1) {
        filterBy.push(`category:=${this.tsFilterStringToken(cats[0]!)}`);
      } else if (cats.length > 1) {
        const inner = cats
          .map((c) => `category:=${this.tsFilterStringToken(c)}`)
          .join(' || ');
        filterBy.push(`(${inner})`);
      }
    }
    const jtList = (params.jobTypes ?? [])
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0 && s !== 'all');
    if (jtList.length > 1) {
      const inner = jtList
        .map((jt) => {
          const tok = this.tsFilterStringToken(jt);
          return `(employment_types:=${tok} || job_type:=${tok})`;
        })
        .join(' || ');
      filterBy.push(`(${inner})`);
    } else if (jtList.length === 1) {
      const tok = this.tsFilterStringToken(jtList[0]!);
      filterBy.push(`(employment_types:=${tok} || job_type:=${tok})`);
    } else {
      const jt = params.jobType?.trim();
      if (jt && jt !== 'all') {
        const tok = this.tsFilterStringToken(jt);
        filterBy.push(`(employment_types:=${tok} || job_type:=${tok})`);
      }
    }
    const wmList = (params.workModes ?? [])
      .map((s) => String(s).trim())
      .filter((s) => ['on_site', 'hybrid', 'remote'].includes(s));
    if (wmList.length > 1) {
      const inner = wmList
        .map((wm) => `work_mode:=${this.tsFilterStringToken(wm)}`)
        .join(' || ');
      filterBy.push(`(${inner})`);
    } else if (wmList.length === 1) {
      filterBy.push(`work_mode:=${this.tsFilterStringToken(wmList[0]!)}`);
    } else {
      const wm = params.workMode?.trim();
      if (wm && ['on_site', 'hybrid', 'remote'].includes(wm)) {
        filterBy.push(`work_mode:=${this.tsFilterStringToken(wm)}`);
      }
    }
    if (params.urgentOnly) {
      filterBy.push('is_urgent:=true');
    }
    if (params.featuredOnly) {
      filterBy.push('is_featured:=true');
    }
    const st = params.salaryType?.trim();
    const salaryTypeFilter =
      st &&
      ['monthly', 'hourly', 'one_time', 'task_based', 'negotiable'].includes(st)
        ? st
        : undefined;
    if (salaryTypeFilter) {
      filterBy.push(
        `salary_type:=${this.tsFilterStringToken(salaryTypeFilter)}`,
      );
    } else {
      const comp = params.compensationType?.trim();
      if (comp && comp !== 'all') {
        filterBy.push(`compensation_type:=${this.tsFilterStringToken(comp)}`);
      }
    }
    if (
      params.minHourlyWage !== undefined &&
      Number.isFinite(params.minHourlyWage) &&
      params.salaryMin === undefined
    ) {
      filterBy.push(`compensation_amount:>=${params.minHourlyWage}`);
    }
    if (
      params.maxHourlyWage !== undefined &&
      Number.isFinite(params.maxHourlyWage)
    ) {
      filterBy.push(`compensation_amount:<=${params.maxHourlyWage}`);
    }
    if (
      params.createdAfterTs !== undefined &&
      Number.isFinite(params.createdAfterTs) &&
      params.createdAfterTs > 0
    ) {
      filterBy.push(`created_at_ts:>=${Math.floor(params.createdAfterTs)}`);
    }
    if (
      params.createdBeforeTs !== undefined &&
      Number.isFinite(params.createdBeforeTs) &&
      params.createdBeforeTs > 0
    ) {
      filterBy.push(`created_at_ts:<=${Math.floor(params.createdBeforeTs)}`);
    }
    const tags = (params.skillTagsAny ?? [])
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    if (tags.length > 0) {
      const inner = tags
        .slice(0, 24)
        .map((t) => this.tsFilterStringToken(t))
        .join(',');
      filterBy.push(`skill_tags:[${inner}]`);
    }
    if (params.workFromHomeOnly) {
      filterBy.push('work_from_home:=true');
    }
    if (params.salaryMin !== undefined && Number.isFinite(params.salaryMin)) {
      const sm = params.salaryMin;
      filterBy.push(
        `(salary_max:>=${sm} || salary_min:>=${sm})`,
      );
    }
    if (params.salaryMax !== undefined && Number.isFinite(params.salaryMax)) {
      filterBy.push(`salary_min:<=${params.salaryMax}`);
    }
    const pushIntArrayFilter = (
      field: string,
      values: number[] | undefined,
      mode: 'any' | 'all',
    ): void => {
      if (!Array.isArray(values) || values.length === 0) {
        return;
      }
      const clean = values
        .map((n) => Math.trunc(Number(n)))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (clean.length === 0) {
        return;
      }
      if (mode === 'any') {
        filterBy.push(`${field}:[${clean.join(',')}]`);
      } else {
        for (const v of clean.slice(0, 32)) {
          filterBy.push(`${field}:=${v}`);
        }
      }
    };
    pushIntArrayFilter('education_levels', params.educationLevelsAny, 'any');
    pushIntArrayFilter('benefits', params.benefitsAll, 'all');
    pushIntArrayFilter('suitable_for', params.suitableForAny, 'any');
    pushIntArrayFilter('driver_licenses', params.driverLicensesAny, 'any');
    pushIntArrayFilter('work_shift_modes', params.workShiftModesAny, 'any');
    pushIntArrayFilter('language_ids', params.languageIdsAny, 'any');
    pushIntArrayFilter('pc_skill_ids', params.pcSkillIdsAny, 'any');
    const startTypes = (params.startTypesAny ?? [])
      .map((t) => String(t ?? '').trim())
      .filter((t) => t === 'asap' || t === 'by_agreement' || t === 'date');
    if (startTypes.length === 1) {
      filterBy.push(
        `start_type:=${this.tsFilterStringToken(startTypes[0]!)}`,
      );
    } else if (startTypes.length > 1) {
      const inner = startTypes
        .map((t) => `start_type:=${this.tsFilterStringToken(t)}`)
        .join(' || ');
      filterBy.push(`(${inner})`);
    }
    if (
      params.startDateFromTs !== undefined &&
      Number.isFinite(params.startDateFromTs) &&
      params.startDateFromTs > 0
    ) {
      filterBy.push(`start_date_ts:>=${Math.floor(params.startDateFromTs)}`);
    }
    return filterBy;
  }

  private normalizeFacetCounts(
    raw: unknown,
  ): TypesenseFacetCountGroup[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    const out: TypesenseFacetCountGroup[] = [];
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      const field = String(
        (entry as { field_name?: string }).field_name ?? '',
      );
      const countsRaw = (entry as { counts?: unknown }).counts;
      if (!field || !Array.isArray(countsRaw)) {
        continue;
      }
      const counts: Array<{ value: string; count: number }> = [];
      for (const c of countsRaw) {
        if (!c || typeof c !== 'object') {
          continue;
        }
        const value = String((c as { value?: unknown }).value ?? '');
        const count = Number((c as { count?: unknown }).count ?? 0);
        if (value.length > 0 && Number.isFinite(count)) {
          counts.push({ value, count });
        }
      }
      if (counts.length > 0) {
        out.push({ field, counts });
      }
    }
    return out;
  }

  /** Trim, strip stray punctuation (e.g. "web:"), collapse spaces — avoids broad scans from junk tokens. */
  private normalizeJobsSearchQuery(raw?: string): string {
    if (!raw) {
      return '';
    }
    let s = raw.trim();
    if (!s) {
      return '';
    }
    s = s.replace(/^[:;,.!?]+/gu, '').replace(/[:;,.!?]+$/gu, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  private jobsEffectiveQuery(params: {
    q?: string;
    location?: string;
  }): string {
    const q = this.normalizeJobsSearchQuery(params.q);
    if (q.length > 0) {
      return q;
    }
    const loc = this.normalizeJobsSearchQuery(params.location);
    return loc.length > 0 ? loc : '*';
  }

  private tokenizeJobsSearchQuery(query: string): string[] {
    const q = query.trim();
    if (q === '' || q === '*') {
      return [];
    }
    return q.split(/\s+/).filter((t) => t.length > 0);
  }

  /**
   * True when each query token appears somewhere in title, description, locations, or requirements
   * (substring, case-insensitive). Keeps multi-word queries from unrelated vector/embedding matches
   * while still allowing description-only lexical hits.
   */
  private hitJobSearchableFieldsMatchAllTokens(
    hit: TypesenseJobSearchHit,
    tokens: string[],
  ): boolean {
    const d = hit.document;
    const blob = [
      d?.title,
      d?.description,
      d?.location,
      d?.location_address,
      d?.requirements,
    ]
      .map((s) => String(s ?? '').toLowerCase())
      .join('\n');
    if (!blob.trim()) {
      return false;
    }
    return tokens.every((t) => blob.includes(t.toLowerCase()));
  }

  /** Lower typos for tiny single-token queries so "web" does not spread to unrelated words. */
  private jobsSearchNumTyposForEffectiveQuery(effectiveQuery: string): number {
    const base = this.jobsSearchNumTypos();
    const tokens = this.tokenizeJobsSearchQuery(effectiveQuery);
    if (
      tokens.length === 1 &&
      tokens[0].length > 0 &&
      tokens[0].length <= this.jobsDisableTyposSingleTokenMaxLen
    ) {
      return 0;
    }
    return base;
  }

  /** Stricter lexical ratio for single-token queries (short vs long tokens). */
  private jobsKeepTextMatchRatioForQuery(effectiveQuery: string): number | null {
    const base = this.jobsKeepTextMatchRatio();
    const tokens = this.tokenizeJobsSearchQuery(effectiveQuery);
    if (base === null || tokens.length !== 1 || tokens[0].length <= 1) {
      return base;
    }
    const t = tokens[0];
    if (t.length <= this.jobsShortSingleTokenMaxLen) {
      return Math.max(base, this.jobsShortSingleTokenRatioFloor);
    }
    return Math.max(base, this.jobsLongSingleTokenRatioFloor);
  }

  /** Whether the user typed a textual query (not browsing all listings). */
  private jobsHasTextQuery(params: {
    q?: string;
    location?: string;
  }): boolean {
    return Boolean(params.q?.trim() || params.location?.trim());
  }

  /** Browse-all mode: no search box text → effective query is "*". */
  private isJobsBrowseAllQuery(params: {
    q?: string;
    location?: string;
  }): boolean {
    return (
      !this.jobsHasTextQuery(params) ||
      this.jobsEffectiveQuery(params) === '*'
    );
  }

  private mapHitsToJobIds(hits: TypesenseJobSearchHit[]): string[] {
    return hits
      .map((h) => h.document?.id)
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
  }

  /**
   * Lexical refinement only (hits with text_match); multi-token optional tightening against
   * title+description+locations+requirements; preserves fusion order.
   */
  private orderLexicalRefinedHits(
    hits: TypesenseJobSearchHit[],
    effectiveQuery: string,
  ): TypesenseJobSearchHit[] {
    const tokens = this.tokenizeJobsSearchQuery(effectiveQuery);
    const scored = hits.filter((h) => Number(h.text_match ?? 0) > 0);
    if (scored.length === 0) {
      return [];
    }
    const ratio = this.jobsKeepTextMatchRatioForQuery(effectiveQuery);
    let refinedIds: Set<string>;
    if (ratio === null) {
      refinedIds = new Set(
        scored
          .map((h) => this.hitDocumentId(h))
          .filter((id): id is string => Boolean(id)),
      );
    } else {
      const maxTm = Math.max(...scored.map((h) => Number(h.text_match ?? 0)));
      const narrowed = scored.filter(
        (h) => Number(h.text_match ?? 0) >= maxTm * ratio,
      );
      const narrowedList =
        narrowed.length > 0
          ? narrowed
          : [...scored].sort(
              (a, b) =>
                Number(b.text_match ?? 0) - Number(a.text_match ?? 0),
            ).slice(0, 1);
      refinedIds = new Set(
        narrowedList
          .map((h) => this.hitDocumentId(h))
          .filter((id): id is string => Boolean(id)),
      );
    }
    let ordered = hits.filter((h) => {
      const id = this.hitDocumentId(h);
      return Boolean(id && refinedIds.has(id) && Number(h.text_match ?? 0) > 0);
    });
    if (tokens.length >= 2) {
      ordered = ordered.filter((h) =>
        this.hitJobSearchableFieldsMatchAllTokens(h, tokens),
      );
    }
    if (
      tokens.length === 1 &&
      tokens[0].length > 1 &&
      tokens[0].length <= this.jobsShortSingleTokenMaxLen
    ) {
      ordered = ordered.slice(0, this.jobsShortSingleTokenMaxHits);
    }
    return ordered;
  }

  /**
   * Hybrid fusion: lexical precision + capped embedding-only tail (fusion order) so paraphrases can surface.
   */
  private refineHybridJobHits(
    hits: TypesenseJobSearchHit[],
    effectiveQuery: string,
  ): TypesenseJobSearchHit[] {
    const tokens = this.tokenizeJobsSearchQuery(effectiveQuery);
    const semanticCap = this.jobsSemanticOnlyMaxHits();
    if (hits.length === 0) {
      return hits;
    }
    if (hits.length === 1) {
      const only = hits[0];
      const tm = Number(only.text_match ?? 0);
      if (tm === 0) {
        return this.jobsAllowSemanticWithoutLexicalScore() ? hits : [];
      }
      if (
        tokens.length >= 2 &&
        !this.hitJobSearchableFieldsMatchAllTokens(only, tokens)
      ) {
        return [];
      }
      return hits;
    }
    const hasLexicalScore = hits.some((h) => Number(h.text_match ?? 0) > 0);
    if (!hasLexicalScore && !this.jobsAllowSemanticWithoutLexicalScore()) {
      return [];
    }
    const lexicalOrdered = this.orderLexicalRefinedHits(hits, effectiveQuery);
    if (lexicalOrdered.length > 0) {
      return lexicalOrdered;
    }
    const lexicalIds = new Set(
      lexicalOrdered
        .map((h) => this.hitDocumentId(h))
        .filter((id): id is string => Boolean(id)),
    );
    const tailCap = this.jobsSemanticTailMaxHitsForQuery(effectiveQuery);
    const semanticTail: TypesenseJobSearchHit[] = [];
    for (const h of hits) {
      const id = this.hitDocumentId(h);
      if (!id || lexicalIds.has(id)) {
        continue;
      }
      if (Number(h.text_match ?? 0) > 0) {
        continue;
      }
      if (semanticTail.length >= tailCap) {
        break;
      }
      semanticTail.push(h);
    }
    const scoredExists = hits.some((h) => Number(h.text_match ?? 0) > 0);
    if (
      lexicalOrdered.length === 0 &&
      semanticTail.length === 0 &&
      !scoredExists
    ) {
      const semanticOnly = hits.filter(
        (h) => Number(h.text_match ?? 0) === 0,
      );
      return semanticOnly.slice(0, semanticCap);
    }
    if (
      lexicalOrdered.length === 0 &&
      semanticTail.length === 0 &&
      scoredExists
    ) {
      return hits
        .filter((h) => Number(h.text_match ?? 0) === 0)
        .slice(0, semanticCap);
    }
    return [...lexicalOrdered, ...semanticTail];
  }

  private async jobsSearchPost(
    params: JobTypesenseQueryParams & { urgentOnly?: boolean },
    opts: {
      page: number;
      perPage: number;
      sortBy?: string;
      facetBy?: string;
      keywordOnly?: boolean;
    },
  ): Promise<{
    hits: TypesenseJobSearchHit[];
    found: number;
    facet_counts?: unknown[];
  }> {
    const filterBy = this.buildJobsFilterBy(params);
    const q = this.jobsEffectiveQuery(params);
    const keywordOnly = Boolean(opts.keywordOnly);
    const queryBy = keywordOnly
      ? 'title,description,location,location_address,requirements'
      : this.jobsHybridQueryBy;
    const searchParams: Record<string, unknown> = {
      collection: this.jobsCollection,
      q,
      query_by: queryBy,
      filter_by: filterBy.join(' && '),
      per_page: opts.perPage,
      page: opts.page,
      exclude_fields: 'embedding',
      /** `true` so short queries match inflected tokens (e.g. "web" → "webu" in "tvorba webu"). */
      prefix: q.trim() !== '*' && q.trim().length > 0,
      num_typos: this.jobsSearchNumTyposForEffectiveQuery(q),
      drop_tokens_threshold: this.jobsDropTokensThreshold(),
    };
    if (opts.facetBy && opts.facetBy.length > 0) {
      searchParams.facet_by = opts.facetBy;
      searchParams.max_facet_values = 48;
    }
    if (keywordOnly) {
      const kw = this.jobsKeywordQueryByWeightsResolved();
      if (kw) {
        searchParams.query_by_weights = kw;
      }
      searchParams.sort_by =
        opts.sortBy ?? '_text_match:desc,created_at_ts:desc';
    } else {
      const w = this.jobsHybridQueryByWeightsResolved();
      if (w) {
        searchParams.query_by_weights = w;
      }
      if (opts.sortBy) {
        searchParams.sort_by = opts.sortBy;
      }
    }
    const multi = await this.request<{
      results?: Array<{
        hits?: TypesenseJobSearchHit[];
        found?: number;
        facet_counts?: unknown[];
      }>;
    }>('POST', '/multi_search', { searches: [searchParams] });
    const r = multi.results?.[0];
    return {
      hits: r?.hits ?? [],
      found: typeof r?.found === 'number' ? r.found : 0,
      facet_counts: r?.facet_counts,
    };
  }

  /** POST multi_search — hybrid fusion hits (keyword + embedding), Typesense-ranked. */
  private async fetchJobsHybridFusionHits(
    params: JobTypesenseQueryParams & {
      urgentOnly?: boolean;
      limit: number;
      offset: number;
    },
    options?: { fetchTopRankedWindow?: boolean },
  ): Promise<TypesenseJobSearchHit[]> {
    const windowed = Boolean(options?.fetchTopRankedWindow);
    const page = windowed
      ? 1
      : Math.floor(params.offset / Math.max(1, params.limit)) + 1;
    const perPage = windowed
      ? Math.min(
          100,
          Math.max(params.offset + params.limit + 24, 48),
        )
      : params.limit;
    const { hits } = await this.jobsSearchPost(params, { page, perPage });
    return hits;
  }

  private async searchJobIdsFromHybridFusion(
    params: JobTypesenseQueryParams & {
      urgentOnly?: boolean;
      limit: number;
      offset: number;
    },
  ): Promise<string[]> {
    const effectiveQuery = this.jobsEffectiveQuery(params);
    const hits = await this.fetchJobsHybridFusionHits(params, {
      fetchTopRankedWindow: true,
    });
    const refined = this.refineHybridJobHits(hits, effectiveQuery);
    let slice = refined.slice(
      params.offset,
      params.offset + params.limit,
    );
    let ids = this.mapHitsToJobIds(slice);
    if (
      ids.length === 0 &&
      hits.length > 0 &&
      this.jobsKeepTextMatchRatio() !== null
    ) {
      const tokens = this.tokenizeJobsSearchQuery(effectiveQuery);
      if (tokens.length >= 2) {
        return [];
      }
      const hadLexicalScore = hits.some((h) => Number(h.text_match ?? 0) > 0);
      if (!hadLexicalScore) {
        return [];
      }
      this.logger.warn(
        'Job search refinement removed all Typesense hits; returning unfiltered fusion results.',
      );
      ids = this.mapHitsToJobIds(
        hits.slice(params.offset, params.offset + params.limit),
      );
    }
    return ids;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetchWithTimeout(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-TYPESENSE-API-KEY': this.apiKey,
        },
        body: body ? JSON.stringify(body) : undefined,
        metricsTarget: 'typesense',
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.markUnreachableFromConnection(detail);
      throw new Error(
        `Typesense connection failed at ${this.baseUrl}${path} (${detail}). Is Typesense running? See backend-ts/README.md.`,
      );
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Typesense ${method} ${path} failed: ${response.status} ${text}`);
    }
    return (await response.json()) as T;
  }

  async ensureCollections(): Promise<void> {
    if (!this.enabled) return;
    await this.ensureJobsCollection();
    await this.ensureJobsSearchSynonyms();
    await this.ensureProfilesCollection();
    await this.ensureSkSchoolsCollection();
  }

  /**
   * Slovak cargo/logistics wording so inflected queries match titles (e.g. vykladanie ↔ vykladka).
   * Safe multi-way sets; extend via Typesense API as needed.
   */
  private async ensureJobsSearchSynonyms(): Promise<void> {
    if (!this.enabled) return;
    const synSets: Array<{ id: string; synonyms: string[] }> = [
      {
        id: 'sk-vyklad',
        synonyms: [
          'vykladanie',
          'vykladka',
          'vykladať',
          'vykladat',
          'vykládať',
          'vykladám',
          'vykladani',
        ],
      },
      {
        id: 'sk-kamion',
        synonyms: [
          'kamion',
          'kamión',
          'kamionov',
          'kamiónov',
          'kamionu',
          'kamiónu',
          'kamiony',
        ],
      },
      {
        id: 'sk-kosenie',
        synonyms: [
          'pokosenie',
          'pokosiť',
          'pokosit',
          'pokosim',
          'pokosím',
          'kosenie',
          'kosiť',
          'kosit',
          'kosim',
          'kosím',
        ],
      },
    ];
    for (const { id, synonyms } of synSets) {
      try {
        await this.request(
          'PUT',
          `/collections/${this.jobsCollection}/synonyms/${encodeURIComponent(id)}`,
          { synonyms },
        );
      } catch (err) {
        this.logger.warn(
          `Typesense synonym "${id}" upsert skipped: ${String(err)}`,
        );
      }
    }
  }

  private jobsCollectionFields(includeEmbedding: boolean): unknown[] {
    const fields: unknown[] = [
      { name: 'id', type: 'string' },
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string', optional: true },
      { name: 'location', type: 'string', optional: true },
      { name: 'location_address', type: 'string', optional: true },
      { name: 'requirements', type: 'string', optional: true },
      {
        name: 'skill_tags',
        type: 'string[]',
        facet: true,
        optional: true,
      },
      { name: 'compensation_amount', type: 'float', optional: true },
      {
        name: 'compensation_type',
        type: 'string',
        facet: true,
        optional: true,
      },
      { name: 'application_deadline_ts', type: 'int64', optional: true },
      { name: 'is_featured', type: 'bool', facet: true, optional: true },
      { name: 'company_id', type: 'string', optional: true },
      { name: 'applications_count', type: 'int32', optional: true },
      { name: 'category', type: 'string', facet: true, optional: true },
      { name: 'job_type', type: 'string', facet: true, optional: true },
      {
        name: 'employment_types',
        type: 'string[]',
        facet: true,
        optional: true,
      },
      { name: 'work_mode', type: 'string', facet: true, optional: true },
      {
        name: 'work_modes',
        type: 'string[]',
        facet: true,
        optional: true,
      },
      { name: 'city', type: 'string', facet: true, optional: true },
      { name: 'work_from_home', type: 'bool', facet: true, optional: true },
      { name: 'salary_type', type: 'string', facet: true, optional: true },
      { name: 'salary_min', type: 'float', optional: true },
      { name: 'salary_max', type: 'float', optional: true },
      {
        name: 'education_levels',
        type: 'int32[]',
        facet: true,
        optional: true,
      },
      { name: 'benefits', type: 'int32[]', facet: true, optional: true },
      { name: 'suitable_for', type: 'int32[]', facet: true, optional: true },
      {
        name: 'driver_licenses',
        type: 'int32[]',
        facet: true,
        optional: true,
      },
      {
        name: 'work_shift_modes',
        type: 'int32[]',
        facet: true,
        optional: true,
      },
      { name: 'language_ids', type: 'int32[]', facet: true, optional: true },
      { name: 'pc_skill_ids', type: 'int32[]', facet: true, optional: true },
      { name: 'start_type', type: 'string', facet: true, optional: true },
      { name: 'start_date_ts', type: 'int64', optional: true },
      { name: 'is_urgent', type: 'bool', facet: true, optional: true },
      { name: 'is_active', type: 'bool', facet: true, optional: true },
      { name: 'is_draft', type: 'bool', facet: true, optional: true },
      { name: 'is_foreign', type: 'bool', facet: true, optional: true },
      { name: 'created_at_ts', type: 'int64' },
    ];
    if (includeEmbedding) {
      fields.push({
        name: 'embedding',
        type: 'float[]',
        embed: {
          from: [...this.jobsEmbedFrom],
          model_config: {
            model_name: this.jobsEmbedModel,
          },
        },
      });
    }
    return fields;
  }

  /** True if the remote jobs collection schema already defines an embedding field. */
  private async jobsCollectionHasEmbeddingField(): Promise<boolean> {
    try {
      const meta = await this.request<{ fields?: Array<{ name?: string }> }>(
        'GET',
        `/collections/${this.jobsCollection}`,
      );
      const names = new Set(
        (meta.fields ?? []).map((f) => String(f.name ?? '')),
      );
      return names.has('embedding');
    } catch {
      return false;
    }
  }

  private async ensureJobsCollection(): Promise<void> {
    const payload = {
      name: this.jobsCollection,
      fields: this.jobsCollectionFields(true),
      default_sorting_field: 'created_at_ts',
    };
    try {
      await this.request('POST', '/collections', payload);
      this.logger.log(
        `Typesense jobs collection "${this.jobsCollection}" created with hybrid embedding (${this.jobsEmbedModel}).`,
      );
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('already exists')) {
        this.logger.warn(msg);
        return;
      }
    }
    if (await this.jobsCollectionHasEmbeddingField()) {
      this.logger.log(
        `Typesense jobs collection "${this.jobsCollection}" already has an embedding field (hybrid search).`,
      );
      await this.ensureJobsCollectionExtraFields();
      return;
    }
    try {
      await this.request('PATCH', `/collections/${this.jobsCollection}`, {
        fields: [
          {
            name: 'embedding',
            type: 'float[]',
            embed: {
              from: [...this.jobsEmbedFrom],
              model_config: {
                model_name: this.jobsEmbedModel,
              },
            },
          },
        ],
      });
      this.logger.log(
        `Typesense jobs collection "${this.jobsCollection}" patched with embedding field (${this.jobsEmbedModel}). Re-run npm run search:reindex to backfill vectors.`,
      );
    } catch (patchErr) {
      const pmsg =
        patchErr instanceof Error ? patchErr.message : String(patchErr);
      if (
        pmsg.includes('already part of the schema') ||
        pmsg.includes('already exists')
      ) {
        this.logger.log(
          `Typesense jobs collection "${this.jobsCollection}" embedding field already present.`,
        );
        await this.ensureJobsCollectionExtraFields();
        return;
      }
      this.logger.warn(
        `Could not add embedding to existing jobs collection (hybrid search may fall back to keyword-only until you recreate the collection and reindex): ${pmsg}`,
      );
    }
    await this.ensureJobsCollectionExtraFields();
  }

  private async ensureJobsCollectionExtraFields(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    let meta: { fields?: Array<{ name?: string }> };
    try {
      meta = await this.request<{ fields?: Array<{ name?: string }> }>(
        'GET',
        `/collections/${this.jobsCollection}`,
      );
    } catch {
      return;
    }
    const have = new Set(
      (meta.fields ?? []).map((f) => String(f.name ?? '')),
    );
    const toAdd = (
      [
        {
          name: 'requirements',
          type: 'string',
          optional: true,
        },
        {
          name: 'skill_tags',
          type: 'string[]',
          facet: true,
          optional: true,
        },
        {
          name: 'compensation_amount',
          type: 'float',
          optional: true,
        },
        {
          name: 'compensation_type',
          type: 'string',
          facet: true,
          optional: true,
        },
        {
          name: 'application_deadline_ts',
          type: 'int64',
          optional: true,
        },
        {
          name: 'is_featured',
          type: 'bool',
          facet: true,
          optional: true,
        },
        { name: 'company_id', type: 'string', optional: true },
        {
          name: 'applications_count',
          type: 'int32',
          optional: true,
        },
        {
          name: 'work_mode',
          type: 'string',
          facet: true,
          optional: true,
        },
        { name: 'work_from_home', type: 'bool', facet: true, optional: true },
        { name: 'salary_type', type: 'string', facet: true, optional: true },
        { name: 'salary_min', type: 'float', optional: true },
        { name: 'salary_max', type: 'float', optional: true },
        {
          name: 'education_levels',
          type: 'int32[]',
          facet: true,
          optional: true,
        },
        { name: 'benefits', type: 'int32[]', facet: true, optional: true },
        {
          name: 'suitable_for',
          type: 'int32[]',
          facet: true,
          optional: true,
        },
        {
          name: 'driver_licenses',
          type: 'int32[]',
          facet: true,
          optional: true,
        },
        {
          name: 'work_shift_modes',
          type: 'int32[]',
          facet: true,
          optional: true,
        },
        {
          name: 'language_ids',
          type: 'int32[]',
          facet: true,
          optional: true,
        },
        {
          name: 'pc_skill_ids',
          type: 'int32[]',
          facet: true,
          optional: true,
        },
        { name: 'start_type', type: 'string', facet: true, optional: true },
        { name: 'start_date_ts', type: 'int64', optional: true },
        {
          name: 'is_foreign',
          type: 'bool',
          facet: true,
          optional: true,
        },
      ] as Array<Record<string, unknown>>
    ).filter((f) => !have.has(String(f.name)));
    if (toAdd.length === 0) {
      return;
    }
    try {
      await this.request('PATCH', `/collections/${this.jobsCollection}`, {
        fields: toAdd,
      });
      if (toAdd.some((f) => String(f.name) === 'is_foreign')) {
        this.jobsForeignFilterFieldReady = true;
      }
      this.logger.log(
        `Typesense jobs collection patched: ${toAdd
          .map((f) => String(f.name))
          .join(', ')}. Re-run npm run search:reindex.`,
      );
    } catch (err) {
      this.logger.warn(
        `Typesense jobs schema patch failed: ${String(err)}`,
      );
    }
  }

  private async ensureProfilesCollection(): Promise<void> {
    const payload = {
      name: this.profilesCollection,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'display_name', type: 'string', optional: true },
        { name: 'company_name', type: 'string', optional: true },
        { name: 'bio', type: 'string', optional: true },
        { name: 'description', type: 'string', optional: true },
        { name: 'skills', type: 'string', optional: true },
        { name: 'sector', type: 'string', optional: true },
        { name: 'location', type: 'string', optional: true },
        { name: 'customer_role', type: 'bool', facet: true, optional: true },
        { name: 'worker_role', type: 'bool', facet: true, optional: true },
        { name: 'provider_role', type: 'bool', facet: true, optional: true },
        { name: 'created_at_ts', type: 'int64' },
      ],
      default_sorting_field: 'created_at_ts',
    };
    try {
      await this.request('POST', '/collections', payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('already exists')) this.logger.warn(msg);
    }
  }

  /** Keyword-only search (POST, same filters as hybrid). */
  private async searchJobIdsKeywordOnly(
    params: JobTypesenseQueryParams & {
      urgentOnly?: boolean;
      limit: number;
      offset: number;
    },
  ): Promise<string[]> {
    const page =
      Math.floor(params.offset / Math.max(1, params.limit)) + 1;
    const { hits } = await this.jobsSearchPost(params, {
      page,
      perPage: params.limit,
      keywordOnly: true,
    });
    return this.mapHitsToJobIds(hits);
  }

  /**
   * Full job search: filters, facets, sort modes, hybrid relevance refinement when applicable.
   */
  async searchJobsTypesense(
    params: JobTypesenseQueryParams & {
      urgentOnly?: boolean;
      limit: number;
      offset: number;
      sort?: TypesenseJobSortMode;
      facetBy?: string;
      includeFacets?: boolean;
    },
  ): Promise<TypesenseJobSearchResult | null> {
    if (!this.enabled) {
      return null;
    }
    try {
      return await this.searchJobsTypesenseInner(params);
    } catch (err) {
      this.logger.warn(
        `Typesense job search failed (${this.baseUrl}): ${String(err)}`,
      );
      return null;
    }
  }

  private async searchJobsTypesenseInner(
    params: JobTypesenseQueryParams & {
      urgentOnly?: boolean;
      limit: number;
      offset: number;
      sort?: TypesenseJobSortMode;
      facetBy?: string;
      includeFacets?: boolean;
    },
  ): Promise<TypesenseJobSearchResult> {
    const sort: TypesenseJobSortMode = params.sort ?? 'relevance';
    const facetByStr =
      params.includeFacets === false
        ? undefined
        : params.facetBy ??
          'category,job_type,work_mode,is_urgent,is_featured,skill_tags,compensation_type';
    const base = { ...params };
    if (sort === 'created_at' || sort === 'compensation_amount') {
      const page =
        Math.floor(params.offset / Math.max(1, params.limit)) + 1;
      const sortBy =
        sort === 'created_at'
          ? 'created_at_ts:desc'
          : 'compensation_amount:desc';
      const { hits, found, facet_counts } = await this.jobsSearchPost(base, {
        page,
        perPage: params.limit,
        sortBy,
        facetBy: facetByStr,
      });
      return {
        ids: this.mapHitsToJobIds(hits),
        found,
        facetCounts: this.normalizeFacetCounts(facet_counts),
      };
    }
    if (this.isJobsBrowseAllQuery(params)) {
      const page =
        Math.floor(params.offset / Math.max(1, params.limit)) + 1;
      const { hits, found, facet_counts } = await this.jobsSearchPost(base, {
        page,
        perPage: params.limit,
        keywordOnly: true,
        facetBy: facetByStr,
      });
      return {
        ids: this.mapHitsToJobIds(hits),
        found,
        facetCounts: this.normalizeFacetCounts(facet_counts),
      };
    }
    const effectiveQuery = this.jobsEffectiveQuery(params);
    const window = await this.jobsSearchPost(base, {
      page: 1,
      perPage: Math.min(
        100,
        Math.max(params.offset + params.limit + 24, 48),
      ),
      facetBy: facetByStr,
    });
    const refined = this.refineHybridJobHits(window.hits, effectiveQuery);
    const slice = refined.slice(
      params.offset,
      params.offset + params.limit,
    );
    let ids = this.mapHitsToJobIds(slice);
    if (
      ids.length === 0 &&
      window.hits.length > 0 &&
      this.jobsKeepTextMatchRatio() !== null
    ) {
      const tokens = this.tokenizeJobsSearchQuery(effectiveQuery);
      if (tokens.length < 2) {
        const hadLexicalScore = window.hits.some(
          (h) => Number(h.text_match ?? 0) > 0,
        );
        if (hadLexicalScore) {
          this.logger.warn(
            'Job search refinement removed all Typesense hits; returning unfiltered fusion results.',
          );
          ids = this.mapHitsToJobIds(
            window.hits.slice(
              params.offset,
              params.offset + params.limit,
            ),
          );
        }
      }
    }
    return {
      ids,
      found: window.found,
      facetCounts: this.normalizeFacetCounts(window.facet_counts),
    };
  }

  async searchJobIds(params: {
    q?: string;
    category?: string;
    jobType?: string;
    location?: string;
    urgentOnly?: boolean;
    limit: number;
    offset: number;
    minHourlyWage?: number;
    maxHourlyWage?: number;
    createdAfterTs?: number;
    skillTagsAny?: string[];
  }): Promise<string[] | null> {
    if (!this.enabled) {
      return null;
    }
    try {
      const full = await this.searchJobsTypesense({
        ...params,
        sort: 'relevance',
        includeFacets: false,
      });
      return full?.ids ?? [];
    } catch (err) {
      this.logger.warn(
        `searchJobsTypesense failed, keyword fallback: ${String(err)}`,
      );
      try {
        return await this.searchJobIdsKeywordOnly({
          ...params,
          limit: params.limit,
          offset: params.offset,
        });
      } catch {
        return [];
      }
    }
  }

  /** Type-ahead on title (prefix). */
  async suggestJobCompletions(params: {
    q: string;
    limit?: number;
  }): Promise<string[]> {
    if (!this.enabled || !params.q.trim()) {
      return [];
    }
    const lim = Math.min(Math.max(Number(params.limit) || 8, 1), 20);
    const qs = new URLSearchParams({
      q: params.q.trim(),
      query_by: 'title',
      prefix: 'true',
      per_page: String(lim),
      page: '1',
      num_typos: '1',
      filter_by: 'is_active:=true && is_draft:=false',
    });
    try {
      const result = await this.request<{
        hits?: Array<{ document?: { title?: string } }>;
      }>(
        'GET',
        `/collections/${this.jobsCollection}/documents/search?${qs.toString()}`,
      );
      const titles: string[] = [];
      const seen = new Set<string>();
      for (const h of result.hits ?? []) {
        const t = String(h.document?.title ?? '').trim();
        if (t && !seen.has(t.toLowerCase())) {
          seen.add(t.toLowerCase());
          titles.push(t);
        }
      }
      return titles;
    } catch (err) {
      this.logger.warn(`suggestJobCompletions failed: ${String(err)}`);
      return [];
    }
  }

  async findSimilarJobIds(jobId: string, limit: number): Promise<string[]> {
    if (!this.enabled) {
      return [];
    }
    const lim = Math.min(Math.max(limit, 1), 24);
    try {
      const vec = await this.request<{
        results?: Array<{
          hits?: TypesenseJobSearchHit[];
        }>;
      }>(
        'POST',
        '/multi_search',
        {
          searches: [
            {
              collection: this.jobsCollection,
              q: '*',
              vector_query: `embedding:([], id:${jobId})`,
              filter_by: `id:!=${jobId} && is_active:=true && is_draft:=false`,
              per_page: lim,
              page: 1,
            },
          ],
        },
      );
      const hits = vec.results?.[0]?.hits ?? [];
      return this.mapHitsToJobIds(hits);
    } catch (err) {
      this.logger.warn(
        `Typesense similar (vector) failed for ${jobId}: ${String(err)}`,
      );
      return [];
    }
  }

  async searchFeaturedJobIds(limit: number): Promise<string[]> {
    if (!this.enabled) {
      return [];
    }
    const lim = Math.min(Math.max(limit, 1), 48);
    const { hits } = await this.jobsSearchPost(
      { featuredOnly: true },
      {
        page: 1,
        perPage: lim,
        sortBy: 'created_at_ts:desc',
        keywordOnly: true,
      },
    );
    return this.mapHitsToJobIds(hits);
  }

  async searchTrendingJobIds(limit: number): Promise<string[]> {
    if (!this.enabled) {
      return [];
    }
    const lim = Math.min(Math.max(limit, 1), 48);
    const { hits } = await this.jobsSearchPost(
      {},
      {
        page: 1,
        perPage: lim,
        sortBy: 'applications_count:desc,created_at_ts:desc',
        keywordOnly: true,
      },
    );
    return this.mapHitsToJobIds(hits);
  }

  async searchProfileIds(params: {
    q?: string;
    category?: string;
    location?: string;
    limit: number;
    offset: number;
    customerRole?: boolean;
    workerRole?: boolean;
    providerRole?: boolean;
  }): Promise<{ ids: string[]; found: number } | null> {
    if (!this.enabled) {
      return null;
    }
    const filterBy: string[] = [];
    const loc = params.location?.trim();
    if (loc) {
      filterBy.push(`location:=${this.tsFilterStringToken(loc)}`);
    }
    if (params.customerRole === true) {
      filterBy.push('customer_role:=true');
    }
    if (params.workerRole === true) {
      filterBy.push('worker_role:=true');
    }
    if (params.providerRole === true) {
      filterBy.push('provider_role:=true');
    }
    const q = params.q?.trim() || params.location?.trim() || '*';
    const page = Math.floor(params.offset / Math.max(1, params.limit)) + 1;
    const qs = new URLSearchParams({
      q,
      query_by:
        'display_name,company_name,bio,description,skills,sector,location',
      sort_by: '_text_match:desc,created_at_ts:desc',
      num_typos: '2',
      per_page: String(params.limit),
      page: String(page),
    });
    if (filterBy.length > 0) {
      qs.set('filter_by', filterBy.join(' && '));
    }
    const result = await this.request<{
      hits?: Array<{ document?: { id?: string } }>;
      found?: number;
    }>(
      'GET',
      `/collections/${this.profilesCollection}/documents/search?${qs.toString()}`,
    );
    const ids = (result.hits ?? [])
      .map((h) => h.document?.id)
      .filter((v): v is string => typeof v === 'string' && v.length > 0);
    return { ids, found: typeof result.found === 'number' ? result.found : ids.length };
  }

  async upsertJobDocument(doc: TypesenseDocument): Promise<void> {
    if (!this.enabled) return;
    await this.request(
      'POST',
      `/collections/${this.jobsCollection}/documents?action=upsert`,
      doc,
    );
  }

  async upsertProfileDocument(doc: TypesenseDocument): Promise<void> {
    if (!this.enabled) return;
    await this.request(
      'POST',
      `/collections/${this.profilesCollection}/documents?action=upsert`,
      doc,
    );
  }

  async deleteJobDocument(id: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.request('DELETE', `/collections/${this.jobsCollection}/documents/${id}`);
    } catch {
      // ignore missing docs
    }
  }

  async deleteProfileDocument(id: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.request('DELETE', `/collections/${this.profilesCollection}/documents/${id}`);
    } catch {
      // ignore missing docs
    }
  }

  private async ensureSkSchoolsCollection(): Promise<void> {
    const payload = {
      name: this.schoolsCollection,
      fields: [
        { name: 'id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'name_normalized', type: 'string' },
        { name: 'level', type: 'string', facet: true },
        { name: 'country', type: 'string', facet: true },
        { name: 'municipality', type: 'string', optional: true },
        { name: 'sort_id', type: 'int64' },
      ],
      default_sorting_field: 'sort_id',
    };
    try {
      await this.request('POST', '/collections', payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('already exists')) {
        this.logger.warn(msg);
      }
    }
  }

  /**
   * Fuzzy school name search for CV picker. Returns null when Typesense is disabled or errors (use SQL fallback).
   */
  async searchSkSchools(
    query: string,
    level: SkSchoolLevelDto,
    limit: number,
  ): Promise<SkSchoolResponseDto[] | null> {
    if (!this.enabled) {
      return null;
    }
    const q = query.trim();
    if (q.length < 3) {
      return [];
    }
    const perPage = Math.min(80, Math.max(1, limit));
    try {
      const qs = new URLSearchParams({
        q,
        query_by: 'name,name_normalized,municipality',
        filter_by: buildSkSchoolsFilterBy(level),
        sort_by: '_text_match:desc,country:asc,sort_id:asc',
        num_typos: String(this.schoolsNumTypos),
        per_page: String(perPage),
        page: '1',
      });
      const result = await this.request<{
        hits?: Array<{ document?: Record<string, unknown> }>;
      }>(
        'GET',
        `/collections/${this.schoolsCollection}/documents/search?${qs.toString()}`,
      );
      const out: SkSchoolResponseDto[] = [];
      for (const hit of result.hits ?? []) {
        const doc = hit.document;
        if (!doc) continue;
        const mapped = mapTypesenseDocToSkSchoolResponse(doc);
        if (mapped) out.push(mapped);
      }
      return out;
    } catch (err) {
      if (!this.isConnectionError(err)) {
        this.logger.warn(
          `Typesense school search failed (${this.baseUrl}): ${String(err)}`,
        );
      }
      return null;
    }
  }

  async upsertSkSchoolDocument(doc: SkSchoolTypesenseDoc): Promise<void> {
    if (!this.enabled) return;
    await this.request(
      'POST',
      `/collections/${this.schoolsCollection}/documents?action=upsert`,
      doc,
    );
  }

  async importSkSchoolDocuments(docs: SkSchoolTypesenseDoc[]): Promise<void> {
    if (!this.enabled || docs.length === 0) return;
    const body = docs.map((d) => JSON.stringify(d)).join('\n');
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${this.baseUrl}/collections/${this.schoolsCollection}/documents/import?action=upsert`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
            'X-TYPESENSE-API-KEY': this.apiKey,
          },
          body,
          timeoutMs: 60_000,
          metricsTarget: 'typesense',
        },
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.markUnreachableFromConnection(detail);
      throw new Error(
        `Typesense school import failed at ${this.baseUrl} (${detail})`,
      );
    }
    if (!response.ok) {
      const text = await response.text();
      if (response.status === 401) {
        this.markAuthRejectedFrom401();
      }
      throw new Error(
        `Typesense school import failed: ${response.status} ${text}`,
      );
    }
  }
}
