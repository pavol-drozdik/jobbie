import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { TypesenseService } from './typesense.service';
import { toSkSchoolTypesenseDoc } from './typesense-sk-school.util';
import { isApplicationDeadlinePassed } from '../jobs/job-deadline.util';

const SK_SCHOOLS_INDEX_PAGE = 400;

function skillTagsFromRequirements(requirements: string | null | undefined): string[] {
  if (!requirements?.trim()) {
    return [];
  }
  return [
    ...new Set(
      requirements
        .split(/[,;\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s.length > 1),
    ),
  ].slice(0, 24);
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
  return out;
}

function extractJsonbIntField(value: unknown, key: string): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: number[] = [];
  for (const row of value) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const raw = (row as Record<string, unknown>)[key];
    const n = Math.trunc(Number(raw));
    if (Number.isFinite(n) && n > 0 && !out.includes(n)) {
      out.push(n);
    }
  }
  return out;
}

@Injectable()
export class SearchIndexingService {
  private readonly logger = new Logger(SearchIndexingService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly typesense: TypesenseService,
  ) {}

  async indexJobById(jobId: string): Promise<void> {
    if (!this.typesense.isEnabled()) return;
    const { data, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .select(
        'id,title,description,location,location_address,category,job_type,employment_types,work_mode,work_modes,city,is_urgent,is_active,is_draft,is_foreign,created_at,is_deleted,requirements,compensation_type,compensation_amount,application_deadline,is_featured,company_id,applications_count,work_from_home,salary_type,salary_min,salary_max,salary_negotiable,required_experience,education_levels,benefits,suitable_for,driver_licenses,work_shift_modes,languages,pc_skills,start_type,start_date,skill_tags',
      )
      .eq('id', jobId)
      .maybeSingle();
    if (error || !data) return;
    const row = data as Record<string, unknown>;
    if (row.is_deleted === true) {
      await this.typesense.deleteJobDocument(jobId);
      return;
    }
    if (
      isApplicationDeadlinePassed(
        row.application_deadline as string | null | undefined,
      )
    ) {
      await this.typesense.deleteJobDocument(jobId);
      return;
    }
    if (row.is_active !== true || row.is_draft === true) {
      await this.typesense.deleteJobDocument(jobId);
      return;
    }
    try {
      const deadlineRaw = row.application_deadline
        ? new Date(String(row.application_deadline)).getTime() / 1000
        : 0;
      const deadlineTs =
        Number.isFinite(deadlineRaw) && deadlineRaw > 0
          ? Math.floor(deadlineRaw)
          : undefined;
      const compAmount = row.compensation_amount;
      const compNum =
        compAmount !== null && compAmount !== undefined
          ? Number(compAmount)
          : undefined;
      const doc: Record<string, unknown> = {
        id: String(row.id),
        title: String(row.title ?? ''),
        description: String(row.description ?? ''),
        location: String(row.location ?? ''),
        location_address: String(row.location_address ?? ''),
        category: row.category ? String(row.category) : undefined,
        job_type: row.job_type ? String(row.job_type) : undefined,
        employment_types: Array.isArray(row.employment_types)
          ? (row.employment_types as unknown[]).map((e) => String(e)).filter(Boolean)
          : [],
        work_mode: row.work_mode ? String(row.work_mode) : undefined,
        work_modes: Array.isArray(row.work_modes)
          ? (row.work_modes as unknown[]).map((e) => String(e)).filter(Boolean)
          : [],
        city: row.city ? String(row.city) : undefined,
        is_urgent: Boolean(row.is_urgent),
        is_active: Boolean(row.is_active),
        is_draft: Boolean(row.is_draft),
        is_foreign: Boolean(row.is_foreign),
        created_at_ts: row.created_at
          ? Math.floor(new Date(String(row.created_at)).getTime() / 1000)
          : 0,
        requirements: row.requirements
          ? String(row.requirements)
          : undefined,
        skill_tags: [
          ...new Set([
            ...skillTagsFromRequirements(
              row.requirements ? String(row.requirements) : null,
            ),
            ...(Array.isArray(row.skill_tags)
              ? (row.skill_tags as unknown[])
                  .map((t) => String(t).trim().toLowerCase())
                  .filter((t) => t.length > 1)
              : []),
          ]),
        ].slice(0, 32),
        compensation_type: row.compensation_type
          ? String(row.compensation_type)
          : undefined,
        is_featured: Boolean(row.is_featured),
        company_id: row.company_id ? String(row.company_id) : undefined,
        applications_count: Math.max(
          0,
          Math.floor(Number(row.applications_count) || 0),
        ),
      };
      if (compNum !== undefined && Number.isFinite(compNum)) {
        doc.compensation_amount = compNum;
      }
      doc.application_deadline_ts =
        deadlineTs !== undefined ? deadlineTs : 0;
      doc.work_from_home = Boolean(row.work_from_home);
      if (row.salary_type) {
        doc.salary_type = String(row.salary_type);
      }
      doc.salary_negotiable = Boolean(row.salary_negotiable);
      if (row.required_experience) {
        doc.required_experience = String(row.required_experience);
      }
      const salMin =
        row.salary_min !== null && row.salary_min !== undefined
          ? Number(row.salary_min)
          : undefined;
      if (salMin !== undefined && Number.isFinite(salMin)) {
        doc.salary_min = salMin;
      }
      const salMax =
        row.salary_max !== null && row.salary_max !== undefined
          ? Number(row.salary_max)
          : undefined;
      if (salMax !== undefined && Number.isFinite(salMax)) {
        doc.salary_max = salMax;
      }
      doc.education_levels = sanitizeIntArray(row.education_levels);
      doc.benefits = sanitizeIntArray(row.benefits);
      doc.suitable_for = sanitizeIntArray(row.suitable_for);
      doc.driver_licenses = sanitizeIntArray(row.driver_licenses);
      doc.work_shift_modes = sanitizeIntArray(row.work_shift_modes);
      doc.language_ids = extractJsonbIntField(row.languages, 'language_id');
      doc.pc_skill_ids = extractJsonbIntField(row.pc_skills, 'skill_id');
      if (row.start_type) {
        doc.start_type = String(row.start_type);
      }
      const startDateTs = row.start_date
        ? Math.floor(new Date(String(row.start_date)).getTime() / 1000)
        : undefined;
      if (startDateTs !== undefined && Number.isFinite(startDateTs)) {
        doc.start_date_ts = startDateTs;
      }
      await this.typesense.upsertJobDocument(doc);
    } catch (err) {
      this.logger.warn(`Job indexing failed for ${jobId}: ${String(err)}`);
    }
  }

  async removeJobById(jobId: string): Promise<void> {
    if (!this.typesense.isEnabled()) return;
    await this.typesense.deleteJobDocument(jobId);
  }

  async indexProfileById(profileId: string): Promise<void> {
    if (!this.typesense.isEnabled()) return;
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select(
        'id,display_name,company_name,bio,description,skills,sector,location,customer_role,worker_role,provider_role,created_at,is_deleted,public_profile_enabled,public_show_in_company_search',
      )
      .eq('id', profileId)
      .maybeSingle();
    if (error || !data) return;
    const row = data as Record<string, unknown>;
    if (row.is_deleted === true) {
      await this.typesense.deleteProfileDocument(profileId);
      return;
    }
    if (
      row.public_profile_enabled === false ||
      row.public_show_in_company_search === false
    ) {
      await this.typesense.deleteProfileDocument(profileId);
      return;
    }
    try {
      await this.typesense.upsertProfileDocument({
        id: String(row.id),
        display_name: String(row.display_name ?? ''),
        company_name: String(row.company_name ?? ''),
        bio: String(row.bio ?? ''),
        description: String(row.description ?? ''),
        skills: String(row.skills ?? ''),
        sector: String(row.sector ?? ''),
        location: String(row.location ?? ''),
        customer_role: Boolean(row.customer_role),
        worker_role: Boolean(row.worker_role),
        provider_role: Boolean(row.provider_role),
        created_at_ts: row.created_at
          ? Math.floor(new Date(String(row.created_at)).getTime() / 1000)
          : 0,
      });
    } catch (err) {
      this.logger.warn(`Profile indexing failed for ${profileId}: ${String(err)}`);
    }
  }

  async removeProfileById(profileId: string): Promise<void> {
    if (!this.typesense.isEnabled()) return;
    await this.typesense.deleteProfileDocument(profileId);
  }

  /** Full backfill of sk_education_institutions into Typesense (static catalog, ~1k rows). */
  async indexAllSkEducationInstitutions(): Promise<number> {
    if (!this.typesense.isEnabled()) {
      return 0;
    }
    let offset = 0;
    let total = 0;
    for (;;) {
      const { data, error } = await this.supabase
        .getClient()
        .from('sk_education_institutions')
        .select('id, name, level, country, municipality')
        .order('id', { ascending: true })
        .range(offset, offset + SK_SCHOOLS_INDEX_PAGE - 1);
      if (error) {
        this.logger.warn(
          `sk_education_institutions fetch failed: ${error.message}`,
        );
        throw new Error(error.message);
      }
      const rows = data ?? [];
      if (rows.length === 0) {
        break;
      }
      const docs = rows.map((row) =>
        toSkSchoolTypesenseDoc(
          row as {
            id: number;
            name: string;
            level: string;
            country: string;
            municipality: string | null;
          },
        ),
      );
      await this.typesense.importSkSchoolDocuments(docs);
      total += docs.length;
      if (rows.length < SK_SCHOOLS_INDEX_PAGE) {
        break;
      }
      offset += SK_SCHOOLS_INDEX_PAGE;
    }
    this.logger.log(`Indexed ${total} sk_education_institutions in Typesense`);
    return total;
  }

  /** Chunked Typesense backfill (queue job `typesense-reindex-chunk`). */
  async reindexJobsChunk(offset: number, limit: number): Promise<number> {
    if (!this.typesense.isEnabled()) return 0;
    const safeOffset = Math.max(0, Math.floor(offset));
    const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 200);
    const { data, error } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('id')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .range(safeOffset, safeOffset + safeLimit - 1);
    if (error || !data?.length) {
      return 0;
    }
    const ids = (data as { id: string }[]).map((row) => String(row.id));
    const concurrency = Math.min(
      Math.max(
        Number(process.env.SEARCH_REINDEX_CONCURRENCY ?? 8),
        1,
      ),
      16,
    );
    let indexed = 0;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(concurrency, ids.length) }, async () => {
      for (;;) {
        const i = cursor++;
        if (i >= ids.length) {
          return;
        }
        await this.indexJobById(ids[i]);
        indexed += 1;
      }
    });
    await Promise.all(workers);
    return indexed;
  }
}
