import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { APP_PATHS } from '../common/app-paths';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { TypesenseService } from '../search/typesense.service';
import { EmailService } from '../email/email.service';
import { PreferenceTokenService } from '../notifications/preference-token.service';
import { ConsentEventsService } from '../consent/consent-events.service';
import { resolveNotificationChannel } from '../notifications/notification-prefs.util';
import type {
  CreateJobEmailAlertDto,
  JobAlertPreviewCriteriaDto,
  JobEmailAlertResponseDto,
  UpdateJobEmailAlertDto,
} from './job-alerts.dto';
import {
  computeCreatedAfterTs,
  computeCriteriaHash,
  filterFreshJobIds,
  hasAtLeastOneSearchCriterion,
  sanitizeCategories,
  sanitizeIntArray,
  sanitizeLanguageFilters,
  sanitizePcSkillFilters,
  sanitizeStartTypes,
  sanitizeWorkModes,
  stableCriteriaPayload,
  shouldDispatchJobAlert,
} from './job-alerts-matching.util';
import { JobAlertsMatchingService } from './job-alerts-matching.service';
import {
  resolvePublicApiOrigin,
  resolvePublicAppOrigin,
} from '../common/public-urls.util';
import { buildJobAlertDigestEmailHtml } from '../email/job-alert-digest-email.template';

const MAX_ACTIVE_ALERTS = 10;

type AlertRow = {
  id: string;
  user_id: string;
  name: string;
  keywords: string;
  location: string;
  radius_km: number | null;
  category: string | null;
  categories: string[] | null;
  employment_types: string[];
  salary_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  work_mode: string | null;
  work_modes: string[] | null;
  work_from_home: boolean;
  education_levels: number[] | null;
  benefits: number[] | null;
  suitable_for: number[] | null;
  driver_licenses: number[] | null;
  work_shift_modes: number[] | null;
  language_filters: unknown;
  pc_skill_filters: unknown;
  start_types: string[] | null;
  start_date_from: string | null;
  newsletter: boolean;
  frequency: string;
  is_active: boolean;
  criteria_hash: string;
  last_dispatch_at: string | null;
  created_at: string;
  updated_at: string;
};

type JobHydrateRow = {
  id: string;
  title: string;
  location: string | null;
  location_address: string | null;
  salary: string | null;
  compensation_type: string | null;
  compensation_amount: number | null;
  company_id: string | null;
};

function formatPayLine(j: JobHydrateRow): string {
  const t = j.compensation_type;
  const amt = j.compensation_amount;
  if (t === 'hourly' && amt != null && Number.isFinite(amt)) {
    return `${amt.toLocaleString('sk-SK')} €/hod`;
  }
  if (t === 'fixed' && amt != null && Number.isFinite(amt)) {
    return `${amt.toLocaleString('sk-SK')} €`;
  }
  const sal = (j.salary ?? '').trim();
  if (sal.length > 0) {
    return sal;
  }
  return '—';
}

