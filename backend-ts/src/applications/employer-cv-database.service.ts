import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { cvDbShellScanCappedTotal } from '../observability/metrics';
import { SupabaseService } from '../supabase/supabase.service';
import { CvService } from '../cv/cv.service';
import { displaySkillName } from '../cv/cv-skill-name';
import type { CvAggregateResponseDto } from '../cv/cv.dto';
import {
  displayNameFromProfileRow,
  avatarUrlFromProfileRow,
} from '../profiles/profile-display.util';
import { ChatRoomsService } from '../chat/chat-rooms.service';
import type {
  EmployerCvDatabaseListItemDto,
  EmployerCvDatabaseListResponseDto,
  EmployerCvDatabaseOpenChatApplicationDto,
  EmployerCvDatabaseOpenChatResponseDto,
  EmployerCvDatabaseQueryDto,
} from './employer-cv-database.dto';
import { splitCommaList } from './employer-cv-database.dto';

/**
 * Employer CV browse/detail — GDPR gates (see docs/GDPR-PRIVACY.md):
 * - List: visible_to_employers + public_show_in_company_search; no gender/disability/birth_date.
 * - Contact: show_contact_details OR cv_contact_unlocks row for (company_id, cv_id).
 * - Chat: blocked when public_allow_platform_contact is false.
 * PERF: Complex filters cap at MAX_SHELL_SCAN shells before in-memory scoring.
 */

/** Max CV shells loaded while resolving complex in-memory filters. */
const MAX_SHELL_SCAN = 2000;
const SHELL_BATCH = 80;
const DEFAULT_LIMIT = 20;
const TOP_SKILLS = 8;

/**
 * Discrimination-sensitive filters off by default. Mirror in
 * `app-pwa/utils/cv-database-feature-flags.ts`.
 */
const ENABLE_GENDER_FILTER = false;
// Disability filter is not exposed: `cv_personal_info.disability_sharing_consent`
// column does not exist yet. Add a migration before enabling.

/** Filter token → CV `employment_types` values that satisfy the filter (ANY). */
const CV_JOB_TYPE_FILTER_MATCH: Record<string, readonly string[]> = {
  full_time: ['full_time'],
  part_time: ['part_time'],
  brigada: ['brigada', 'agreement', 'student_agreement'],
  agreement: ['brigada', 'agreement', 'student_agreement'],
  internship: ['internship'],
  one_off: ['one_off', 'fuska'],
  zivnost: ['zivnost', 'self_employed'],
  self_employed: ['zivnost', 'self_employed'],
};

function cvEmploymentMatchesJobTypeFilter(
  cvTypes: string[],
  filterType: string,
): boolean {
  const cv = new Set(cvTypes.map((x) => String(x).toLowerCase()));
  const key = String(filterType).toLowerCase();
  const aliases = CV_JOB_TYPE_FILTER_MATCH[key] ?? [key];
  return aliases.some((a) => cv.has(a));
}

const LANG_LEVEL_ORDER: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

type CvShellRow = {
  id: string;
  user_id: string;
  updated_at: string;
  photo_url: string | null;
  photo_storage_path: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_deleted: boolean;
  logo_url: string | null;
  avatar_url: string | null;
  location: string | null;
};

type PersonalRow = {
  cv_id: string;
  first_name: string | null;
  last_name: string | null;
  title_before_name: string | null;
  title_after_name: string | null;
  academic_title: string | null;
  show_academic_title: boolean | null;
  address_city: string | null;
  address_district: string | null;
  address_country: string | null;
  driving_license_categories: string[] | null;
  highest_education_level: string | null;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  about_me: string | null;
  show_contact_details: boolean | null;
};

type JobPrefRow = {
  cv_id: string;
  desired_positions: string[] | null;
  desired_locations: string[] | null;
  employment_types: string[] | null;
  start_availability: string | null;
  salary_min: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  weekend_work: boolean | null;
  night_work: boolean | null;
  email_job_alerts: boolean | null;
  additional_skills_info: string | null;
};

type SkillRow = {
  cv_id: string;
  skill_name: string;
  sort_order: number;
};

type LanguageRow = {
  cv_id: string;
  language: string;
  level: string | null;
  sort_order: number;
};

type ExperienceRow = {
  cv_id: string;
  company: string;
  position: string;
  current: boolean;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  description: string | null;
};

type SoftSkillRow = {
  cv_id: string;
  skill_name: string;
};

type EducationRow = {
  cv_id: string;
  school: string | null;
  degree: string | null;
  field: string | null;
  institution: string | null;
  education_kind: string | null;
  has_graduation: boolean | null;
  study_level: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
};

type CertificationRow = {
  cv_id: string;
  name: string | null;
  description: string | null;
};

interface NormalizedFilters {
  q: string;
  location: string;
  radius: string;
  jobTypes: string[];
  desiredPosition: string;
  skills: string[];
  experience: string;
  availability: string;
  salaryMax: number | null;
  languages: string[];
  languageLevels: Record<string, string>;
  softSkills: string[];
  educationLevel: string;
  school: string;
  fieldOfStudy: string;
  hasCertificate: boolean;
  certificate: string;
  jobTitle: string;
  employer: string;
  currentlyEmployed: boolean;
  drivingLicences: string[];
  weekendWork: string;
  nightWork: string;
  lastActive: string;
  lastUpdated: string;
  candidateStatus: string;
  hasPhoto: boolean;
  completedCv: boolean;
  hasSummary: boolean;
  hasExperience: boolean;
  hasEducation: boolean;
  hasSkills: boolean;
  hasLanguages: boolean;
  canReceiveOffers: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  name: string;
  ageMin: number | null;
  ageMax: number | null;
  gender: string;
  sort: string;
  page: number;
  offset: number;
  limit: number;
  educationQ: string;
  updatedAfter: string;
  updatedBefore: string;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asBoolish(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === 'string') {
    const v = value.toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
  }
  return false;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return splitCommaList(value);
  }
  return [];
}

function parseLanguageLevels(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const [lang, lvl] = pair.split(':').map((s) => s.trim());
    if (!lang || !lvl) continue;
    const upper = lvl.toUpperCase();
    if (LANG_LEVEL_ORDER[upper] !== undefined) {
      out[lang.toLowerCase()] = upper;
    }
  }
  return out;
}

