import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatMessagesService } from '../chat/chat-messages.service';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatNotificationsService } from '../chat/chat-notifications.service';
import { EmailService } from '../email/email.service';
import { CvService } from '../cv/cv.service';
import { displaySkillName } from '../cv/cv-skill-name';
import { displayNameFromProfileRow } from '../profiles/profile-display.util';
import { PassThrough } from 'stream';
import { CvPdfService } from '../cv/cv-pdf.service';
import { EmployerApplicantsExcelService, type ApplicantExcelRow } from './employer-applicants-excel.service';
import { EmployerApplicantsPdfService, type InvitedListRow } from './employer-applicants-pdf.service';
import { SubscriptionLimitsService } from '../billing/subscription-limits.service';
import { APPLICANT_AUTO_REPLIES_PLUS_PRO_MESSAGE } from '../billing/plan-tier-access';
import {
  AUTO_REPLY_STATUS_TYPES,
  STATUS_SK_LABELS,
  type AutoReplyStatusType,
  type EmployerSettableStatus,
} from './applicant-status.constants';
import { renderApplicantMessageTemplate } from './applicant-template.util';
import {
  deriveJobListingStatus,
  matchesJobListingFilter,
} from './job-listing-status.util';
import { applicantListDurationSeconds } from '../observability/metrics';
import type {
  ApplicantStatusCountsDto,
  AutoReplyLogItemDto,
  EmployerApplicationDetailDto,
  EmployerApplicantRowDto,
  EmployerApplicantsBulkStatusDto,
  EmployerApplicantsListResponseDto,
  EmployerApplicantsQueryDto,
  EmployerJobHubItemDto,
  EmployerJobReplySettingsDto,
  EmployerJobReplySettingsResponseDto,
  EmployerJobsHubQueryDto,
  EmployerJobsHubResponseDto,
  EmployerMessageTemplateDto,
  EmployerPrintListResponseDto,
} from './employer-applicants.dto';


const DEFAULT_REJECTION_SUBJECT = 'Vaša reakcia na pracovnú ponuku';
const DEFAULT_INTERVIEW_SUBJECT = 'Pozvanie na pohovor';
const DEFAULT_REJECTION_TEMPLATE = `Dobrý deň {{candidateName}},


ďakujeme za Váš záujem o pracovnú ponuku {{jobTitle}}.


Po posúdení uchádzačov sme sa rozhodli pokračovať s iným kandidátom. Prajeme Vám veľa úspechov pri hľadaní práce.


S pozdravom,
{{companyName}}`;
const DEFAULT_INTERVIEW_TEMPLATE = `Dobrý deň {{candidateName}},


ďakujeme za Váš záujem o pracovnú ponuku {{jobTitle}}.


Po posúdení Vašej prihlášky by sme Vás radi pozvali na pohovor. Prosíme, kontaktujte nás, aby sme si dohodli vhodný dátum a čas.


S pozdravom,
{{companyName}}`;


const APPLICANT_CVS_ZIP_MAX = 25;

/** Max applications loaded when in-memory filter/sort is required (search, has_cv, complex sort). */
const APPLICANT_FILTER_SCAN_MAX = 500;

const EMPTY_COUNTS = (): ApplicantStatusCountsDto => ({
  pending: 0,
  reviewing: 0,
  interview_invited: 0,
  rejected: 0,
  accepted: 0,
  withdrawn: 0,
  total: 0,
});

function incrementApplicantStatusCount(
  counts: ApplicantStatusCountsDto,
  status: string,
): void {
  switch (status) {
    case 'pending':
      counts.pending += 1;
      break;
    case 'reviewing':
      counts.reviewing += 1;
      break;
    case 'interview_invited':
      counts.interview_invited += 1;
      break;
    case 'rejected':
      counts.rejected += 1;
      break;
    case 'accepted':
      counts.accepted += 1;
      break;
    case 'withdrawn':
      counts.withdrawn += 1;
      break;
    default:
      break;
  }
  counts.total += 1;
}

type ApplicationRow = {
  id: string;
  individual_id: string;
  status: string;
  created_at: string;
  message?: string | null;
};


type ProfileRow = {
  id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_e164: string | null;
  location: string | null;
  avatar_url?: string | null;
};


type CvShellRow = {
  id: string;
  user_id: string;
  visible_to_employers: boolean;
  photo_url: string | null;
};


@Injectable()
export class EmployerApplicantsService {
  private readonly logger = new Logger(EmployerApplicantsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly chatMessages: ChatMessagesService,
    private readonly chatGateway: ChatGateway,
    private readonly chatNotifications: ChatNotificationsService,
    private readonly email: EmailService,
    private readonly cv: CvService,
    private readonly pdf: EmployerApplicantsPdfService,
    private readonly excel: EmployerApplicantsExcelService,
    private readonly cvPdf: CvPdfService,
    private readonly subscriptionLimits: SubscriptionLimitsService,
  ) {}


  private client() {
    return this.supabase.getClient();
  }


  async assertJobOwnedBy(
    jobId: string,
    employerId: string,
  ): Promise<{ title: string; company_name: string | null; contact_email: string | null; contact_phone: string | null }> {
    const { data: job, error } = await this.client()
      .from('job_offers')
      .select('id, company_id, title, is_deleted, contact_email, contact_phone, show_phone_publicly')
      .eq('id', jobId)
      .single();
    if (error || !job) {
      throw new NotFoundException('Job not found');
    }
    const j = job as {
      company_id: string;
      title: string | null;
      is_deleted: boolean;
      contact_email?: string | null;
      contact_phone?: string | null;
      show_phone_publicly?: boolean;
    };
    if (j.is_deleted || j.company_id !== employerId) {
      throw new ForbiddenException('Not your job');
    }
    const { data: prof } = await this.client()
      .from('profiles')
      .select('company_name, display_name')
      .eq('id', employerId)
      .maybeSingle();
    const p = prof as { company_name?: string | null; display_name?: string | null } | null;
    const companyName = p?.company_name?.trim() || p?.display_name?.trim() || 'Firma';
    const contactEmail = (j.contact_email ?? '').trim() || null;
    const contactPhone =
      j.show_phone_publicly !== false ? (j.contact_phone ?? '').trim() || null : null;
    return {
      title: (j.title ?? '').trim() || 'Ponuka',
      company_name: companyName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    };
  }


  private async assertApplicationOwned(
    applicationId: string,
    employerId: string,
  ): Promise<{ job_id: string; individual_id: string; status: string }> {
    const { data: app, error } = await this.client()
      .from('applications')
      .select('id, job_id, individual_id, status, is_deleted')
      .eq('id', applicationId)
      .single();
    if (error || !app) throw new NotFoundException('Application not found');
    const row = app as { job_id: string; individual_id: string; status: string; is_deleted: boolean };
    if (row.is_deleted) throw new NotFoundException('Application not found');
    await this.assertJobOwnedBy(row.job_id, employerId);
    return row;
  }