function toDto(row: AlertRow): JobEmailAlertResponseDto {
  const cats = sanitizeCategories(row.categories);
  const wms = sanitizeWorkModes(row.work_modes);
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    keywords: row.keywords ?? '',
    location: row.location ?? '',
    radius_km:
      row.radius_km === undefined || row.radius_km === null
        ? null
        : Number(row.radius_km),
    category: row.category ?? null,
    categories: cats.length > 0 ? cats : [],
    employment_types: Array.isArray(row.employment_types)
      ? row.employment_types
      : [],
    salary_type: row.salary_type ?? null,
    salary_min:
      row.salary_min !== null && row.salary_min !== undefined
        ? Number(row.salary_min)
        : null,
    salary_max:
      row.salary_max !== null && row.salary_max !== undefined
        ? Number(row.salary_max)
        : null,
    work_mode: row.work_mode ?? null,
    work_modes: wms,
    work_from_home: Boolean(row.work_from_home),
    education_levels: sanitizeIntArray(row.education_levels),
    benefits: sanitizeIntArray(row.benefits),
    suitable_for: sanitizeIntArray(row.suitable_for),
    driver_licenses: sanitizeIntArray(row.driver_licenses),
    work_shift_modes: sanitizeIntArray(row.work_shift_modes),
    language_filters: sanitizeLanguageFilters(row.language_filters),
    pc_skill_filters: sanitizePcSkillFilters(row.pc_skill_filters),
    start_types: sanitizeStartTypes(row.start_types),
    start_date_from: row.start_date_from ?? null,
    newsletter: Boolean(row.newsletter),
    frequency: row.frequency,
    is_active: Boolean(row.is_active),
    criteria_hash: row.criteria_hash,
    last_dispatch_at: row.last_dispatch_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function buildFindQueryFromAlert(row: AlertRow): Record<string, string> {
  const q: Record<string, string> = {};
  const kw = (row.keywords ?? '').trim();
  if (kw) {
    q.q = kw;
  }
  const loc = (row.location ?? '').trim();
  const wholeSk =
    row.radius_km === null || row.radius_km === undefined;
  if (loc && !wholeSk) {
    q.location = loc;
  }
  const cats = sanitizeCategories(row.categories);
  if (cats.length > 1) {
    q.category = cats.join(',');
  } else if (cats.length === 1) {
    q.category = cats[0]!;
  } else if (row.category && row.category.trim() && row.category.trim() !== 'all') {
    q.category = row.category.trim();
  }
  const emp = (row.employment_types ?? []).filter(Boolean);
  if (emp.length > 0) {
    q.job_type = emp.join(',');
  }
  const wms = sanitizeWorkModes(row.work_modes);
  if (wms.length > 0) {
    q.work_mode = wms.join(',');
  } else if (row.work_mode?.trim()) {
    q.work_mode = row.work_mode.trim();
  }
  if (row.salary_min != null && Number.isFinite(Number(row.salary_min))) {
    q.salary_min = String(row.salary_min);
  }
  if (row.salary_type?.trim()) {
    q.salary_type = row.salary_type.trim();
  }
  if (row.radius_km !== null && row.radius_km !== undefined) {
    q.radius = String(row.radius_km);
  }
  return q;
}

@Injectable()
export class JobAlertsService {
  private readonly logger = new Logger(JobAlertsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly typesense: TypesenseService,
    private readonly jobAlertsMatching: JobAlertsMatchingService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
    private readonly preferenceTokens: PreferenceTokenService,
    private readonly consentEvents: ConsentEventsService,
  ) {}

  canRunDispatch(): boolean {
    if (!this.typesense.isEnabled()) {
      return false;
    }
    if (!this.email.isConfigured()) {
      return false;
    }
    return true;
  }

  async assertJobSeeker(userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('role, worker_role, is_deleted')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) {
      throw new ForbiddenException('Profil sa nenašiel.');
    }
    const row = data as {
      role?: string;
      worker_role?: boolean;
      is_deleted?: boolean;
    };
    if (row.is_deleted) {
      throw new ForbiddenException('Profil nie je dostupný.');
    }
    const role = String(row.role ?? '');
    const hasWorkerRole = Boolean(row.worker_role);
    if (role === 'company' && !hasWorkerRole) {
      throw new ForbiddenException('Táto funkcia je určená pre uchádzačov o prácu.');
    }
  }

  async countActiveAlerts(userId: string, excludeAlertId?: string): Promise<number> {
    let q = this.supabase
      .getClient()
      .from('job_email_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);
    if (excludeAlertId) {
      q = q.neq('id', excludeAlertId);
    }
    const { count, error } = await q;
    if (error) {
      return 0;
    }
    return typeof count === 'number' ? count : 0;
  }

  async listForUser(userId: string): Promise<JobEmailAlertResponseDto[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('job_email_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) {
      return [];
    }
    return (data as AlertRow[]).map(toDto);
  }

  async create(
    userId: string,
    body: CreateJobEmailAlertDto,
  ): Promise<JobEmailAlertResponseDto> {
    await this.assertJobSeeker(userId);
    if (body.frequency === 'immediate') {
      throw new BadRequestException('Frekvencia „ihneď“ už nie je podporovaná.');
    }
    if (!hasAtLeastOneSearchCriterion(body)) {
      throw new BadRequestException('Vyberte aspoň jedno kritérium okrem názvu.');
    }
    const active = await this.countActiveAlerts(userId);
    if (active >= MAX_ACTIVE_ALERTS && (body.is_active ?? true)) {
      throw new BadRequestException(
        `Môžete mať najviac ${MAX_ACTIVE_ALERTS} aktívnych upozornení.`,
      );
    }
    const employment_types = [...(body.employment_types ?? [])];
    const work_modes = sanitizeWorkModes(body.work_modes);
    let categories = sanitizeCategories(body.categories);
    if (categories.length === 0 && body.category?.trim() && body.category.trim() !== 'all') {
      categories = [body.category.trim()];
    }
    const education_levels = sanitizeIntArray(body.education_levels);
    const benefits = sanitizeIntArray(body.benefits);
    const suitable_for = sanitizeIntArray(body.suitable_for);
    const driver_licenses = sanitizeIntArray(body.driver_licenses);
    const work_shift_modes = sanitizeIntArray(body.work_shift_modes);
    const language_filters = sanitizeLanguageFilters(body.language_filters);
    const pc_skill_filters = sanitizePcSkillFilters(body.pc_skill_filters);
    const start_types = sanitizeStartTypes(body.start_types);
    const criteriaJson = stableCriteriaPayload({
      keywords: body.keywords,
      location: body.location,
      radius_km: body.radius_km ?? null,
      category: body.category ?? null,
      categories,
      employment_types,
      salary_type: body.salary_type ?? 'monthly',
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      work_mode: body.work_mode ?? null,
      work_modes,
      work_from_home: body.work_from_home ?? false,
      education_levels,
      benefits,
      suitable_for,
      driver_licenses,
      work_shift_modes,
      language_filters,
      pc_skill_filters,
      start_types,
      start_date_from: body.start_date_from ?? null,
      frequency: body.frequency,
    });
    const criteria_hash = computeCriteriaHash(criteriaJson);
    const insert = {
      user_id: userId,
      name: body.name.trim(),
      keywords: (body.keywords ?? '').trim(),
      location: (body.location ?? '').trim(),
      radius_km: body.radius_km ?? null,
      category:
        body.category && body.category.trim() && body.category.trim() !== 'all'
          ? body.category.trim()
          : null,
      categories,
      employment_types,
      salary_type: body.salary_type?.trim() || 'monthly',
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      work_mode:
        work_modes.length === 1
          ? work_modes[0]!
          : body.work_mode?.trim() || null,
      work_modes,
      work_from_home: body.work_from_home ?? false,
      education_levels,
      benefits,
      suitable_for,
      driver_licenses,
      work_shift_modes,
      language_filters,
      pc_skill_filters,
      start_types,
      start_date_from: body.start_date_from ?? null,
      newsletter: body.newsletter ?? false,
      frequency: body.frequency,
      is_active: body.is_active ?? true,
      criteria_hash,
    };
    const { data, error } = await this.supabase
      .getClient()
      .from('job_email_alerts')
      .insert(insert)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new ConflictException({
          code: 'DUPLICATE_JOB_ALERT',
          message: 'Už máte upozornenie s rovnakými kritériami.',
        });
      }
      this.logger.warn(`job_email_alerts insert: ${error.message}`);
      throw new NotFoundException(error.message ?? 'Insert failed');
    }
    if (insert.newsletter) {
      await this.consentEvents.record(
        userId,
        'job_alert_newsletter',
        true,
        'job_alert_create',
      );
    }
    return toDto(data as AlertRow);
  }

  async update(
    userId: string,
    id: string,
    body: UpdateJobEmailAlertDto,
  ): Promise<JobEmailAlertResponseDto> {
    await this.assertJobSeeker(userId);
    if (body.frequency === 'immediate') {
      throw new BadRequestException('Frekvencia „ihneď“ už nie je podporovaná.');
    }
    const { data: existing, error: loadErr } = await this.supabase
      .getClient()
      .from('job_email_alerts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (loadErr || !existing) {
      throw new NotFoundException('Upozornenie sa nenašlo.');
    }
    const cur = existing as AlertRow;
    const nextName = body.name !== undefined ? body.name.trim() : cur.name;
    const nextKeywords =
      body.keywords !== undefined ? body.keywords.trim() : cur.keywords;
    const nextLocation =
      body.location !== undefined ? body.location.trim() : cur.location;
    const nextRadius =
      body.radius_km !== undefined ? body.radius_km : cur.radius_km;
    let nextCategories =
      body.categories !== undefined
        ? sanitizeCategories(body.categories)
        : sanitizeCategories(cur.categories);
    const nextCategory =
      body.category !== undefined
        ? body.category && body.category.trim() && body.category.trim() !== 'all'
          ? body.category.trim()
          : null
        : cur.category;
    if (body.categories === undefined && body.category !== undefined) {
      if (nextCategory) {
        nextCategories = [nextCategory];
      } else if (body.category !== undefined && !nextCategory) {
        nextCategories = [];
      }
    }
    const nextEmployment =
      body.employment_types !== undefined
        ? [...body.employment_types]
        : [...(cur.employment_types ?? [])];
    const nextWorkModes =
      body.work_modes !== undefined
        ? sanitizeWorkModes(body.work_modes)
        : sanitizeWorkModes(cur.work_modes);
    const nextSalaryType =
      body.salary_type !== undefined
        ? body.salary_type?.trim() || null
        : cur.salary_type;
    const nextSalaryMin =
      body.salary_min !== undefined ? body.salary_min : cur.salary_min;
    const nextSalaryMax =
      body.salary_max !== undefined ? body.salary_max : cur.salary_max;
    const nextWorkModeSingle =
      body.work_mode !== undefined ? body.work_mode?.trim() || null : cur.work_mode;
    const nextWorkFromHome =
      body.work_from_home !== undefined
        ? Boolean(body.work_from_home)
        : Boolean(cur.work_from_home);
    const nextEducation =
      body.education_levels !== undefined
        ? sanitizeIntArray(body.education_levels)
        : sanitizeIntArray(cur.education_levels);
    const nextBenefits =
      body.benefits !== undefined
        ? sanitizeIntArray(body.benefits)
        : sanitizeIntArray(cur.benefits);
    const nextSuitableFor =
      body.suitable_for !== undefined
        ? sanitizeIntArray(body.suitable_for)
        : sanitizeIntArray(cur.suitable_for);
    const nextDriverLicenses =
      body.driver_licenses !== undefined
        ? sanitizeIntArray(body.driver_licenses)
        : sanitizeIntArray(cur.driver_licenses);
    const nextShiftModes =
      body.work_shift_modes !== undefined
        ? sanitizeIntArray(body.work_shift_modes)
        : sanitizeIntArray(cur.work_shift_modes);
    const nextLanguageFilters =
      body.language_filters !== undefined
        ? sanitizeLanguageFilters(body.language_filters)
        : sanitizeLanguageFilters(cur.language_filters);
    const nextPcSkillFilters =
      body.pc_skill_filters !== undefined
        ? sanitizePcSkillFilters(body.pc_skill_filters)
        : sanitizePcSkillFilters(cur.pc_skill_filters);
    const nextStartTypes =
      body.start_types !== undefined
        ? sanitizeStartTypes(body.start_types)
        : sanitizeStartTypes(cur.start_types);
    const nextStartDateFrom =
      body.start_date_from !== undefined
        ? body.start_date_from?.trim() || null
        : cur.start_date_from;
    const nextNewsletter =
      body.newsletter !== undefined
        ? Boolean(body.newsletter)
        : Boolean(cur.newsletter);
    const nextFrequency =
      body.frequency !== undefined ? body.frequency : cur.frequency;
    const nextActive =
      body.is_active !== undefined ? body.is_active : cur.is_active;

    const draft: Record<string, unknown> = {
      name: nextName,
      keywords: nextKeywords,
      location: nextLocation,
      radius_km: nextRadius,
      category: nextCategory,
      categories: nextCategories,
      employment_types: nextEmployment,
      salary_type: nextSalaryType ?? 'monthly',
      salary_min: nextSalaryMin,
      salary_max: nextSalaryMax,
      work_mode:
        nextWorkModes.length === 1 ? nextWorkModes[0]! : nextWorkModeSingle,
      work_modes: nextWorkModes,
      work_from_home: nextWorkFromHome,
      education_levels: nextEducation,
      benefits: nextBenefits,
      suitable_for: nextSuitableFor,
      driver_licenses: nextDriverLicenses,
      work_shift_modes: nextShiftModes,
      language_filters: nextLanguageFilters,
      pc_skill_filters: nextPcSkillFilters,
      start_types: nextStartTypes,
      start_date_from: nextStartDateFrom,
      newsletter: nextNewsletter,
      frequency: nextFrequency,
      is_active: nextActive,
    };
    if (!hasAtLeastOneSearchCriterion(draft)) {
      throw new BadRequestException('Vyberte aspoň jedno kritérium okrem názvu.');
    }
    if (nextActive) {
      const others = await this.countActiveAlerts(userId, id);
      if (others >= MAX_ACTIVE_ALERTS) {
        throw new BadRequestException(
          `Môžete mať najviac ${MAX_ACTIVE_ALERTS} aktívnych upozornení.`,
        );
      }
    }
    const criteriaJson = stableCriteriaPayload({
      keywords: nextKeywords,
      location: nextLocation,
      radius_km: nextRadius,
      category: nextCategory,
      categories: nextCategories,
      employment_types: nextEmployment,
      salary_type: nextSalaryType ?? 'monthly',
      salary_min: nextSalaryMin,
      salary_max: nextSalaryMax,
      work_mode: nextWorkModes.length === 1 ? nextWorkModes[0]! : nextWorkModeSingle,
      work_modes: nextWorkModes,
      work_from_home: nextWorkFromHome,
      education_levels: nextEducation,
      benefits: nextBenefits,
      suitable_for: nextSuitableFor,
      driver_licenses: nextDriverLicenses,
      work_shift_modes: nextShiftModes,
      language_filters: nextLanguageFilters,
      pc_skill_filters: nextPcSkillFilters,
      start_types: nextStartTypes,
      start_date_from: nextStartDateFrom,
      frequency: nextFrequency,
    });
    const criteria_hash = computeCriteriaHash(criteriaJson);
    const patch: Record<string, unknown> = {
      ...draft,
      criteria_hash,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabase
      .getClient()
      .from('job_email_alerts')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new ConflictException({
          code: 'DUPLICATE_JOB_ALERT',
          message: 'Už máte upozornenie s rovnakými kritériami.',
        });
      }
      throw new NotFoundException(error.message ?? 'Update failed');
    }
    return toDto(data as AlertRow);
  }

  async remove(userId: string, id: string): Promise<{ ok: boolean }> {
    await this.assertJobSeeker(userId);
    const { error } = await this.supabase
      .getClient()
      .from('job_email_alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      throw new NotFoundException(error.message);
    }
    return { ok: true };
  }

  async previewCriteriaCount(
    userId: string,
    body: JobAlertPreviewCriteriaDto,
  ): Promise<{ found: number }> {
    await this.assertJobSeeker(userId);
    const found = await this.jobAlertsMatching.countPublicJobsMatching({
      keywords: body.keywords,
      location: body.location,
      radius_km: body.radius_km,
      category: body.category ?? null,
      categories: body.categories,
      employment_types: body.employment_types ?? [],
      salary_type: body.salary_type ?? null,
      salary_min: body.salary_min ?? null,
      salary_max: body.salary_max ?? null,
      work_mode: body.work_mode ?? null,
      work_modes: body.work_modes,
      work_from_home: body.work_from_home ?? false,
      education_levels: body.education_levels,
      benefits: body.benefits,
      suitable_for: body.suitable_for,
      driver_licenses: body.driver_licenses,
      work_shift_modes: body.work_shift_modes,
      language_filters: body.language_filters,
      pc_skill_filters: body.pc_skill_filters,
      start_types: body.start_types,
      start_date_from: body.start_date_from ?? null,
    });
    return { found };
  }

  async dispatchAllDueAlerts(): Promise<void> {
    if (!this.canRunDispatch()) {
      return;
    }
    const batchSize = Math.min(
      Math.max(Number(this.config.get<string>('JOB_ALERT_BATCH_SIZE') ?? 50), 1),
      200,
    );
    const concurrency = Math.min(
      Math.max(Number(this.config.get<string>('JOB_ALERT_CONCURRENCY') ?? 3), 1),
      10,
    );
    const nowMs = Date.now();
    let cursorId: string | null = null;
    const alertSelect =
      'id, user_id, name, keywords, location, radius_km, category, categories, employment_types, salary_type, salary_min, salary_max, work_mode, work_modes, work_from_home, education_levels, benefits, suitable_for, driver_licenses, work_shift_modes, language_filters, pc_skill_filters, start_types, start_date_from, newsletter, frequency, is_active, criteria_hash, last_dispatch_at, created_at, updated_at';

    for (;;) {
      let query = this.supabase
        .getClient()
        .from('job_email_alerts')
        .select(alertSelect)
        .eq('is_active', true)
        .order('id', { ascending: true })
        .limit(batchSize);
      if (cursorId) {
        query = query.gt('id', cursorId);
      }
      const { data: rows, error } = await query;
      if (error || !rows?.length) {
        break;
      }
      const batch = rows as AlertRow[];
      cursorId = batch[batch.length - 1]?.id ?? null;
      const due = batch.filter((row) =>
        shouldDispatchJobAlert(row.frequency, row.last_dispatch_at, nowMs),
      );
      let index = 0;
      const workers = Array.from({ length: concurrency }, async () => {
        for (;;) {
          const i = index++;
          if (i >= due.length) {
            return;
          }
          const row = due[i];
          try {
            await this.processOneAlert(row, nowMs);
          } catch (err) {
            this.logger.warn(`Job alert ${row.id} failed: ${String(err)}`);
          }
        }
      });
      await Promise.all(workers);
      if (batch.length < batchSize) {
        break;
      }
    }
  }

  /** Test hook: run digest dispatch for a single alert row. */
  async dispatchSingleAlertForTest(
    row: AlertRow,
    runAtMs: number = Date.now(),
  ): Promise<void> {
    await this.processOneAlert(row, runAtMs);
  }

  private async processOneAlert(
    row: AlertRow,
    runAtMs: number,
  ): Promise<void> {
    const { data: profile, error: profErr } = await this.supabase
      .getClient()
      .from('profiles')
      .select('notification_preferences, is_deleted')
      .eq('id', row.user_id)
      .maybeSingle();
    if (profErr || !profile || (profile as { is_deleted?: boolean }).is_deleted) {
      return;
    }
    const prefs = (profile as { notification_preferences?: unknown })
      .notification_preferences;
    if (!resolveNotificationChannel(prefs, 'job_email_alerts', 'email')) {
      return;
    }
    const { data: authData, error: authErr } = await this.supabase
      .getClient()
      .auth.admin.getUserById(row.user_id);
    if (authErr || !authData?.user?.email) {
      return;
    }
    const u = authData.user;
    const emailTo = u.email;
    if (!emailTo?.trim()) {
      return;
    }
    if (!u.email_confirmed_at) {
      return;
    }
    const createdAfterTs = computeCreatedAfterTs(
      row.last_dispatch_at,
      row.created_at,
    );
    const createdBeforeTs = Math.floor(runAtMs / 1000);
    const matchedIds = await this.jobAlertsMatching.matchPublicJobIdsForDispatch(
      row,
      { createdAfterTs, createdBeforeTs },
    );
    if (matchedIds.length === 0) {
      return;
    }
    const { data: sentRows } = await this.supabase
      .getClient()
      .from('job_email_alert_sent_jobs')
      .select('job_id')
      .eq('alert_id', row.id);
    const sent = new Set(
      (sentRows ?? []).map((r) => String((r as { job_id: string }).job_id)),
    );
    const freshIds = filterFreshJobIds(matchedIds, sent);
    if (freshIds.length === 0) {
      return;
    }
    const jobs = await this.hydrateJobsForEmail(freshIds);
    if (jobs.length === 0) {
      return;
    }
    const appOrigin = resolvePublicAppOrigin(this.config);
    const apiOrigin = resolvePublicApiOrigin(this.config);
    const pauseToken = this.preferenceTokens.signJobAlertPause(
      row.user_id,
      row.id,
    );
    if (!pauseToken) {
      this.logger.warn(
        `Job alert ${row.id}: pause link skipped (NOTIFICATION_PREFERENCE_TOKEN_SECRET missing?)`,
      );
    }
    const pauseUrl = pauseToken
      ? `${apiOrigin}/api/public/job-alerts/pause?token=${encodeURIComponent(pauseToken)}`
      : `${appOrigin}/ponuky-na-email`;
    const unsubToken = this.preferenceTokens.signUnsubscribe(
      row.user_id,
      'job_email_alerts',
    );
    if (!unsubToken) {
      this.logger.warn(
        `Job alert ${row.id}: unsubscribe link skipped (NOTIFICATION_PREFERENCE_TOKEN_SECRET missing?)`,
      );
    }
    const unsubUrl = unsubToken
      ? `${appOrigin}/unsubscribe/${encodeURIComponent(unsubToken)}?category=job_email_alerts`
      : `${appOrigin}/nastavenia/notifikacie`;
    const findQuery = new URLSearchParams(buildFindQueryFromAlert(row)).toString();
    const listUrl = findQuery
      ? `${appOrigin}${APP_PATHS.find}?${findQuery}`
      : `${appOrigin}${APP_PATHS.find}`;
    const order = new Map(freshIds.map((id, i) => [id, i]));
    jobs.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    const digestJobs = jobs.map((j) => {
      const loc =
        [j.location, j.location_address].filter(Boolean).join(', ') || '—';
      return {
        id: j.id,
        title: j.title,
        companyLabel: j.company_label ?? '—',
        locationLine: loc,
        payLine: formatPayLine(j),
        jobUrl: `${appOrigin}/app/jobs/${j.id}`,
      };
    });
    const subject = `Jobbie: nové pracovné ponuky — ${row.name.trim()}`;
    const html = buildJobAlertDigestEmailHtml({
      alertName: row.name.trim(),
      jobs: digestJobs,
      listUrl,
      manageAlertsUrl: `${appOrigin}/ponuky-na-email`,
      pauseUrl,
      unsubscribeUrl: unsubUrl,
      appOrigin,
    });
    const ok = await this.email.sendHtmlEmail({
      to: emailTo.trim(),
      subject,
      html,
    });
    if (!ok) {
      return;
    }
    const inserts = jobs.map((j) => ({
      alert_id: row.id,
      job_id: j.id,
    }));
    const { error: insErr } = await this.supabase
      .getClient()
      .from('job_email_alert_sent_jobs')
      .insert(inserts);
    if (insErr) {
      this.logger.warn(`Sent jobs insert failed: ${insErr.message}`);
      return;
    }
    await this.touchLastDispatch(row.id);
  }

  private async touchLastDispatch(alertId: string): Promise<void> {
    await this.supabase
      .getClient()
      .from('job_email_alerts')
      .update({
        last_dispatch_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId);
  }

  private async hydrateJobsForEmail(
    ids: string[],
  ): Promise<Array<JobHydrateRow & { company_label: string }>> {
    const { data: jobRows, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .select(
        'id,title,location,location_address,salary,compensation_type,compensation_amount,company_id',
      )
      .in('id', ids)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .eq('is_draft', false);
    if (error || !jobRows?.length) {
      return [];
    }
    const companyIds = [
      ...new Set(
        (jobRows as JobHydrateRow[])
          .map((j) => j.company_id)
          .filter((c): c is string => Boolean(c)),
      ),
    ];
    const labelByCompany = new Map<string, string>();
    if (companyIds.length > 0) {
      const { data: profs } = await this.supabase
        .getClient()
        .from('profiles')
        .select('id,company_name,display_name')
        .in('id', companyIds);
      for (const p of profs ?? []) {
        const r = p as {
          id: string;
          company_name?: string | null;
          display_name?: string | null;
        };
        const name =
          (r.company_name ?? '').trim() ||
          (r.display_name ?? '').trim() ||
          'Zamestnávateľ';
        labelByCompany.set(r.id, name);
      }
    }
    return (jobRows as JobHydrateRow[]).map((j) => ({
      ...j,
      company_label: j.company_id
        ? labelByCompany.get(j.company_id) ?? 'Zamestnávateľ'
        : 'Zamestnávateľ',
    }));
  }

  async pauseAlertFromToken(token: string): Promise<void> {
    const { userId, alertId } = this.preferenceTokens.verifyJobAlertPause(token);
    const { error } = await this.supabase
      .getClient()
      .from('job_email_alerts')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('user_id', userId);
    if (error) {
      throw new NotFoundException('Upozornenie sa nenašlo.');
    }
  }
}