@Injectable()
export class EmployerCvDatabaseService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly cvService: CvService,
    private readonly chatRooms: ChatRoomsService,
  ) {}

  private client() {
    return this.supabase.getClient();
  }

  private profileAvatarUrl(p: ProfileRow | null | undefined): string | null {
    if (!p || p.is_deleted) {
      return null;
    }
    const fromUtil = avatarUrlFromProfileRow(p);
    if (fromUtil) {
      return fromUtil;
    }
    const raw = (p.avatar_url ?? '').trim();
    return raw !== '' ? raw : null;
  }

  private candidateDisplayName(
    personal: PersonalRow | undefined,
    profile: ProfileRow | undefined,
  ): string {
    if (personal) {
      const parts: string[] = [];
      if (personal.show_academic_title && personal.academic_title?.trim()) {
        parts.push(personal.academic_title.trim());
      }
      if (personal.title_before_name?.trim()) {
        parts.push(personal.title_before_name.trim());
      }
      const fn = (personal.first_name ?? '').trim();
      const ln = (personal.last_name ?? '').trim();
      if (fn || ln) {
        parts.push([fn, ln].filter(Boolean).join(' '));
      }
      if (personal.title_after_name?.trim()) {
        parts.push(personal.title_after_name.trim());
      }
      const joined = parts.join(' ').trim();
      if (joined) {
        return joined;
      }
    }
    return displayNameFromProfileRow(profile)?.trim() || 'Kandidát';
  }

  private locationLine(
    personal: PersonalRow | undefined,
    profile: ProfileRow | undefined,
  ): string | null {
    const city = (personal?.address_city ?? '').trim();
    const district = (personal?.address_district ?? '').trim();
    const country = (personal?.address_country ?? '').trim();
    const structured = [city, district, country].filter(Boolean).join(', ');
    if (structured) {
      return structured;
    }
    const loc = (profile?.location ?? '').trim();
    return loc !== '' ? loc : null;
  }

  /** City, else district, else profile location — for employer list cards only. */
  private listLocationLine(
    personal: PersonalRow | undefined,
    profile: ProfileRow | undefined,
  ): string | null {
    const city = (personal?.address_city ?? '').trim();
    if (city) return city;
    const district = (personal?.address_district ?? '').trim();
    if (district) return district;
    const loc = (profile?.location ?? '').trim();
    return loc !== '' ? loc : null;
  }

  /** Privacy-friendly: first name + last initial; does not include academic titles. */
  private candidateListDisplayName(
    personal: PersonalRow | undefined,
    profile: ProfileRow | undefined,
  ): string {
    const fn = (personal?.first_name ?? profile?.first_name ?? '').trim();
    const ln = (personal?.last_name ?? profile?.last_name ?? '').trim();
    if (fn && ln) {
      const initial = ln[0]!.toUpperCase();
      return `${fn} ${initial}.`;
    }
    if (fn) return fn;
    const fromProfile = displayNameFromProfileRow(profile)?.trim();
    if (fromProfile) {
      const parts = fromProfile.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        const last = parts[parts.length - 1]!;
        return `${parts[0]} ${last[0]!.toUpperCase()}.`;
      }
      return parts[0] || 'Kandidát';
    }
    return 'Kandidát';
  }

  private static readonly EDU_STUDY_RANK: Record<string, number> = {
    university_phd: 6,
    phd: 6,
    university_mgr: 5,
    mgr: 5,
    university_bc: 4,
    bc: 4,
    bachelor: 4,
    secondary_with_graduation: 3,
    secondary: 2,
    basic: 1,
  };

  private educationRowRank(row: EducationRow): number {
    const sl = (row.study_level ?? '').trim().toLowerCase();
    if (EmployerCvDatabaseService.EDU_STUDY_RANK[sl] != null) {
      return EmployerCvDatabaseService.EDU_STUDY_RANK[sl]!;
    }
    const ek = (row.education_kind ?? '').trim().toLowerCase();
    if (ek === 'university') return 4;
    if (ek === 'secondary') return 2;
    if (ek === 'course') return 1;
    return 0;
  }

  private pickPrimaryEducation(rows: EducationRow[]): string | null {
    if (!rows.length) return null;
    const sorted = [...rows].sort((a, b) => {
      const ra = this.educationRowRank(a);
      const rb = this.educationRowRank(b);
      if (rb !== ra) return rb - ra;
      const endA = a.end_date ?? '9999-12-31';
      const endB = b.end_date ?? '9999-12-31';
      if (endB !== endA) return endB.localeCompare(endA);
      const startA = a.start_date ?? '';
      const startB = b.start_date ?? '';
      if (startB !== startA) return startB.localeCompare(startA);
      return (b.sort_order ?? 0) - (a.sort_order ?? 0);
    });
    const r = sorted[0]!;
    const school = (r.school ?? r.institution ?? '').trim();
    if (!school) return null;
    const detail = [r.field, r.degree]
      .map((x) => String(x ?? '').trim())
      .filter(Boolean)
      .join(', ');
    return detail ? `${school} · ${detail}` : school;
  }

  /** Put skills matching active recruiter filters first, then preserve CV order. */
  private orderSkillsForList(skillNamesInOrder: string[], filterSkills: string[]): string[] {
    if (!filterSkills.length) return [...skillNamesInOrder];
    const lower = skillNamesInOrder.map((s) => s.toLowerCase());
    const matched: string[] = [];
    const consumed = new Set<number>();
    for (const fs of filterSkills) {
      const needle = fs.trim().toLowerCase();
      if (!needle) continue;
      for (let i = 0; i < skillNamesInOrder.length; i++) {
        if (consumed.has(i)) continue;
        const s = lower[i]!;
        if (s.includes(needle) || needle.includes(s)) {
          matched.push(skillNamesInOrder[i]!);
          consumed.add(i);
        }
      }
    }
    const rest: string[] = [];
    for (let i = 0; i < skillNamesInOrder.length; i++) {
      if (!consumed.has(i)) rest.push(skillNamesInOrder[i]!);
    }
    return [...matched, ...rest];
  }

  private listItemAvatarUrl(
    shell: CvShellRow,
    profile: ProfileRow | undefined,
  ): string | null {
    const cvPhoto = (shell.photo_url ?? '').trim();
    if (cvPhoto) {
      return cvPhoto;
    }
    return this.profileAvatarUrl(profile);
  }

  private hasPhoto(shell: CvShellRow, profile: ProfileRow | undefined): boolean {
    if ((shell.photo_url ?? '').trim()) {
      return true;
    }
    if ((shell.photo_storage_path ?? '').trim()) {
      return true;
    }
    const u = this.profileAvatarUrl(profile);
    return Boolean(u && u.trim());
  }

  private pickLatestExperience(rows: ExperienceRow[]): ExperienceRow | null {
    const employment = rows.filter((r) => (r.position ?? '').trim() || (r.company ?? '').trim());
    if (!employment.length) {
      return null;
    }
    return [...employment].sort((a, b) => {
      if (a.current !== b.current) {
        return a.current ? -1 : 1;
      }
      const endA = a.end_date ?? '9999-12-31';
      const endB = b.end_date ?? '9999-12-31';
      if (endA !== endB) {
        return endB.localeCompare(endA);
      }
      const startA = a.start_date ?? '';
      const startB = b.start_date ?? '';
      return startB.localeCompare(startA);
    })[0];
  }

  private employmentSearchBlob(rows: ExperienceRow[]): string {
    const employment = rows.filter((r) => (r.position ?? '').trim() || (r.company ?? '').trim());
    const parts: string[] = [];
    for (const r of employment) {
      parts.push(
        [r.company, r.position, (r.description ?? '').trim()].filter(Boolean).join(' '),
      );
    }
    return parts.join(' ');
  }

  private educationSearchBlob(rows: EducationRow[]): string {
    const parts: string[] = [];
    for (const r of rows) {
      parts.push(
        [r.school ?? '', r.institution ?? '', r.degree ?? '', r.field ?? '']
          .map((x) => String(x).trim())
          .filter(Boolean)
          .join(' '),
      );
    }
    return parts.join(' ');
  }

  private licenseCategories(personal: PersonalRow | undefined): string[] {
    const raw = personal?.driving_license_categories;
    if (!raw || !Array.isArray(raw)) {
      return [];
    }
    return raw.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
  }

  private matchesDrivingLicenses(
    personal: PersonalRow | undefined,
    requiredCodes: string[],
  ): boolean {
    if (requiredCodes.length === 0) {
      return true;
    }
    const have = new Set(this.licenseCategories(personal));
    return requiredCodes.every((code) => have.has(code.trim().toUpperCase()));
  }

  private matchesTextNeedle(haystack: string, needleRaw: string | undefined): boolean {
    const needle = (needleRaw ?? '').trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return haystack.toLowerCase().includes(needle);
  }

  /**
   * Compute whole-years experience by summing non-overlapping ranges.
   * Overlapping employment periods are summed naively; a TODO comment marks
   * this caveat in the v1 implementation.
   */
  private calculateYearsOfExperience(rows: ExperienceRow[]): number {
    const employment = rows.filter((r) => (r.position ?? '').trim() || (r.company ?? '').trim());
    if (!employment.length) return 0;
    const nowIso = new Date().toISOString().slice(0, 10);
    let totalDays = 0;
    for (const r of employment) {
      const start = r.start_date ?? '';
      const end = r.current ? nowIso : (r.end_date ?? '');
      if (!start || !end) continue;
      const ts = Date.parse(start);
      const te = Date.parse(end);
      if (!Number.isFinite(ts) || !Number.isFinite(te) || te < ts) continue;
      // TODO(experience-overlap): overlapping employment ranges are summed
      // naively. Use interval merging if accuracy becomes important.
      totalDays += Math.floor((te - ts) / 86_400_000);
    }
    return Math.max(0, Math.floor(totalDays / 365));
  }

  private matchExperienceRange(years: number, rangeId: string): boolean {
    switch (rangeId) {
      case 'none':
      case 'lt1':
        return years < 1;
      case '1_2':
        return years >= 1 && years < 3;
      case '3_5':
        return years >= 3 && years < 6;
      case '6_10':
        return years >= 6 && years < 11;
      case '10p':
        return years >= 10;
      default:
        return true;
    }
  }

  private matchHighestEducation(
    rows: EducationRow[],
    personal: PersonalRow | undefined,
    wanted: string,
  ): boolean {
    if (!wanted) return true;
    const blob = (
      this.educationSearchBlob(rows)
      + ' '
      + (personal?.highest_education_level ?? '')
      + ' '
      + rows.map((r) => `${r.education_kind ?? ''} ${r.study_level ?? ''}`).join(' ')
    ).toLowerCase();
    const hasGraduation = rows.some((r) => r.has_graduation === true);
    switch (wanted) {
      case 'basic':
        return /(zakl|základ)/i.test(blob);
      case 'secondary':
        return /(stredn|gymná|sou)/i.test(blob);
      case 'secondary_with_graduation':
        return hasGraduation || /(maturit)/i.test(blob);
      case 'university_bc':
        return /(bakal|bc\.?)/i.test(blob);
      case 'university_mgr':
        return /(magist|mgr\.?|ing\.?|inžinier)/i.test(blob);
      case 'university_phd':
        return /(phd|doktor)/i.test(blob);
      case 'course':
        return /(kurz|certifik)/i.test(blob);
      default:
        return true;
    }
  }

  private matchLanguagesWithLevels(
    rows: LanguageRow[],
    required: string[],
    levels: Record<string, string>,
  ): boolean {
    if (!required.length) return true;
    const byLang = new Map<string, string | null>();
    for (const r of rows) {
      const k = (r.language ?? '').trim().toLowerCase();
      if (!k) continue;
      const lvl = (r.level ?? '').trim().toUpperCase();
      byLang.set(k, lvl || null);
    }
    return required.every((needle) => {
      const lc = needle.trim().toLowerCase();
      if (!lc) return true;
      let found: string | null | undefined;
      for (const [k, v] of byLang.entries()) {
        if (k === lc || k.includes(lc) || lc.includes(k)) {
          found = v;
          break;
        }
      }
      if (found === undefined) return false;
      const minLvl = levels[lc];
      if (!minLvl) return true;
      const have = found ? LANG_LEVEL_ORDER[found] ?? 0 : 0;
      return have >= (LANG_LEVEL_ORDER[minLvl] ?? 0);
    });
  }

  private matchAvailabilityBucket(text: string, wanted: string): boolean {
    if (!wanted) return true;
    const blob = text.toLowerCase();
    switch (wanted) {
      case 'immediately':
        return /(ihne[dď]|immediate|asap|okam[zž]ite)/i.test(blob);
      case 'by_agreement':
        return /(dohod|agreement|po dohode)/i.test(blob);
      // TODO(availability-buckets): explicit "do 1/2/3 mesiacov" buckets
      // need a structured column on cv_job_preferences. Today we substring-
      // match the free-text `start_availability`.
      case 'within_1_month':
        return /(1\s*mesia|do\s*mesiac|30\s*dn)/i.test(blob);
      case 'within_2_months':
        return /(2\s*mesia|60\s*dn)/i.test(blob);
      case 'within_3_months':
        return /(3\s*mesia|90\s*dn)/i.test(blob);
      default:
        return true;
    }
  }

  private matchLastUpdated(updatedAtIso: string, bucket: string): boolean {
    if (!bucket) return true;
    const t = Date.parse(updatedAtIso);
    if (!Number.isFinite(t)) return false;
    const days = (Date.now() - t) / 86_400_000;
    switch (bucket) {
      case '7d':
        return days <= 7;
      case '30d':
        return days <= 30;
      case '3m':
        return days <= 92;
      case '6m':
        return days <= 184;
      case '12m':
        return days <= 366;
      default:
        return true;
    }
  }

  private matchLastActive(updatedAtIso: string, bucket: string): boolean {
    if (!bucket) return true;
    // TODO(last-active): falls back to updated_at until a dedicated
    // `cv.last_active_at` (or session log) column is available.
    const t = Date.parse(updatedAtIso);
    if (!Number.isFinite(t)) return false;
    const days = (Date.now() - t) / 86_400_000;
    switch (bucket) {
      case 'today':
        return days <= 1;
      case '7d':
        return days <= 7;
      case '30d':
        return days <= 30;
      case '3m':
        return days <= 92;
      default:
        return true;
    }
  }

  private matchCandidateStatus(
    job: JobPrefRow | undefined,
    bucket: string,
  ): boolean {
    if (!bucket) return true;
    // TODO(candidate-status): without a `cv.candidate_status` column we
    // approximate via job preferences. Treat any visible CV as `open` and
    // anyone with `email_job_alerts=true` as `actively_looking`.
    const actively = job?.email_job_alerts === true;
    switch (bucket) {
      case 'actively_looking':
        return actively;
      case 'open':
        return true;
      case 'not_looking':
        return false;
      default:
        return true;
    }
  }

  private computeAge(personal: PersonalRow | undefined): number | null {
    const b = (personal?.birth_date ?? '').trim();
    if (!b) return null;
    const t = Date.parse(b);
    if (!Number.isFinite(t)) return null;
    const years = (Date.now() - t) / (365.25 * 86_400_000);
    if (years < 0 || years > 130) return null;
    return Math.floor(years);
  }

  private relevanceScore(
    q: string,
    name: string,
    positions: string[],
    skillNames: string[],
    cityLine: string,
    experienceBlob: string,
    educationBlob: string,
    aboutMe: string,
  ): number {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      return 0;
    }
    let score = 0;
    if (name.toLowerCase().includes(needle)) {
      score += 5;
    }
    for (const p of positions) {
      if (p.toLowerCase().includes(needle)) {
        score += 4;
      }
    }
    for (const s of skillNames) {
      if (s.toLowerCase().includes(needle)) {
        score += 3;
      }
    }
    if (cityLine.toLowerCase().includes(needle)) {
      score += 2;
    }
    if (experienceBlob.toLowerCase().includes(needle)) {
      score += 2;
    }
    if (educationBlob.toLowerCase().includes(needle)) {
      score += 2;
    }
    if (aboutMe.toLowerCase().includes(needle)) {
      score += 1;
    }
    return score;
  }

  private normalize(query: EmployerCvDatabaseQueryDto): NormalizedFilters {
    const limit = Math.min(100, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const page = Math.max(1, query.page ?? 1);
    const offset = query.offset != null ? Math.max(0, query.offset) : (page - 1) * limit;
    const salaryMax =
      query.salaryMax != null ? query.salaryMax
        : query.salary_max != null ? query.salary_max
          : null;

    const jobTypes = query.jobTypes?.length
      ? query.jobTypes
      : asStringArray(query.employment_types);
    const skills = query.skills?.length ? query.skills : [];
    const languages = query.languages?.length ? query.languages : [];
    const drivingLicences = query.drivingLicences?.length
      ? query.drivingLicences
      : asStringArray(query.driving_license);

    const ageMin = query.ageMin != null ? query.ageMin : null;
    const ageMaxRaw = query.ageMax != null ? query.ageMax : null;
    const ageMax = ageMin != null && ageMaxRaw != null && ageMin > ageMaxRaw
      ? null
      : ageMaxRaw;

    const sortInput = (query.sort ?? '').trim();
    let sort = sortInput || 'best_match';
    // Translate legacy values:
    if (sort === 'newest') sort = 'last_updated';
    if (sort === 'relevance') sort = 'best_match';
    if (sort === 'name') sort = 'best_match';

    return {
      q: asString(query.q),
      location: asString(query.location) || asString(query.city),
      radius: asString(query.radius),
      jobTypes,
      desiredPosition: asString(query.desired_position),
      skills,
      experience: asString(query.experience),
      availability: asString(query.availability),
      salaryMax,
      languages,
      languageLevels: parseLanguageLevels(query.languageLevels),
      softSkills: asStringArray(query.soft_skills),
      educationLevel: asString(query.educationLevel),
      school: asString(query.school),
      fieldOfStudy: asString(query.fieldOfStudy),
      hasCertificate: asBoolish(query.hasCertificate),
      certificate: asString(query.certificate),
      jobTitle: asString(query.jobTitle),
      employer: asString(query.employer),
      currentlyEmployed: asBoolish(query.currentlyEmployed),
      drivingLicences,
      weekendWork: asString(query.weekendWork),
      nightWork: asString(query.nightWork),
      lastActive: asString(query.lastActive),
      lastUpdated: asString(query.lastUpdated),
      candidateStatus: asString(query.candidateStatus),
      hasPhoto: asBoolish(query.hasPhoto) || asString(query.hasPhoto) === 'yes',
      completedCv: asBoolish(query.completedCv),
      hasSummary: asBoolish(query.hasSummary),
      hasExperience: asBoolish(query.hasExperience),
      hasEducation: asBoolish(query.hasEducation),
      hasSkills: asBoolish(query.hasSkills),
      hasLanguages: asBoolish(query.hasLanguages),
      canReceiveOffers: asBoolish(query.canReceiveOffers),
      hasPhone: asBoolish(query.hasPhone),
      hasEmail: asBoolish(query.hasEmail),
      name: asString(query.name),
      ageMin,
      ageMax,
      gender: ENABLE_GENDER_FILTER ? asString(query.gender) : '',
      sort,
      page,
      offset,
      limit,
      educationQ: asString(query.education_q),
      updatedAfter: asString(query.updated_after),
      updatedBefore: asString(query.updated_before),
    };
  }

  private hasComplexEmployerCvFilters(f: NormalizedFilters): boolean {
    return Boolean(
      f.q
      || f.location
      || f.desiredPosition
      || f.skills.length
      || f.softSkills.length
      || f.experience
      || f.availability
      || f.jobTypes.length
      || f.languages.length
      || Object.keys(f.languageLevels).length
      || f.educationLevel
      || f.school
      || f.fieldOfStudy
      || f.educationQ
      || f.hasCertificate
      || f.certificate
      || f.jobTitle
      || f.employer
      || f.currentlyEmployed
      || f.drivingLicences.length
      || f.weekendWork
      || f.nightWork
      || f.lastActive
      || f.lastUpdated
      || f.candidateStatus
      || f.completedCv
      || f.hasSummary
      || f.hasExperience
      || f.hasEducation
      || f.hasSkills
      || f.hasLanguages
      || f.canReceiveOffers
      || f.hasPhone
      || f.hasEmail
      || f.name
      || f.ageMin != null
      || f.ageMax != null
      || (ENABLE_GENDER_FILTER && f.gender)
      || f.salaryMax != null,
    );
  }

  private applyShellSqlFilters(query: any, f: NormalizedFilters): any {
    let q = query.eq('visible_to_employers', true);
    if (f.updatedAfter) {
      q = q.gte('updated_at', f.updatedAfter);
    }
    if (f.updatedBefore) {
      q = q.lte('updated_at', f.updatedBefore);
    }
    if (f.hasPhoto) {
      q = q.not('photo_url', 'is', null);
    }
    return q.order('updated_at', { ascending: false });
  }

  private async countVisibleShells(f: NormalizedFilters): Promise<number> {
    const { count, error } = await this.applyShellSqlFilters(
      this.client().from('cvs').select('id', { count: 'exact', head: true }),
      f,
    );
    if (error) {
      return 0;
    }
    return count ?? 0;
  }

  private async fetchShellBatch(
    dbOffset: number,
    batchSize: number,
    f: NormalizedFilters,
  ): Promise<CvShellRow[]> {
    const { data, error } = await this.applyShellSqlFilters(
      this.client().from('cvs').select(
        'id, user_id, updated_at, photo_url, photo_storage_path',
      ),
      f,
    ).range(dbOffset, dbOffset + batchSize - 1);
    if (error) {
      throw new ForbiddenException('Nepodarilo sa načítať životopisy');
    }
    return (data ?? []) as CvShellRow[];
  }

  private async loadContactUnlockSet(
    employerUserId: string,
    cvIds: string[],
  ): Promise<Set<string>> {
    if (cvIds.length === 0) {
      return new Set();
    }
    const { data, error } = await this.client()
      .from('cv_contact_unlocks')
      .select('cv_id')
      .eq('company_id', employerUserId)
      .in('cv_id', cvIds);
    if (error) {
      return new Set();
    }
    const rows = (data ?? []) as { cv_id?: string }[];
    return new Set(rows.map((r) => r.cv_id).filter((id): id is string => Boolean(id)));
  }

  async list(
    employerUserId: string,
    query: EmployerCvDatabaseQueryDto,
  ): Promise<EmployerCvDatabaseListResponseDto> {
    const f = this.normalize(query);
    const complex = this.hasComplexEmployerCvFilters(f);

    let dbOffset = 0;
    let totalIsPartial = false;
    const shellRows: CvShellRow[] = [];
    const dbFetchTarget = complex
      ? MAX_SHELL_SCAN
      : Math.min(f.offset + f.limit + SHELL_BATCH, MAX_SHELL_SCAN);

    while (shellRows.length < dbFetchTarget) {
      const batch = await this.fetchShellBatch(dbOffset, SHELL_BATCH, f);
      if (!batch.length) {
        break;
      }
      dbOffset += batch.length;
      shellRows.push(...batch);
      if (!complex) {
        break;
      }
      if (dbOffset >= MAX_SHELL_SCAN) {
        totalIsPartial = true;
        break;
      }
    }
    if (!complex && dbOffset >= MAX_SHELL_SCAN) {
      totalIsPartial = true;
    }
    if (totalIsPartial) {
      cvDbShellScanCappedTotal.inc();
    }

    if (!shellRows.length) {
      return { items: [], total: 0, offset: f.offset, limit: f.limit, total_is_partial: false };
    }
    const userIds = [...new Set(shellRows.map((s) => s.user_id))];
    const { data: profiles, error: profErr } = await this.client()
      .from('profiles')
      .select(
        'id, display_name, first_name, last_name, role, is_deleted, logo_url, avatar_url, location, public_show_in_company_search, public_allow_platform_contact',
      )
      .in('id', userIds)
      .eq('role', 'individual')
      .eq('is_deleted', false);
    if (profErr) {
      throw new ForbiddenException('Nepodarilo sa načítať profily');
    }
    const profileById = new Map<string, ProfileRow>();
    for (const p of profiles ?? []) {
      const pr = p as ProfileRow & {
        public_show_in_company_search?: boolean;
      };
      if (pr.public_show_in_company_search === false) {
        continue;
      }
      profileById.set(pr.id, pr);
    }
    const visibleShells = shellRows.filter((s) => profileById.has(s.user_id));
    const cvIds = visibleShells.map((s) => s.id);
    const jobByCv = new Map<string, JobPrefRow>();
    if (cvIds.length > 0) {
      const { data: jobs } = await this.client()
        .from('cv_job_preferences')
        .select(
          'cv_id, desired_positions, desired_locations, employment_types, start_availability, salary_min, salary_currency, salary_period, weekend_work, night_work, email_job_alerts, additional_skills_info',
        )
        .in('cv_id', cvIds);
      for (const row of (jobs ?? []) as JobPrefRow[]) {
        jobByCv.set(row.cv_id, row);
      }
    }
    // Every shell here already has visible_to_employers=true and an individual
    // profile. Do not require desired_positions / skills / experience — drafts
    // that opted in should still appear so recruiters see something to refine.
    const listShells = visibleShells;
    const listCvIds = listShells.map((s) => s.id);
    const personalByCv = new Map<string, PersonalRow>();
    if (listCvIds.length > 0) {
      const { data: pers } = await this.client()
        .from('cv_personal_info')
        .select(
          'cv_id, first_name, last_name, title_before_name, title_after_name, academic_title, show_academic_title, address_city, address_district, address_country, driving_license_categories, highest_education_level, about_me, show_contact_details',
        )
        .in('cv_id', listCvIds);
      for (const row of (pers ?? []) as PersonalRow[]) {
        personalByCv.set(row.cv_id, row);
      }
    }
    const skillsByCv = new Map<string, SkillRow[]>();
    const langsByCv = new Map<string, LanguageRow[]>();
    const expByCv = new Map<string, ExperienceRow[]>();
    if (listCvIds.length > 0) {
      const { data: skl } = await this.client()
        .from('cv_skills')
        .select('cv_id, skill_name, sort_order')
        .in('cv_id', listCvIds)
        .order('sort_order', { ascending: true });
      for (const row of (skl ?? []) as SkillRow[]) {
        const list = skillsByCv.get(row.cv_id) ?? [];
        list.push(row);
        skillsByCv.set(row.cv_id, list);
      }
      const { data: lng } = await this.client()
        .from('cv_languages')
        .select('cv_id, language, level, sort_order')
        .in('cv_id', listCvIds)
        .order('sort_order', { ascending: true });
      for (const row of (lng ?? []) as LanguageRow[]) {
        const list = langsByCv.get(row.cv_id) ?? [];
        list.push(row);
        langsByCv.set(row.cv_id, list);
      }
      const { data: ex } = await this.client()
        .from('cv_experience')
        .select(
          'cv_id, company, position, current, start_date, end_date, sort_order, description',
        )
        .in('cv_id', listCvIds)
        .eq('entry_type', 'employment');
      for (const row of (ex ?? []) as ExperienceRow[]) {
        const list = expByCv.get(row.cv_id) ?? [];
        list.push(row);
        expByCv.set(row.cv_id, list);
      }
    }
    const softSkillsByCv = new Map<string, SoftSkillRow[]>();
    const educationRowsByCv = new Map<string, EducationRow[]>();
    const certsByCv = new Map<string, CertificationRow[]>();
    if (listCvIds.length > 0) {
      const { data: sf } = await this.client()
        .from('cv_soft_skills')
        .select('cv_id, skill_name, sort_order')
        .in('cv_id', listCvIds)
        .order('sort_order', { ascending: true });
      for (const row of (sf ?? []) as SoftSkillRow[]) {
        const list = softSkillsByCv.get(row.cv_id) ?? [];
        list.push(row);
        softSkillsByCv.set(row.cv_id, list);
      }
      const { data: edu } = await this.client()
        .from('cv_education')
        .select(
          'cv_id, school, degree, field, institution, education_kind, has_graduation, study_level, start_date, end_date, sort_order',
        )
        .in('cv_id', listCvIds)
        .order('sort_order', { ascending: true });
      for (const row of (edu ?? []) as EducationRow[]) {
        const list = educationRowsByCv.get(row.cv_id) ?? [];
        list.push(row);
        educationRowsByCv.set(row.cv_id, list);
      }
      const { data: certs } = await this.client()
        .from('cv_certifications')
        .select('cv_id, name, description')
        .in('cv_id', listCvIds);
      for (const row of (certs ?? []) as CertificationRow[]) {
        const list = certsByCv.get(row.cv_id) ?? [];
        list.push(row);
        certsByCv.set(row.cv_id, list);
      }
    }

    type RowWork = {
      shell: CvShellRow;
      profile: ProfileRow;
      personal: PersonalRow | undefined;
      job: JobPrefRow | undefined;
      name: string;
      location: string | null;
      positions: string[];
      skillNames: string[];
      langLabels: string[];
      yearsExperience: number;
      currentlyEmployed: boolean;
      score: number;
    };
    const work: RowWork[] = [];
    for (const shell of listShells) {
      const profile = profileById.get(shell.user_id);
      if (!profile) continue;
      const personal = personalByCv.get(shell.id);
      const job = jobByCv.get(shell.id);
      const name = this.candidateDisplayName(personal, profile);
      const location = this.locationLine(personal, profile);
      const positions = job?.desired_positions ?? [];
      const skillRows = skillsByCv.get(shell.id) ?? [];
      const skillNames = skillRows
        .map((r) => displaySkillName(r.skill_name).trim())
        .filter(Boolean);
      const langRows = langsByCv.get(shell.id) ?? [];
      const langLabels = langRows.map((r) => (r.language ?? '').trim()).filter(Boolean);
      const expRowsAll = expByCv.get(shell.id) ?? [];
      const experienceBlob = this.employmentSearchBlob(expRowsAll);
      const eduRows = educationRowsByCv.get(shell.id) ?? [];
      const educationBlob = this.educationSearchBlob(eduRows);
      const softSkillNames = (softSkillsByCv.get(shell.id) ?? [])
        .map((r) => (r.skill_name ?? '').trim())
        .filter(Boolean);
      const certs = certsByCv.get(shell.id) ?? [];
      const yearsExperience = this.calculateYearsOfExperience(expRowsAll);
      const currentlyEmployed = expRowsAll.some((r) => r.current === true);
      const aboutMe = (personal?.about_me ?? '').trim();
      const additionalSkillsInfo = (job?.additional_skills_info ?? '').trim();

      // Legacy date-window filters (kept for back-compat)
      if (f.updatedAfter && shell.updated_at < f.updatedAfter) continue;
      if (f.updatedBefore && shell.updated_at > f.updatedBefore) continue;

      // Location (city / desired location substring)
      if (f.location) {
        const needle = f.location.toLowerCase();
        const loc = (location ?? '').toLowerCase();
        const desiredLocs = (job?.desired_locations ?? []).join(' ').toLowerCase();
        if (!loc.includes(needle) && !desiredLocs.includes(needle)) continue;
      }
      // Desired-position (legacy)
      if (f.desiredPosition) {
        const lc = f.desiredPosition.toLowerCase();
        if (!positions.some((p) => p.toLowerCase().includes(lc))) continue;
      }
      // Job type — ANY match
      if (f.jobTypes.length > 0) {
        const cvTypes = (job?.employment_types ?? []).map((x) => String(x));
        const ok = f.jobTypes.some((t) =>
          cvEmploymentMatchesJobTypeFilter(cvTypes, t),
        );
        if (!ok) continue;
      }
      // Availability — bucket match
      if (f.availability) {
        if (!this.matchAvailabilityBucket(job?.start_availability ?? '', f.availability)) {
          continue;
        }
      }
      // Salary max (recruiter "Plat do")
      if (f.salaryMax != null) {
        const min = job?.salary_min;
        if (min != null && min > f.salaryMax) continue;
      }
      // Photo
      if (f.hasPhoto && !this.hasPhoto(shell, profile)) continue;
      // Skills — ALL match (case-insensitive substring on either side)
      if (f.skills.length > 0) {
        const lower = skillNames.map((s) => s.toLowerCase());
        const miss = f.skills.some(
          (rs) =>
            !lower.some((s) => {
              const r = rs.trim().toLowerCase();
              return s.includes(r) || r.includes(s);
            }),
        );
        if (miss) continue;
      }
      // Soft skills — ALL match (legacy)
      if (f.softSkills.length > 0) {
        const lower = softSkillNames.map((s) => s.toLowerCase());
        const miss = f.softSkills.some(
          (rs) => !lower.some((s) => s.includes(rs.trim().toLowerCase())),
        );
        if (miss) continue;
      }
      // Languages + min level
      if (
        !this.matchLanguagesWithLevels(langRows, f.languages, f.languageLevels)
      ) {
        continue;
      }
      // Experience bucket
      if (f.experience) {
        if (!this.matchExperienceRange(yearsExperience, f.experience)) continue;
      }
      // Education search (legacy)
      if (f.educationQ && !this.matchesTextNeedle(educationBlob, f.educationQ)) continue;
      // School / field of study
      if (f.school) {
        const blob = eduRows.map((r) => `${r.school ?? ''} ${r.institution ?? ''}`).join(' ');
        if (!this.matchesTextNeedle(blob, f.school)) continue;
      }
      if (f.fieldOfStudy) {
        const blob = eduRows.map((r) => r.field ?? '').join(' ');
        if (!this.matchesTextNeedle(blob, f.fieldOfStudy)) continue;
      }
      // Highest education level
      if (
        f.educationLevel
        && !this.matchHighestEducation(eduRows, personal, f.educationLevel)
      ) {
        continue;
      }
      // Certificates
      if (f.hasCertificate && certs.length === 0) continue;
      if (f.certificate) {
        const blob = certs.map((c) => `${c.name ?? ''} ${c.description ?? ''}`).join(' ');
        if (!this.matchesTextNeedle(blob, f.certificate)) continue;
      }
      // Job title (experience position)
      if (f.jobTitle) {
        const blob = expRowsAll.map((r) => r.position ?? '').join(' ');
        if (!this.matchesTextNeedle(blob, f.jobTitle)) continue;
      }
      // Employer
      if (f.employer) {
        const blob = expRowsAll.map((r) => r.company ?? '').join(' ');
        if (!this.matchesTextNeedle(blob, f.employer)) continue;
      }
      // Currently employed
      if (f.currentlyEmployed && !currentlyEmployed) continue;
      // Driving licences (ALL required)
      if (!this.matchesDrivingLicenses(personal, f.drivingLicences)) continue;
      // Weekend / night work tristate
      if (f.weekendWork === 'yes' && job?.weekend_work !== true) continue;
      if (f.weekendWork === 'no' && job?.weekend_work === true) continue;
      if (f.nightWork === 'yes' && job?.night_work !== true) continue;
      if (f.nightWork === 'no' && job?.night_work === true) continue;
      // Activity
      if (f.lastActive && !this.matchLastActive(shell.updated_at, f.lastActive)) continue;
      if (f.lastUpdated && !this.matchLastUpdated(shell.updated_at, f.lastUpdated)) continue;
      if (f.candidateStatus && !this.matchCandidateStatus(job, f.candidateStatus)) continue;
      // CV quality
      if (f.completedCv) {
        const isComplete =
          aboutMe.length > 0
          && expRowsAll.length > 0
          && eduRows.length > 0
          && skillNames.length > 0
          && langLabels.length > 0;
        if (!isComplete) continue;
      }
      if (f.hasSummary && aboutMe.length === 0) continue;
      if (f.hasExperience && expRowsAll.length === 0) continue;
      if (f.hasEducation && eduRows.length === 0) continue;
      if (f.hasSkills && skillNames.length === 0) continue;
      if (f.hasLanguages && langLabels.length === 0) continue;
      // Contact / consent
      if (f.canReceiveOffers && job?.email_job_alerts !== true) continue;
      if (f.hasPhone && !(personal?.phone ?? '').trim()) continue;
      if (f.hasEmail && !(personal?.email ?? '').trim()) continue;
      // Personal
      if (f.name && !this.matchesTextNeedle(name, f.name)) continue;
      if (f.ageMin != null || f.ageMax != null) {
        const age = this.computeAge(personal);
        if (age == null) continue;
        if (f.ageMin != null && age < f.ageMin) continue;
        if (f.ageMax != null && age > f.ageMax) continue;
      }
      if (ENABLE_GENDER_FILTER && f.gender) {
        const g = (personal?.gender ?? '').trim().toLowerCase();
        if (g !== f.gender.toLowerCase()) continue;
      }
      // Free-text search across blob
      if (f.q) {
        const blob = [
          name,
          ...positions,
          ...skillNames,
          location ?? '',
          (job?.desired_locations ?? []).join(' '),
          experienceBlob,
          educationBlob,
          aboutMe,
          additionalSkillsInfo,
        ].join(' ');
        if (!this.matchesTextNeedle(blob, f.q)) continue;
      }

      const score = this.relevanceScore(
        f.q,
        name,
        positions,
        skillNames,
        location ?? '',
        experienceBlob,
        educationBlob,
        aboutMe,
      );
      work.push({
        shell,
        profile,
        personal,
        job,
        name,
        location,
        positions,
        skillNames,
        langLabels,
        yearsExperience,
        currentlyEmployed,
        score,
      });
    }

    // Sort
    switch (f.sort) {
      case 'last_active':
        // TODO(last-active-sort): falls back to updated_at until we add
        // `cv.last_active_at`.
        work.sort((a, b) => b.shell.updated_at.localeCompare(a.shell.updated_at));
        break;
      case 'last_updated':
        work.sort((a, b) => b.shell.updated_at.localeCompare(a.shell.updated_at));
        break;
      case 'salary_asc':
        work.sort((a, b) => {
          const sa = a.job?.salary_min ?? Number.POSITIVE_INFINITY;
          const sb = b.job?.salary_min ?? Number.POSITIVE_INFINITY;
          if (sa !== sb) return sa - sb;
          return b.shell.updated_at.localeCompare(a.shell.updated_at);
        });
        break;
      case 'experience_desc':
        work.sort((a, b) => {
          if (b.yearsExperience !== a.yearsExperience) {
            return b.yearsExperience - a.yearsExperience;
          }
          return b.shell.updated_at.localeCompare(a.shell.updated_at);
        });
        break;
      case 'best_match':
      default:
        work.sort((a, b) => {
          if (f.q) {
            if (b.score !== a.score) return b.score - a.score;
          }
          return b.shell.updated_at.localeCompare(a.shell.updated_at);
        });
        break;
    }

    const total = complex
      ? work.length
      : Math.min(work.length, await this.countVisibleShells(f));
    if (!complex && shellRows.length >= MAX_SHELL_SCAN) {
      totalIsPartial = true;
    }
    const pageSlice = work.slice(f.offset, f.offset + f.limit);
    const unlockSet = await this.loadContactUnlockSet(
      employerUserId,
      pageSlice.map((w) => w.shell.id),
    );
    const items: EmployerCvDatabaseListItemDto[] = pageSlice.map((w) => {
      const latest = this.pickLatestExperience(expByCv.get(w.shell.id) ?? []);
      const skillNamesOrdered = this.orderSkillsForList(
        (skillsByCv.get(w.shell.id) ?? [])
          .map((s) => displaySkillName(s.skill_name).trim())
          .filter(Boolean),
        f.skills,
      );
      const skillSlice = skillNamesOrdered.slice(0, TOP_SKILLS);
      const langSlice = langsByCv.get(w.shell.id) ?? [];
      const eduRowsForCv = educationRowsByCv.get(w.shell.id) ?? [];
      const contactsVisible =
        w.personal?.show_contact_details !== false || unlockSet.has(w.shell.id);
      return {
        cv_id: w.shell.id,
        candidate_display_name: this.candidateListDisplayName(w.personal, w.profile),
        avatar_url: this.listItemAvatarUrl(w.shell, w.profile),
        location: this.listLocationLine(w.personal, w.profile),
        desired_positions: w.positions,
        employment_types: w.job?.employment_types ?? [],
        start_availability: w.job?.start_availability ?? null,
        salary_min: w.job?.salary_min ?? null,
        salary_currency: w.job?.salary_currency ?? null,
        salary_period: w.job?.salary_period ?? null,
        top_skills: skillSlice,
        languages: langSlice.map((l) => ({
          language: l.language,
          level: l.level,
        })),
        latest_experience: latest
          ? {
              position: latest.position,
              company: latest.company,
              current: Boolean(latest.current),
              start_date: latest.start_date,
              end_date: latest.end_date,
            }
          : null,
        years_of_experience: w.yearsExperience,
        updated_at: w.shell.updated_at,
        education_summary: this.pickPrimaryEducation(eduRowsForCv),
        contacts_visible: contactsVisible,
        contact_email: contactsVisible
          ? (w.personal?.email?.trim() || null)
          : null,
        contact_phone: contactsVisible
          ? (w.personal?.phone?.trim() || null)
          : null,
      };
    });
    return {
      items,
      total,
      offset: f.offset,
      limit: f.limit,
      total_is_partial: totalIsPartial,
    };
  }

  async getDetail(
    employerUserId: string,
    cvId: string,
  ): Promise<CvAggregateResponseDto> {
    const agg = await this.cvService.getEmployerAggregateByCvId(employerUserId, cvId);
    if (!agg) {
      throw new NotFoundException('Životopis sa nenašiel alebo nie je dostupný');
    }
    return agg;
  }

  async openChat(
    employerUserId: string,
    cvId: string,
    body: { application_id?: string },
  ): Promise<EmployerCvDatabaseOpenChatResponseDto> {
    const agg = await this.cvService.getEmployerAggregateByCvId(employerUserId, cvId);
    if (!agg) {
      throw new NotFoundException('Životopis sa nenašiel alebo nie je dostupný');
    }
    const individualId = String(agg.cv.user_id);
    const { data: candidateProfile } = await this.client()
      .from('profiles')
      .select('public_allow_platform_contact')
      .eq('id', individualId)
      .maybeSingle();
    if (
      candidateProfile &&
      (candidateProfile as { public_allow_platform_contact?: boolean })
        .public_allow_platform_contact === false
    ) {
      throw new ForbiddenException(
        'Kandidát nepovoľuje kontakt cez platformu. Použite iný spôsob, ak ste ho získali inak.',
      );
    }
    const { data: apps, error } = await this.client()
      .from('applications')
      .select('id, status, job_id')
      .eq('individual_id', individualId)
      .eq('is_deleted', false);
    if (error) {
      throw new ForbiddenException('Nepodarilo sa načítať prihlášky');
    }
    const appRows = (apps ?? []) as { id: string; status: string; job_id: string }[];
    const jobIds = [...new Set(appRows.map((a) => a.job_id))];
    const jobById = new Map<
      string,
      { id: string; title: string | null; company_id: string; is_deleted: boolean }
    >();
    if (jobIds.length > 0) {
      const { data: jobs, error: jobErr } = await this.client()
        .from('job_offers')
        .select('id, title, company_id, is_deleted')
        .in('id', jobIds);
      if (jobErr) {
        throw new ForbiddenException('Nepodarilo sa načítať ponuky');
      }
      for (const j of (jobs ?? []) as {
        id: string;
        title: string | null;
        company_id: string;
        is_deleted: boolean;
      }[]) {
        jobById.set(j.id, j);
      }
    }
    const matching = appRows.filter((a) => {
      const j = jobById.get(a.job_id);
      return j && !j.is_deleted && String(j.company_id) === employerUserId;
    });
    if (matching.length === 0) {
      const jobId = await this.resolveActiveJobIdForOutreachChat(employerUserId);
      const { room } = await this.chatRooms.ensureRoomForCvDatabaseOutreach({
        companyId: employerUserId,
        individualId,
        jobId,
      });
      return { room_id: room.id };
    }
    if (matching.length === 1) {
      const appId = matching[0].id;
      const { room } = await this.chatRooms.ensureRoomForApplication(appId);
      return { room_id: room.id };
    }
    if (body.application_id) {
      const chosen = matching.find((a) => a.id === body.application_id);
      if (!chosen) {
        throw new ForbiddenException('Neplatná prihláška pre tento životopis');
      }
      const { room } = await this.chatRooms.ensureRoomForApplication(chosen.id);
      return { room_id: room.id };
    }
    const applications: EmployerCvDatabaseOpenChatApplicationDto[] = matching.map((a) => ({
      id: a.id,
      job_title: jobById.get(a.job_id)?.title?.trim() || null,
      status: a.status,
    }));
    return { applications };
  }

  /** Latest active published job — used as chat context for CV-database outreach (no application). */
  private async resolveActiveJobIdForOutreachChat(employerUserId: string): Promise<string> {
    const { data, error } = await this.client()
      .from('job_offers')
      .select('id')
      .eq('company_id', employerUserId)
      .eq('is_deleted', false)
      .eq('is_draft', false)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) {
      throw new BadRequestException(
        'Na kontakt cez chat potrebujete aspoň jednu aktívnu pracovnú ponuku.',
      );
    }
    return String((data as { id: string }).id);
  }
}