  async listCompanyJobs(
    employerId: string,
    query: EmployerJobsHubQueryDto,
  ): Promise<EmployerJobsHubResponseDto> {
    const offset = Math.max(Number(query.offset) || 0, 0);
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
    const q = (query.q ?? '').trim().toLowerCase();
    const hasNewOnly = query.has_new === 'true';


    const { data: jobs, error } = await this.client()
      .from('job_offers')
      .select(
        'id, title, location, job_type, work_mode, work_modes, is_draft, is_active, expires_at, created_at, applications_count',
      )
      .eq('company_id', employerId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException('Failed to load jobs');


    let jobRows = (jobs ?? []) as Record<string, unknown>[];
    jobRows = jobRows.filter((j) =>
      matchesJobListingFilter(
        {
          is_draft: Boolean(j.is_draft),
          is_active: Boolean(j.is_active),
          expires_at: (j.expires_at as string) ?? null,
        },
        query.job_status,
      ),
    );
    if (q) {
      jobRows = jobRows.filter((j) =>
        String(j.title ?? '')
          .toLowerCase()
          .includes(q),
      );
    }


    const jobIds = jobRows.map((j) => String(j.id));
    const countsByJob = new Map<string, ApplicantStatusCountsDto>();
    const lastAppByJob = new Map<string, string>();
    for (const id of jobIds) {
      countsByJob.set(id, EMPTY_COUNTS());
    }
    if (jobIds.length > 0) {
      const { data: apps } = await this.client()
        .from('applications')
        .select('job_id, status, created_at')
        .in('job_id', jobIds)
        .eq('is_deleted', false);
      for (const a of (apps ?? []) as { job_id: string; status: string; created_at: string }[]) {
        const c = countsByJob.get(a.job_id) ?? EMPTY_COUNTS();
        incrementApplicantStatusCount(c, a.status);
        countsByJob.set(a.job_id, c);
        const prev = lastAppByJob.get(a.job_id);
        if (!prev || a.created_at > prev) lastAppByJob.set(a.job_id, a.created_at);
      }
    }


    let items: EmployerJobHubItemDto[] = jobRows.map((j) => {
      const id = String(j.id);
      const counts = countsByJob.get(id) ?? EMPTY_COUNTS();
      const workModes = j.work_modes as string[] | undefined;
      const workMode =
        (j.work_mode as string) ?? (workModes?.length ? workModes[0] : null);
      return {
        id,
        title: String(j.title ?? '').trim() || 'Ponuka',
        location: (j.location as string) ?? null,
        job_type: (j.job_type as string) ?? null,
        work_mode: workMode,
        listing_status: deriveJobListingStatus({
          is_draft: Boolean(j.is_draft),
          is_active: Boolean(j.is_active),
          expires_at: (j.expires_at as string) ?? null,
        }),
        published_at: String(j.created_at),
        expires_at: (j.expires_at as string) ?? null,
        applications_count: Number(j.applications_count) || counts.total,
        status_counts: counts,
        last_application_at: lastAppByJob.get(id) ?? null,
        has_new_applications: counts.pending > 0,
      };
    });


    if (hasNewOnly) {
      items = items.filter((i) => i.has_new_applications);
    }


    const sort = query.sort ?? 'last_application_desc';
    items.sort((a, b) => {
      switch (sort) {
        case 'applicants_desc':
          return b.status_counts.total - a.status_counts.total;
        case 'published_desc':
          return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
        case 'expires_asc': {
          const ae = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
          const be = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
          return ae - be;
        }
        default: {
          const at = a.last_application_at ? new Date(a.last_application_at).getTime() : 0;
          const bt = b.last_application_at ? new Date(b.last_application_at).getTime() : 0;
          return bt - at;
        }
      }
    });


    const total = items.length;
    const page = items.slice(offset, offset + limit);
    return { items: page, total, offset, limit };
  }


  private async loadStatusCountsForJob(jobId: string): Promise<ApplicantStatusCountsDto> {
    const { data, error } = await this.client().rpc(
      'employer_application_status_counts',
      { p_job_id: jobId },
    );
    if (error || !data || typeof data !== 'object') {
      const counts = EMPTY_COUNTS();
      const { data: rows } = await this.client()
        .from('applications')
        .select('status')
        .eq('job_id', jobId)
        .eq('is_deleted', false);
      for (const row of (rows ?? []) as { status: string }[]) {
        incrementApplicantStatusCount(counts, row.status);
      }
      return counts;
    }
    const raw = data as Record<string, number>;
    return {
      pending: Number(raw.pending) || 0,
      reviewing: Number(raw.reviewing) || 0,
      interview_invited: Number(raw.interview_invited) || 0,
      rejected: Number(raw.rejected) || 0,
      accepted: Number(raw.accepted) || 0,
      withdrawn: Number(raw.withdrawn) || 0,
      total: Number(raw.total) || 0,
    };
  }

  private usesApplicantRpc(sort: string): boolean {
    return !['experience_desc', 'salary_asc', 'name_asc'].includes(sort);
  }

  private async loadApplicantRowsViaRpc(
    jobId: string,
    employerId: string,
    query: EmployerApplicantsQueryDto,
    offset: number,
    limit: number,
  ): Promise<{ rows: ApplicationRow[]; total: number }> {
    const statusFilter = query.status ?? 'all';
    const sort = query.sort ?? 'applied_at_desc';
    const searchQ = (query.q ?? '').trim();
    const hasCvFilter = query.has_cv ?? 'any';
    const { data, error } = await this.client().rpc('employer_list_application_rows', {
      p_job_id: jobId,
      p_employer_id: employerId,
      p_status: statusFilter,
      p_sort: sort,
      p_offset: offset,
      p_limit: limit,
      p_q: searchQ || null,
      p_has_cv: hasCvFilter,
    });
    if (error || !data || typeof data !== 'object') {
      return { rows: [], total: 0 };
    }
    const payload = data as { rows?: ApplicationRow[]; total?: number };
    return {
      rows: (payload.rows ?? []) as ApplicationRow[],
      total: Number(payload.total) || 0,
    };
  }

  async listApplicants(
    jobId: string,
    employerId: string,
    query: EmployerApplicantsQueryDto,
  ): Promise<EmployerApplicantsListResponseDto> {
    const started = Date.now();
    await this.assertJobOwnedBy(jobId, employerId);
    const statusCounts = await this.loadStatusCountsForJob(jobId);
    const sort = query.sort ?? 'applied_at_desc';
    const offset = Math.max(Number(query.offset) || 0, 0);
    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
    const searchQ = (query.q ?? '').trim().toLowerCase();
    const hasCvFilter = query.has_cv ?? 'any';

    if (this.usesApplicantRpc(sort)) {
      const { rows, total } = await this.loadApplicantRowsViaRpc(
        jobId,
        employerId,
        query,
        offset,
        limit,
      );
      const items = await this.enrichApplicantRows(rows, employerId, hasCvFilter);
      applicantListDurationSeconds.observe({ source: 'rpc' }, (Date.now() - started) / 1000);
      return {
        items,
        total,
        offset,
        limit,
        status_counts: statusCounts,
      };
    }

    const { rows: scanRows } = await this.loadApplicantRowsViaRpc(
      jobId,
      employerId,
      { ...query, sort: 'applied_at_desc' },
      0,
      APPLICANT_FILTER_SCAN_MAX,
    );
    const enriched = await this.enrichApplicantRows(scanRows, employerId, hasCvFilter);
    let filtered = enriched;
    if (searchQ) {
      filtered = enriched.filter((r) => {
        const blob = [
          r.full_name,
          r.email,
          r.location,
          r.desired_position,
          r.message_preview,
          ...r.top_skills,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(searchQ);
      });
    }
    filtered = this.sortApplicantRows(filtered, sort);
    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);
    applicantListDurationSeconds.observe({ source: 'enriched_scan' }, (Date.now() - started) / 1000);

    return {
      items: page,
      total,
      offset,
      limit,
      status_counts: statusCounts,
    };
  }


  private sortApplicantRows(
    rows: EmployerApplicantRowDto[],
    sort: string,
  ): EmployerApplicantRowDto[] {
    const copy = [...rows];
    copy.sort((a, b) => {
      switch (sort) {
        case 'applied_at_asc':
          return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
        case 'experience_desc':
          return (b.experience_years ?? -1) - (a.experience_years ?? -1);
        case 'salary_asc': {
          const parseSal = (s: string | null) => {
            if (!s) return Infinity;
            const m = s.match(/(\d+)/);
            return m ? Number(m[1]) : Infinity;
          };
          return parseSal(a.salary_display) - parseSal(b.salary_display);
        }
        case 'name_asc':
          return a.full_name.localeCompare(b.full_name, 'sk');
        default:
          return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
      }
    });
    return copy;
  }


  private async enrichApplicantRows(
    rows: ApplicationRow[],
    employerId: string,
    hasCvFilter: string,
  ): Promise<EmployerApplicantRowDto[]> {
    const individualIds = [...new Set(rows.map((r) => r.individual_id))];
    const applicationIds = rows.map((r) => r.id);
    const profileById = new Map<string, ProfileRow>();
    if (individualIds.length > 0) {
      const { data: profiles } = await this.client()
        .from('profiles')
        .select('id, display_name, first_name, last_name, phone_e164, location, avatar_url')
        .in('id', individualIds);
      for (const p of profiles ?? []) {
        profileById.set((p as ProfileRow).id, p as ProfileRow);
      }
    }


    const shellByUser = new Map<string, CvShellRow>();
    const personalByCv = new Map<
      string,
      {
        email: string | null;
        phone: string | null;
        city: string | null;
        show_contact_details: boolean | null;
      }
    >();
    const skillsByCv = new Map<string, string[]>();
    const langsByCv = new Map<string, string[]>();
    const prefsByCv = new Map<
      string,
      { desired_positions: string[] | null; start_availability: string | null; salary_min: number | null; salary_currency: string | null }
    >();
    const expYearsByCv = new Map<string, number>();


    if (individualIds.length > 0) {
      const { data: shells } = await this.client()
        .from('cvs')
        .select('id, user_id, visible_to_employers, photo_url')
        .eq('is_default_for_profile', true)
        .in('user_id', individualIds);
      const shellRows = (shells ?? []) as CvShellRow[];
      const cvIds = shellRows.map((s) => s.id);
      for (const s of shellRows) shellByUser.set(s.user_id, s);


      if (cvIds.length > 0) {
        const [{ data: personal }, { data: skills }, { data: langs }, { data: prefs }, { data: exp }] =
          await Promise.all([
            this.client()
              .from('cv_personal_info')
              .select('cv_id, email, phone, address_city, show_contact_details')
              .in('cv_id', cvIds),
            this.client()
              .from('cv_skills')
              .select('cv_id, skill_name, sort_order')
              .in('cv_id', cvIds)
              .order('sort_order'),
            this.client()
              .from('cv_languages')
              .select('cv_id, language, level, sort_order')
              .in('cv_id', cvIds)
              .order('sort_order'),
            this.client()
              .from('cv_job_preferences')
              .select('cv_id, desired_positions, start_availability, salary_min, salary_currency')
              .in('cv_id', cvIds),
            this.client()
              .from('cv_experience')
              .select('cv_id, start_date, end_date, current')
              .in('cv_id', cvIds),
          ]);


        for (const row of (personal ?? []) as {
          cv_id: string;
          email: string | null;
          phone: string | null;
          address_city: string | null;
          show_contact_details: boolean | null;
        }[]) {
          personalByCv.set(row.cv_id, {
            email: row.email,
            phone: row.phone,
            city: row.address_city,
            show_contact_details: row.show_contact_details,
          });
        }
        for (const row of (skills ?? []) as { cv_id: string; skill_name: string }[]) {
          const label = displaySkillName(row.skill_name).trim();
          if (!label) continue;
          const list = skillsByCv.get(row.cv_id) ?? [];
          if (list.length < 8) list.push(label);
          skillsByCv.set(row.cv_id, list);
        }
        for (const row of (langs ?? []) as { cv_id: string; language: string; level: string | null }[]) {
          const list = langsByCv.get(row.cv_id) ?? [];
          if (list.length < 4) list.push(row.level ? `${row.language} ${row.level}` : row.language);
          langsByCv.set(row.cv_id, list);
        }
        for (const row of (prefs ?? []) as {
          cv_id: string;
          desired_positions: string[] | null;
          start_availability: string | null;
          salary_min: number | null;
          salary_currency: string | null;
        }[]) {
          prefsByCv.set(row.cv_id, row);
        }
        const monthsByCv = new Map<string, number>();
        for (const e of (exp ?? []) as {
          cv_id: string;
          start_date: string | null;
          end_date: string | null;
          current: boolean;
        }[]) {
          if (!e.start_date) continue;
          const start = new Date(e.start_date).getTime();
          const end = e.current || !e.end_date ? Date.now() : new Date(e.end_date).getTime();
          const months = Math.max(0, (end - start) / (30 * 24 * 3600 * 1000));
          monthsByCv.set(e.cv_id, (monthsByCv.get(e.cv_id) ?? 0) + months);
        }
        for (const [cvId, months] of monthsByCv) {
          expYearsByCv.set(cvId, Math.round(months / 12));
        }
      }
    }


    const roomByApp = new Map<string, string>();
    if (applicationIds.length > 0) {
      const { data: rooms } = await this.client()
        .from('chat_rooms')
        .select('id, application_id')
        .in('application_id', applicationIds);
      for (const r of rooms ?? []) {
        const row = r as { id: string; application_id: string };
        roomByApp.set(row.application_id, row.id);
      }
    }


    const noteByApp = new Map<string, { note: string }>();
    if (applicationIds.length > 0) {
      const { data: notes } = await this.client()
        .from('application_notes')
        .select('application_id, note')
        .eq('company_id', employerId)
        .in('application_id', applicationIds);
      for (const n of (notes ?? []) as { application_id: string; note: string }[]) {
        noteByApp.set(n.application_id, n);
      }
    }

    // Batch-load contact unlocks for all CVs in this page; we'll gate
    // email/phone/address fields the same way the employer CV database does:
    // visible only when (cv.show_contact_details === true) OR an unlock row
    // exists for (company_id, cv_id). Without this the applicants flow leaks
    // PII that the candidate intended to keep gated behind the paid unlock.
    const cvIdsForUnlock = Array.from(shellByUser.values())
      .filter((s) => s.visible_to_employers)
      .map((s) => s.id);
    const unlockedCvIds = new Set<string>();
    if (cvIdsForUnlock.length > 0) {
      const { data: unlocks } = await this.client()
        .from('cv_contact_unlocks')
        .select('cv_id')
        .eq('company_id', employerId)
        .in('cv_id', cvIdsForUnlock);
      for (const u of (unlocks ?? []) as { cv_id: string }[]) {
        unlockedCvIds.add(u.cv_id);
      }
    }

    const out: EmployerApplicantRowDto[] = [];
    for (const a of rows) {
      const pr = profileById.get(a.individual_id);
      const fullName = pr ? displayNameFromProfileRow(pr) || 'Uchádzač' : 'Uchádzač';
      const shell = shellByUser.get(a.individual_id);
      const hasCv = Boolean(shell?.visible_to_employers);
      if (hasCvFilter === 'yes' && !hasCv) continue;
      if (hasCvFilter === 'no' && hasCv) continue;

      const contactVisible =
        hasCv &&
        shell !== undefined &&
        (personalByCv.get(shell.id)?.show_contact_details !== false ||
          unlockedCvIds.has(shell.id));

      const personal = shell ? personalByCv.get(shell.id) : undefined;
      const email = (personal?.email ?? '').trim() || null;
      const phone =
        (personal?.phone ?? '').trim() || (pr?.phone_e164 ?? '').trim() || null;
      const city =
        (personal?.city ?? '').trim() ||
        (pr?.location ?? '').split(',')[0]?.trim() ||
        null;
      const pref = shell ? prefsByCv.get(shell.id) : undefined;
      const desired =
        pref?.desired_positions?.[0]?.trim() ||
        null;
      const salaryMin = pref?.salary_min;
      const salaryDisplay =
        salaryMin != null && salaryMin > 0
          ? `Od ${salaryMin} € brutto`
          : null;
      const noteRow = noteByApp.get(a.id);
      const msg = (a.message ?? '').trim();
      const documents: string[] = [];
      if (hasCv) documents.push('Profilové CV');


      out.push({
        application_id: a.id,
        individual_id: a.individual_id,
        status: a.status,
        applied_at: a.created_at,
        full_name: fullName,
        email: contactVisible ? email : null,
        phone: contactVisible ? phone : null,
        location: city,
        has_cv: hasCv,
        cv_id: hasCv && shell ? shell.id : null,
        uses_profile_cv: hasCv,
        chat_room_id: roomByApp.get(a.id) ?? null,
        message_preview: msg ? (msg.length > 120 ? `${msg.slice(0, 117)}...` : msg) : null,
        has_note: Boolean(noteRow?.note?.trim()),
        note_preview: noteRow?.note?.trim()
          ? noteRow.note.trim().slice(0, 80)
          : null,
        photo_url: shell?.photo_url ?? pr?.avatar_url ?? null,
        desired_position: desired,
        experience_years: shell ? expYearsByCv.get(shell.id) ?? null : null,
        availability: pref?.start_availability ?? null,
        salary_display: salaryDisplay,
        top_skills: shell ? skillsByCv.get(shell.id) ?? [] : [],
        languages: shell ? langsByCv.get(shell.id) ?? [] : [],
        documents,
      });
    }
    return out;
  }


  async getApplicationDetail(
    applicationId: string,
    employerId: string,
  ): Promise<EmployerApplicationDetailDto> {
    const app = await this.assertApplicationOwned(applicationId, employerId);
    const { data: fullApp } = await this.client()
      .from('applications')
      .select('id, job_id, individual_id, status, created_at, message')
      .eq('id', applicationId)
      .single();
    const row = fullApp as ApplicationRow & { job_id: string; message: string | null };


    const list = await this.enrichApplicantRows([row], employerId, 'any');
    const base = list[0];
    if (!base) throw new NotFoundException('Application not found');


    const { data: history } = await this.client()
      .from('application_status_history')
      .select('id, old_status, new_status, changed_at, changed_by')
      .eq('application_id', applicationId)
      .order('changed_at', { ascending: false })
      .limit(50);


    const { data: autoRows } = await this.client()
      .from('application_auto_messages')
      .select('target_status, channel, delivery_status, subject, sent_at')
      .eq('application_id', applicationId);


    const { data: noteRow } = await this.client()
      .from('application_notes')
      .select('note')
      .eq('application_id', applicationId)
      .eq('company_id', employerId)
      .maybeSingle();


    let cvPayload: Record<string, unknown> | null = null;
    if (base.has_cv && base.cv_id) {
      // Use the employer-database sanitizer so `has_disability`, `birth_date`,
      // gender, and contact fields are gated by show_contact_details +
      // cv_contact_unlocks (same rules as the paid CV database). Applicants
      // flow used to call getAggregateByUserId -> sanitizeHeaderForPublic,
      // which returned the full unredacted CV when both visibility flags
      // were on — a direct GDPR leak.
      const agg = await this.cv.getEmployerAggregateByCvId(employerId, base.cv_id);
      if (agg) cvPayload = agg as unknown as Record<string, unknown>;
    }


    return {
      application_id: applicationId,
      job_id: app.job_id,
      individual_id: row.individual_id,
      status: row.status,
      applied_at: row.created_at,
      message: row.message,
      full_name: base.full_name,
      email: base.email,
      phone: base.phone,
      location: base.location,
      has_cv: base.has_cv,
      cv_id: base.cv_id,
      chat_room_id: base.chat_room_id,
      note: (noteRow as { note?: string } | null)?.note ?? null,
      status_history: (history ?? []).map((h) => {
        const item = h as {
          id: string;
          old_status: string;
          new_status: string;
          changed_at: string;
          changed_by: string | null;
        };
        return {
          id: item.id,
          old_status: item.old_status,
          new_status: item.new_status,
          changed_at: item.changed_at,
          changed_by: item.changed_by,
        };
      }),
      auto_reply_log: (autoRows ?? []).map((r) => {
        const item = r as AutoReplyLogItemDto;
        return item;
      }),
      cv: cvPayload,
    };
  }


  async setApplicationStatus(
    applicationId: string,
    employerId: string,
    status: EmployerSettableStatus,
    options?: { send_auto_reply?: boolean; force_resend?: boolean; note?: string },
  ): Promise<{ id: string; status: string }> {
    if (options?.send_auto_reply) {
      await this.subscriptionLimits.assertPlusOrProAccess(
        employerId,
        APPLICANT_AUTO_REPLIES_PLUS_PRO_MESSAGE,
      );
    }
    const result = await this.patchStatusRpc(applicationId, employerId, status);
    if (options?.note?.trim()) {
      await this.upsertNote(applicationId, employerId, options.note.trim());
    }
    if (!result.unchanged) {
      await this.afterStatusChange(applicationId, employerId, result, options);
    }
    return { id: result.id, status: result.status };
  }


  async bulkSetApplicationStatus(
    employerId: string,
    body: EmployerApplicantsBulkStatusDto,
  ): Promise<{ updated: number; failed: string[] }> {
    const failed: string[] = [];
    let updated = 0;
    for (const id of body.application_ids) {
      try {
        await this.setApplicationStatus(id, employerId, body.status, {
          send_auto_reply: body.send_auto_reply,
          force_resend: body.force_resend,
        });
        updated += 1;
      } catch {
        failed.push(id);
      }
    }
    return { updated, failed };
  }


  private async patchStatusRpc(
    applicationId: string,
    employerId: string,
    status: EmployerSettableStatus,
  ): Promise<{ id: string; status: string; unchanged: boolean; old_status?: string }> {
    const { data, error } = await this.client().rpc('employer_set_application_status', {
      p_application_id: applicationId,
      p_new_status: status,
      p_actor_id: employerId,
    });
    if (error) {
      const msg = String(error.message ?? '');
      if (msg.includes('not_found')) throw new NotFoundException('Application not found');
      if (msg.includes('forbidden')) throw new ForbiddenException('Not your application');
      if (msg.includes('withdrawn')) {
        throw new BadRequestException('Prihláška bola stiahnutá uchádzačom');
      }
      if (msg.includes('invalid_status')) {
        throw new BadRequestException('Neplatný stav');
      }
      throw new BadRequestException(msg || 'Update failed');
    }
    const payload = data as {
      id?: string;
      status?: string;
      unchanged?: boolean;
      old_status?: string;
    };
    if (!payload?.id || !payload?.status) {
      throw new BadRequestException('Invalid RPC response');
    }
    return {
      id: payload.id,
      status: payload.status,
      unchanged: Boolean(payload.unchanged),
      old_status: payload.old_status,
    };
  }


  private async afterStatusChange(
    applicationId: string,
    employerId: string,
    result: { status: string; old_status?: string },
    options?: { send_auto_reply?: boolean; force_resend?: boolean },
  ): Promise<void> {
    const { data: appRow } = await this.client()
      .from('applications')
      .select('job_id, individual_id')
      .eq('id', applicationId)
      .single();
    const app = appRow as { job_id: string; individual_id: string } | null;
    if (!app) return;


    const { title: jobTitle } = await this.assertJobOwnedBy(app.job_id, employerId);
    await this.notifyApplicantStatus(
      app.individual_id,
      app.job_id,
      applicationId,
      result.status,
      jobTitle,
    );
    void this.audit.recordAuditEvent({
      actorUserId: employerId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'application.status_changed',
      subjectType: 'application',
      subjectId: applicationId,
      payload: { new_status: result.status, old_status: result.old_status },
    });
    if (options?.send_auto_reply) {
      await this.maybeSendAutoStatusMessage({
        applicationId,
        companyId: employerId,
        individualId: app.individual_id,
        jobId: app.job_id,
        newStatus: result.status,
        forceResend: options.force_resend,
        sentByUserId: employerId,
      });
    }
  }


  private async notifyApplicantStatus(
    individualId: string,
    jobId: string,
    applicationId: string,
    status: string,
    jobTitle: string,
  ): Promise<void> {
    const statusSk =
      STATUS_SK_LABELS[status as keyof typeof STATUS_SK_LABELS] ?? status;
    await this.notifications.createForUser({
      userId: individualId,
      type: 'application_status',
      title: `Stav prihlásenia: ${statusSk}`,
      body: jobTitle
        ? `Ponuka „${jobTitle}" — stav prihlásenia sa zmenil na: ${statusSk}.`
        : `Stav prihlásenia sa zmenil na: ${statusSk}.`,
      metadata: {
        job_id: jobId,
        application_id: applicationId,
        job_title: jobTitle || undefined,
        status,
      },
    });
  }


  private async resolveReplyContent(
    jobId: string,
    companyId: string,
    targetStatus: AutoReplyStatusType,
  ): Promise<{ enabled: boolean; subject: string; body: string }> {
    const jobSettings = await this.getJobReplySettingsRow(jobId, companyId);
    const isRejection = targetStatus === 'rejected';
    const enabled = isRejection
      ? jobSettings.rejection_auto_reply_enabled
      : jobSettings.interview_auto_reply_enabled;
    const subject = (
      isRejection ? jobSettings.rejection_subject : jobSettings.interview_subject
    ).trim();
    const template = (
      isRejection ? jobSettings.rejection_template : jobSettings.interview_template
    ).trim();
    return { enabled, subject, body: template };
  }


  private async maybeSendAutoStatusMessage(input: {
    applicationId: string;
    companyId: string;
    individualId: string;
    jobId: string;
    newStatus: string;
    forceResend?: boolean;
    sentByUserId: string;
  }): Promise<void> {
    const canAutoReply = await this.subscriptionLimits.hasPlusOrProAccess(
      input.companyId,
    );
    if (!canAutoReply) {
      return;
    }
    if (!AUTO_REPLY_STATUS_TYPES.includes(input.newStatus as AutoReplyStatusType)) {
      return;
    }
    const targetStatus = input.newStatus as AutoReplyStatusType;
    const { enabled, subject: subjectTemplate, body: bodyTemplate } =
      await this.resolveReplyContent(input.jobId, input.companyId, targetStatus);
    if (!enabled) return;


    const { data: existing } = await this.client()
      .from('application_auto_messages')
      .select('id, message_id, delivery_status')
      .eq('application_id', input.applicationId)
      .eq('target_status', targetStatus)
      .maybeSingle();
    const existingRow = existing as {
      id: string;
      message_id: string | null;
      delivery_status: string;
    } | null;
    if (
      existingRow?.message_id &&
      existingRow.delivery_status === 'sent' &&
      !input.forceResend
    ) {
      return;
    }


    if (!existingRow) {
      await this.client()
        .from('application_auto_messages')
        .upsert(
          {
            application_id: input.applicationId,
            target_status: targetStatus,
            message_id: null,
            delivery_status: 'skipped',
          },
          { onConflict: 'application_id,target_status', ignoreDuplicates: true },
        );
    }


    const vars = await this.buildTemplateVars({
      companyId: input.companyId,
      individualId: input.individualId,
      jobId: input.jobId,
    });
    const body = renderApplicantMessageTemplate(bodyTemplate, vars);
    const subject = renderApplicantMessageTemplate(subjectTemplate, vars);
    if (!body.trim()) {
      this.logger.warn(
        `auto-reply skipped: empty body app=${input.applicationId} status=${targetStatus}`,
      );
      return;
    }


    let channel: 'in_app' | 'email' = 'in_app';
    let deliveryStatus: 'sent' | 'failed' | 'skipped' = 'skipped';
    let messageId: string | null = null;
    let errorMessage: string | null = null;
    const defaultSubject =
      targetStatus === 'rejected' ? DEFAULT_REJECTION_SUBJECT : DEFAULT_INTERVIEW_SUBJECT;


    try {
      const roomId = await this.ensureChatRoomForApplication({
        applicationId: input.applicationId,
        jobId: input.jobId,
        companyId: input.companyId,
        individualId: input.individualId,
      });
      const message = await this.chatMessages.insertOutgoingMessage({
        roomId,
        senderId: input.companyId,
        content: body,
      });
      messageId = message.id;
      channel = 'in_app';
      deliveryStatus = 'sent';
      const participants = await this.chatGateway.getRoomParticipants(roomId);
      this.chatGateway.emitMessageToRoom(roomId, message, participants);
      const { data: roomRow } = await this.client()
        .from('chat_rooms')
        .select('company_id, individual_id')
        .eq('id', roomId)
        .single();
      if (roomRow) {
        const pr = roomRow as { company_id: string; individual_id: string };
        await this.chatNotifications.notifyRecipientOfNewMessage({
          room: pr,
          senderId: input.companyId,
          roomId,
          plainContent: body,
        });
      }
    } catch (err) {
      deliveryStatus = 'failed';
      errorMessage = String(err);
    }


    const candidateEmail = await this.getCandidateEmail(input.individualId);
    const wantsEmail = candidateEmail
      ? await this.notifications.wantsChannel(input.individualId, 'applications', 'email')
      : false;
    if (candidateEmail && wantsEmail) {
      const emailOk = await this.email.sendHtmlEmail({
        to: candidateEmail,
        subject: subject || defaultSubject,
        html: `<pre style="font-family:sans-serif;white-space:pre-wrap">${body}</pre>`,
      });
      if (emailOk) {
        if (deliveryStatus !== 'sent') {
          channel = 'email';
          deliveryStatus = 'sent';
        }
      } else if (deliveryStatus !== 'sent') {
        deliveryStatus = 'failed';
        errorMessage = errorMessage ? `${errorMessage};email_send_failed` : 'email_send_failed';
      }
    }


    await this.client()
      .from('application_auto_messages')
      .update({
        message_id: messageId,
        channel,
        delivery_status: deliveryStatus,
        subject,
        body,
        sent_by: input.sentByUserId,
        error_message: errorMessage,
        sent_at: new Date().toISOString(),
      })
      .eq('application_id', input.applicationId)
      .eq('target_status', targetStatus);
  }


  private async getCandidateEmail(individualId: string): Promise<string | null> {
    const { data: shell } = await this.client()
      .from('cvs')
      .select('id')
      .eq('user_id', individualId)
      .eq('is_default_for_profile', true)
      .maybeSingle();
    if (!shell) return null;
    const { data: personal } = await this.client()
      .from('cv_personal_info')
      .select('email')
      .eq('cv_id', (shell as { id: string }).id)
      .maybeSingle();
    return ((personal as { email?: string } | null)?.email ?? '').trim() || null;
  }


  private async buildTemplateVars(input: {
    companyId: string;
    individualId: string;
    jobId: string;
  }) {
    const jobMeta = await this.assertJobOwnedBy(input.jobId, input.companyId);
    const [individualProfile] = await Promise.all([
      this.client()
        .from('profiles')
        .select('display_name, first_name, last_name')
        .eq('id', input.individualId)
        .maybeSingle(),
    ]);
    const profile = individualProfile.data as {
      display_name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    } | null;
    const candidateName =
      (profile?.display_name ?? '').trim() ||
      `${(profile?.first_name ?? '').trim()} ${(profile?.last_name ?? '').trim()}`.trim() ||
      'uchádzač';
    return {
      candidateName,
      jobTitle: jobMeta.title,
      companyName: jobMeta.company_name ?? 'Firma',
      contactEmail: jobMeta.contact_email ?? '',
      contactPhone: jobMeta.contact_phone ?? '',
    };
  }


  private async ensureChatRoomForApplication(input: {
    applicationId: string;
    jobId: string;
    companyId: string;
    individualId: string;
  }): Promise<string> {
    const { data: existing } = await this.client()
      .from('chat_rooms')
      .select('id')
      .eq('application_id', input.applicationId)
      .maybeSingle();
    if (existing) return (existing as { id: string }).id;
    const { data: created, error } = await this.client()
      .from('chat_rooms')
      .insert({
        job_id: input.jobId,
        company_id: input.companyId,
        individual_id: input.individualId,
        application_id: input.applicationId,
      })
      .select('id')
      .single();
    if (error || !created) {
      throw new BadRequestException('Nepodarilo sa vytvoriť chatovú miestnosť');
    }
    return (created as { id: string }).id;
  }


  async upsertNote(
    applicationId: string,
    employerId: string,
    note: string,
  ): Promise<{ application_id: string; note: string }> {
    await this.assertApplicationOwned(applicationId, employerId);
    const trimmed = note.trim().slice(0, 4000);
    const { error } = await this.client()
      .from('application_notes')
      .upsert(
        {
          application_id: applicationId,
          company_id: employerId,
          note: trimmed,
          updated_by: employerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'application_id' },
      );
    if (error) {
      this.logger.warn(
        `application_notes upsert failed: ${error.message} (${error.code ?? 'no-code'})`,
      );
      const missingTable =
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        /application_notes/i.test(error.message ?? '');
      const hint = missingTable
        ? ' Chýba tabuľka application_notes — spustite supabase db push.'
        : '';
      throw new BadRequestException(`Uloženie poznámky zlyhalo.${hint}`);
    }
    void this.audit.recordAuditEvent({
      actorUserId: employerId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'application.note_updated',
      subjectType: 'application',
      subjectId: applicationId,
      payload: {},
    });
    return { application_id: applicationId, note: trimmed };
  }


  private isInertJobReplySettingsRow(row: Record<string, unknown>): boolean {
    return (
      !Boolean(row.rejection_auto_reply_enabled) &&
      !Boolean(row.interview_auto_reply_enabled) &&
      !String(row.rejection_template ?? '').trim() &&
      !String(row.interview_template ?? '').trim()
    );
  }


  private async getCompanyReplyDefaults(
    companyId: string,
  ): Promise<
    Pick<
      EmployerJobReplySettingsResponseDto,
      | 'company_id'
      | 'rejection_auto_reply_enabled'
      | 'rejection_subject'
      | 'rejection_template'
      | 'interview_auto_reply_enabled'
      | 'interview_subject'
      | 'interview_template'
    >
  > {
    await this.ensureDefaultTemplates(companyId);
    const { data: rejTmpl } = await this.client()
      .from('company_applicant_message_templates')
      .select('enabled, message_text')
      .eq('company_id', companyId)
      .eq('status_type', 'rejected')
      .maybeSingle();
    const { data: intTmpl } = await this.client()
      .from('company_applicant_message_templates')
      .select('enabled, message_text')
      .eq('company_id', companyId)
      .eq('status_type', 'interview_invited')
      .maybeSingle();
    return {
      company_id: companyId,
      rejection_auto_reply_enabled: Boolean(
        (rejTmpl as { enabled?: boolean } | null)?.enabled,
      ),
      rejection_subject: DEFAULT_REJECTION_SUBJECT,
      rejection_template:
        (rejTmpl as { message_text?: string } | null)?.message_text?.trim() ||
        DEFAULT_REJECTION_TEMPLATE,
      interview_auto_reply_enabled: Boolean(
        (intTmpl as { enabled?: boolean } | null)?.enabled,
      ),
      interview_subject: DEFAULT_INTERVIEW_SUBJECT,
      interview_template:
        (intTmpl as { message_text?: string } | null)?.message_text?.trim() ||
        DEFAULT_INTERVIEW_TEMPLATE,
    };
  }


  private async getJobReplySettingsRow(
    jobId: string,
    companyId: string,
  ): Promise<EmployerJobReplySettingsResponseDto> {
    const companyDefaults = await this.getCompanyReplyDefaults(companyId);
    const { data: jobRow } = await this.client()
      .from('job_applicant_reply_settings')
      .select('*')
      .eq('job_id', jobId)
      .maybeSingle();
    if (!jobRow || this.isInertJobReplySettingsRow(jobRow as Record<string, unknown>)) {
      return {
        job_id: jobId,
        ...companyDefaults,
        uses_company_defaults: true,
      };
    }
    const r = jobRow as Record<string, unknown>;
    const jobRejectionTemplate = String(r.rejection_template ?? '').trim();
    const jobInterviewTemplate = String(r.interview_template ?? '').trim();
    return {
      job_id: jobId,
      company_id: companyId,
      rejection_auto_reply_enabled: Boolean(r.rejection_auto_reply_enabled),
      rejection_subject: String(r.rejection_subject ?? DEFAULT_REJECTION_SUBJECT),
      rejection_template:
        jobRejectionTemplate || companyDefaults.rejection_template,
      interview_auto_reply_enabled: Boolean(r.interview_auto_reply_enabled),
      interview_subject: String(r.interview_subject ?? DEFAULT_INTERVIEW_SUBJECT),
      interview_template:
        jobInterviewTemplate || companyDefaults.interview_template,
      uses_company_defaults: false,
    };
  }


  private async maskReplySettingsForPlan(
    employerId: string,
    settings: EmployerJobReplySettingsResponseDto,
  ): Promise<EmployerJobReplySettingsResponseDto> {
    const available = await this.subscriptionLimits.hasPlusOrProAccess(employerId);
    if (available) {
      return { ...settings, auto_replies_available: true };
    }
    return {
      ...settings,
      rejection_auto_reply_enabled: false,
      interview_auto_reply_enabled: false,
      auto_replies_available: false,
    };
  }


  async getReplySettings(
    jobId: string,
    employerId: string,
  ): Promise<EmployerJobReplySettingsResponseDto> {
    await this.assertJobOwnedBy(jobId, employerId);
    const settings = await this.getJobReplySettingsRow(jobId, employerId);
    return this.maskReplySettingsForPlan(employerId, settings);
  }


  async saveReplySettings(
    jobId: string,
    employerId: string,
    body: EmployerJobReplySettingsDto,
  ): Promise<EmployerJobReplySettingsResponseDto> {
    await this.assertJobOwnedBy(jobId, employerId);
    await this.subscriptionLimits.assertPlusOrProAccess(
      employerId,
      APPLICANT_AUTO_REPLIES_PLUS_PRO_MESSAGE,
    );
    const row = {
      job_id: jobId,
      company_id: employerId,
      rejection_auto_reply_enabled: body.rejection_auto_reply_enabled ?? false,
      rejection_subject: (body.rejection_subject ?? DEFAULT_REJECTION_SUBJECT).slice(0, 200),
      rejection_template: (body.rejection_template ?? DEFAULT_REJECTION_TEMPLATE).slice(0, 8000),
      interview_auto_reply_enabled: body.interview_auto_reply_enabled ?? false,
      interview_subject: (body.interview_subject ?? DEFAULT_INTERVIEW_SUBJECT).slice(0, 200),
      interview_template: (body.interview_template ?? DEFAULT_INTERVIEW_TEMPLATE).slice(0, 8000),
    };
    const { error } = await this.client()
      .from('job_applicant_reply_settings')
      .upsert(row, { onConflict: 'job_id' });
    if (error) throw new BadRequestException('Uloženie nastavení zlyhalo');
    const settings = await this.getJobReplySettingsRow(jobId, employerId);
    return this.maskReplySettingsForPlan(employerId, settings);
  }


  async getPrintList(
    jobId: string,
    employerId: string,
    query: EmployerApplicantsQueryDto = {},
    applicationIds?: string[],
  ): Promise<EmployerPrintListResponseDto> {
    const meta = await this.assertJobOwnedBy(jobId, employerId);
    const listQuery: EmployerApplicantsQueryDto = {
      status: query.status ?? 'all',
      has_cv: query.has_cv ?? 'any',
      sort: query.sort ?? 'applied_at_desc',
      q: query.q,
      offset: 0,
      limit: query.limit ?? 100,
    };
    const { items } = await this.listApplicants(jobId, employerId, listQuery);
    let rows = items;
    if (applicationIds?.length) {
      const set = new Set(applicationIds);
      rows = items.filter((i) => set.has(i.application_id));
    }


    const notes = new Map<string, string>();
    if (rows.length > 0) {
      const { data: noteRows } = await this.client()
        .from('application_notes')
        .select('application_id, note')
        .eq('company_id', employerId)
        .in(
          'application_id',
          rows.map((r) => r.application_id),
        );
      for (const n of (noteRows ?? []) as { application_id: string; note: string }[]) {
        notes.set(n.application_id, n.note);
      }
    }


    return {
      job_title: meta.title,
      company_name: meta.company_name ?? 'Firma',
      generated_at: new Date().toISOString(),
      items: rows.map((r) => ({
        application_id: r.application_id,
        full_name: r.full_name,
        email: r.email,
        phone: r.phone,
        city: r.location,
        applied_at: r.applied_at,
        availability: r.availability,
        salary_display: r.salary_display,
        top_skills: r.top_skills.slice(0, 6),
        internal_note: notes.get(r.application_id) ?? null,
      })),
    };
  }


  async ensureDefaultTemplates(companyId: string): Promise<void> {
    for (const status_type of ['rejected', 'interview_invited', 'accepted'] as const) {
      const { data: row } = await this.client()
        .from('company_applicant_message_templates')
        .select('id')
        .eq('company_id', companyId)
        .eq('status_type', status_type)
        .maybeSingle();
      if (row) continue;
      const text =
        status_type === 'rejected'
          ? DEFAULT_REJECTION_TEMPLATE
          : status_type === 'interview_invited'
            ? DEFAULT_INTERVIEW_TEMPLATE
            : 'Dobrý deň {{candidateName}}, gratulujeme k prijatiu na pozíciu {{jobTitle}}. S pozdravom {{companyName}}.';
      await this.client().from('company_applicant_message_templates').insert({
        company_id: companyId,
        status_type,
        message_text: text,
        enabled: false,
      });
    }
  }


  async listMessageTemplates(companyId: string): Promise<EmployerMessageTemplateDto[]> {
    await this.ensureDefaultTemplates(companyId);
    const { data, error } = await this.client()
      .from('company_applicant_message_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('status_type');
    if (error || !data) return [];
    return (data as EmployerMessageTemplateDto[]).map((r) => ({
      id: r.id,
      company_id: r.company_id,
      status_type: r.status_type,
      message_text: r.message_text,
      enabled: r.enabled,
      updated_at: r.updated_at,
    }));
  }


  async upsertMessageTemplate(
    companyId: string,
    body: { status_type: string; message_text: string; enabled: boolean },
  ): Promise<EmployerMessageTemplateDto> {
    await this.subscriptionLimits.assertPlusOrProAccess(
      companyId,
      APPLICANT_AUTO_REPLIES_PLUS_PRO_MESSAGE,
    );
    await this.ensureDefaultTemplates(companyId);
    const { data, error } = await this.client()
      .from('company_applicant_message_templates')
      .upsert(
        {
          company_id: companyId,
          status_type: body.status_type,
          message_text: body.message_text,
          enabled: body.enabled,
        },
        { onConflict: 'company_id,status_type' },
      )
      .select('*')
      .single();
    if (error || !data) throw new BadRequestException('Uloženie šablóny zlyhalo');
    const r = data as EmployerMessageTemplateDto;
    return {
      id: r.id,
      company_id: r.company_id,
      status_type: r.status_type,
      message_text: r.message_text,
      enabled: r.enabled,
      updated_at: r.updated_at,
    };
  }


  async exportInvitedPdf(
    jobId: string,
    employerId: string,
    query: EmployerApplicantsQueryDto = {},
    applicationIds?: string[],
  ): Promise<{ buffer: Buffer; filename: string }> {
    const meta = await this.assertJobOwnedBy(jobId, employerId);
    const print = await this.getPrintList(jobId, employerId, query, applicationIds);
    const rows: InvitedListRow[] = print.items.map((a) => ({
      full_name: a.full_name,
      email: a.email,
      phone: a.phone,
      location: a.city,
      applied_at: a.applied_at,
    }));
    const buffer = await this.pdf.buildInvitedListPdf({
      jobTitle: meta.title,
      companyName: meta.company_name ?? 'Firma',
      rows,
    });
    return { buffer, filename: `pozvani-${jobId.slice(0, 8)}.pdf` };
  }

  private async loadApplicantsForExport(
    jobId: string,
    employerId: string,
    query: EmployerApplicantsQueryDto,
    applicationIds?: string[],
  ): Promise<{
    rows: EmployerApplicantRowDto[];
    notes: Map<string, string>;
  }> {
    await this.assertJobOwnedBy(jobId, employerId);
    const listQuery: EmployerApplicantsQueryDto = {
      status: query.status ?? 'all',
      has_cv: query.has_cv ?? 'any',
      sort: query.sort ?? 'applied_at_desc',
      q: query.q,
      offset: 0,
      limit: query.limit ?? 100,
    };
    const { items } = await this.listApplicants(jobId, employerId, listQuery);
    let rows = items;
    if (applicationIds?.length) {
      const set = new Set(applicationIds);
      rows = items.filter((i) => set.has(i.application_id));
    }
    const notes = new Map<string, string>();
    if (rows.length > 0) {
      const { data: noteRows } = await this.client()
        .from('application_notes')
        .select('application_id, note')
        .eq('company_id', employerId)
        .in(
          'application_id',
          rows.map((r) => r.application_id),
        );
      for (const n of (noteRows ?? []) as { application_id: string; note: string }[]) {
        notes.set(n.application_id, n.note);
      }
    }
    return { rows, notes };
  }

  async exportApplicantsExcel(
    jobId: string,
    employerId: string,
    query: EmployerApplicantsQueryDto = {},
    applicationIds?: string[],
  ): Promise<{ buffer: Buffer; filename: string }> {
    const { rows, notes } = await this.loadApplicantsForExport(
      jobId,
      employerId,
      query,
      applicationIds,
    );
    if (!rows.length) {
      throw new BadRequestException('Žiadni uchádzači na export');
    }
    const excelRows: ApplicantExcelRow[] = rows.map((r) => ({
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      location: r.location,
      applied_at: r.applied_at,
      status: r.status,
      availability: r.availability,
      salary_display: r.salary_display,
      top_skills: r.top_skills,
      internal_note: notes.get(r.application_id) ?? null,
    }));
    const buffer = await this.excel.buildWorkbook(excelRows);
    const prefix =
      (query.status ?? 'all') === 'interview_invited' ? 'pozvani' : 'uchadzaci';
    return { buffer, filename: `${prefix}-${jobId.slice(0, 8)}.xlsx` };
  }

  async exportApplicantsCvsZip(
    jobId: string,
    employerId: string,
    query: EmployerApplicantsQueryDto = {},
    applicationIds?: string[],
  ): Promise<{ buffer: Buffer; filename: string }> {
    await this.assertJobOwnedBy(jobId, employerId);
    const { rows } = await this.loadApplicantsForExport(
      jobId,
      employerId,
      query,
      applicationIds,
    );
    const withCv = rows.filter((r) => r.cv_id);
    if (!withCv.length) {
      throw new BadRequestException('Vybraní uchádzači nemajú dostupný životopis');
    }
    if (withCv.length > APPLICANT_CVS_ZIP_MAX) {
      throw new BadRequestException(
        `Naraz je možné stiahnuť najviac ${APPLICANT_CVS_ZIP_MAX} životopisov`,
      );
    }
    const usedNames = new Map<string, number>();
    const entries: { name: string; buffer: Buffer }[] = [];
    for (const row of withCv) {
      const pdfBuffer = await this.buildApplicantCvPdfBuffer(
        row.application_id,
        employerId,
      );
      if (!pdfBuffer) continue;
      const base =
        row.full_name
          .replace(/[^\w\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-')
          .slice(0, 40) || 'zivotopis';
      const count = usedNames.get(base) ?? 0;
      usedNames.set(base, count + 1);
      const suffix = count > 0 ? `-${count + 1}` : '';
      entries.push({ name: `jobbie-${base}${suffix}.pdf`, buffer: pdfBuffer });
    }
    if (!entries.length) {
      throw new BadRequestException('Žiadne životopisy sa nepodarilo pripraviť');
    }
    const buffer = await this.zipBuffers(entries);
    return { buffer, filename: `cv-uchadzaci-${jobId.slice(0, 8)}.zip` };
  }

  /**
   * Applicant CV PDF — does not consume CV database monthly PDF quota.
   */
  async exportApplicantCvPdf(
    applicationId: string,
    employerId: string,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const app = await this.assertApplicationOwned(applicationId, employerId);
    const agg = await this.loadApplicantCvForEmployer(app.individual_id, employerId);
    if (!agg) {
      throw new NotFoundException('Životopis nie je dostupný');
    }
    const buffer = await this.cvPdf.render(agg);
    return { buffer, filename: `jobbie-${this.safeCvPdfBasename(agg)}.pdf` };
  }

  private async buildApplicantCvPdfBuffer(
    applicationId: string,
    employerId: string,
  ): Promise<Buffer | null> {
    const app = await this.assertApplicationOwned(applicationId, employerId);
    const agg = await this.loadApplicantCvForEmployer(app.individual_id, employerId);
    if (!agg) return null;
    return this.cvPdf.render(agg);
  }

  /**
   * Resolves the applicant's default CV id and applies the employer-DB
   * sanitizer (gating gender / birth_date / has_disability / references
   * contact / etc. by show_contact_details + cv_contact_unlocks).
   *
   * Falls back to null when the candidate has no visible CV — callers should
   * 404 in that case.
   */
  private async loadApplicantCvForEmployer(
    individualId: string,
    employerId: string,
  ): Promise<Awaited<ReturnType<typeof this.cv.getEmployerAggregateByCvId>> | null> {
    const { data: shell } = await this.client()
      .from('cvs')
      .select('id, visible_to_employers')
      .eq('user_id', individualId)
      .eq('is_default_for_profile', true)
      .maybeSingle();
    const cvId = (shell as { id?: string; visible_to_employers?: boolean } | null)?.id;
    if (!cvId) return null;
    return this.cv.getEmployerAggregateByCvId(employerId, cvId);
  }

  private safeCvPdfBasename(agg: {
    cv: { display_title?: string | null; cv_title?: string | null };
  }): string {
    const title =
      (agg.cv.display_title ?? '')?.trim() ||
      (agg.cv.cv_title ?? '')?.trim() ||
      'zivotopis';
    return (
      title
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .slice(0, 60) || 'zivotopis'
    );
  }

  private zipBuffers(files: { name: string; buffer: Buffer }[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      // archiver@8 is ESM — load at runtime so Jest does not parse index.js at import time.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ZipArchive } = require('archiver') as typeof import('archiver');
      const archive = new ZipArchive({ zlib: { level: 9 } });
      const stream = new PassThrough();
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      archive.on('error', reject);
      archive.pipe(stream);
      for (const file of files) {
        archive.append(file.buffer, { name: file.name });
      }
      void archive.finalize();
    });
  }
}

