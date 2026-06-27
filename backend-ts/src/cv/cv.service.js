"use strict";
// NOTE: Compiled Nest output in-repo — employer visibility & cv_personal_info rules: docs/GDPR-PRIVACY.md.
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CvService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const storage_upload_service_1 = require("../storage/storage-upload.service");
const upload_policy_1 = require("../storage/upload-policy");
const cv_dto_1 = require("./cv.dto");
const cv_pdf_service_1 = require("./cv-pdf.service");
const cv_pdf_queue_service_1 = require("./cv-pdf-queue.service");
const cv_pdf_generation_service_1 = require("./cv-pdf-generation.service");
const cv_skill_name_1 = require("./cv-skill-name");
const sanitize_html_util_1 = require("../common/sanitize-html.util");
const sanitize_external_url_util_1 = require("../common/sanitize-external-url.util");
const LICENSE_SET = new Set(cv_dto_1.CV_DRIVING_LICENSE_CATEGORIES);
const LANGUAGE_LEVEL_SET = new Set(cv_dto_1.CV_LANGUAGE_LEVELS);
const HIGHEST_EDUCATION_LEVELS = new Set([
    'zakladne',
    'stredne_bez_maturity',
    'stredne_s_maturitou',
    'vyssie_odborne',
    'vysokoskolske_1_stupen',
    'vysokoskolske_2_stupen',
    'doktorandske',
]);
const SECTION_TABLES = {
    experience: 'cv_experience',
    education: 'cv_education',
    skills: 'cv_skills',
    soft_skills: 'cv_soft_skills',
    languages: 'cv_languages',
    certifications: 'cv_certifications',
    links: 'cv_links',
    volunteering: 'cv_volunteering',
    portfolio_links: 'cv_portfolio_links',
    awards: 'cv_awards',
    references: 'cv_references',
};
function filterDrivingLicenses(input) {
    if (!input?.length)
        return [];
    const selected = new Set();
    for (const c of input) {
        const t = String(c).trim().toUpperCase();
        if (LICENSE_SET.has(t))
            selected.add(t);
    }
    return cv_dto_1.CV_DRIVING_LICENSE_CATEGORIES.filter((cat) => selected.has(cat));
}
function sanitizeCvRichTextField(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value !== 'string')
        return null;
    const sanitized = (0, sanitize_html_util_1.sanitizeRichTextHtml)(value);
    return sanitized.length > 0 ? sanitized : null;
}
function cleanText(value) {
    if (typeof value !== 'string')
        return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}
function isValidHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
    }
    catch {
        return false;
    }
}
function isValidLinkedInUrl(value) {
    try {
        const url = new URL(value.startsWith('http') ? value : `https://${value}`);
        const host = url.hostname.toLowerCase().replace(/^www\./, '');
        return host === 'linkedin.com' && /^\/(in|pub)\/[^/]+\/?/.test(url.pathname);
    }
    catch {
        return false;
    }
}
function isValidImageUrl(value) {
    if (!isValidHttpUrl(value))
        return false;
    try {
        const url = new URL(value);
        return /\.(jpe?g|png|webp)$/i.test(url.pathname);
    }
    catch {
        return false;
    }
}
/** New private `cv-photos` layout: `{userId}/{cvId}/{uuid}.ext` (legacy used `.../cv/...` in profile-avatars). */
function isPrivateCvPhotoStoragePath(storagePath) {
    if (!storagePath || typeof storagePath !== 'string')
        return false;
    return !storagePath.includes('/cv/');
}
function isCvPhotoReference(value) {
    const v = cleanText(value);
    if (!v)
        return false;
    if (isValidImageUrl(v))
        return true;
    return isPrivateCvPhotoStoragePath(v) && /\.(jpe?g|png|webp)$/i.test(v);
}
function photoUrlFromUploadResult(result) {
    const publicUrl = cleanText(result?.publicUrl);
    if (publicUrl)
        return publicUrl;
    return cleanText(result?.storagePath) || null;
}
function removeStoredCvPhoto(supabase, storagePath) {
    if (!storagePath)
        return;
    const bucket = isPrivateCvPhotoStoragePath(storagePath)
        ? upload_policy_1.BUCKET_CV_PHOTOS
        : upload_policy_1.BUCKET_PROFILE_AVATARS;
    void supabase.getClient().storage.from(bucket).remove([storagePath]);
}
function isValidYear(value) {
    if (value === null || value === undefined)
        return true;
    const n = Number(value);
    return Number.isInteger(n) && n >= 1900 && n <= 2100;
}
function validationError(errors) {
    return new common_1.BadRequestException({
        message: 'CV validation failed',
        errors,
    });
}
function omitCvId(row) {
    if (!row)
        return {};
    const { cv_id: _cv, ...rest } = row;
    return rest;
}
function parseBullets(raw) {
    if (Array.isArray(raw))
        return raw.map((x) => String(x));
    if (raw && typeof raw === 'object')
        return [];
    return [];
}
function bulletsToJsonb(bullets) {
    if (!bullets?.length)
        return [];
    return bullets;
}
function cvOwnerIdsMatch(shellUserId, viewerUserId) {
    const ownerId = String(shellUserId ?? '').trim().toLowerCase();
    const viewer = String(viewerUserId ?? '').trim().toLowerCase();
    return Boolean(ownerId && viewer && ownerId === viewer);
}
function mapMergedCvRow(shell, personal, job) {
    const row = {
        ...omitCvId(job),
        ...shell,
        ...omitCvId(personal),
    };
    const licenses = row.driving_license_categories;
    const licArr = Array.isArray(licenses)
        ? filterDrivingLicenses(licenses)
        : [];
    const showAcademic = Boolean(row.show_academic_title);
    const showContact = row.show_contact_details !== false;
    const visible = Boolean(row.visible_to_employers);
    const opt = row.optional_sections;
    const optionalSections = opt && typeof opt === 'object' && !Array.isArray(opt) ? opt : {};
    return {
        id: String(row.id),
        user_id: String(row.user_id),
        is_default_for_profile: Boolean(row.is_default_for_profile),
        display_title: String(row.display_title ?? 'Životopis'),
        full_name: row.full_name ?? null,
        headline: row.headline ?? null,
        bio: row.bio ?? null,
        phone: row.phone ?? null,
        email: row.email ?? null,
        location: row.location ?? null,
        photo_url: row.photo_url ?? null,
        first_name: row.first_name ?? null,
        last_name: row.last_name ?? null,
        show_academic_title: showAcademic,
        academic_title: row.academic_title ?? null,
        title_before_name: row.title_before_name ?? null,
        title_after_name: row.title_after_name ?? null,
        birth_date: row.birth_date ?? null,
        show_birth_date: Boolean(row.show_birth_date),
        linkedin_url: row.linkedin_url ?? null,
        show_contact_details: showContact,
        address_country: row.address_country ?? null,
        address_postal_code: row.address_postal_code ?? null,
        address_district: row.address_district ?? null,
        address_city: row.address_city ?? null,
        address_street: row.address_street ?? null,
        about_me: row.about_me ?? row.bio ?? null,
        cv_title: row.cv_title ?? null,
        visible_to_employers: visible,
        driving_license_categories: licArr,
        approximate_km_driven: row.approximate_km_driven === null || row.approximate_km_driven === undefined
            ? null
            : Number(row.approximate_km_driven),
        additional_skills_info: row.additional_skills_info ?? null,
        hobbies: row.hobbies ?? null,
        highest_education_level: row.highest_education_level ?? null,
        gdpr_consent: Boolean(row.gdpr_consent),
        terms_consent: Boolean(row.terms_consent),
        marketing_consent: Boolean(row.marketing_consent),
        template_key: (row.template_key ?? 'modern'),
        wizard_step: (row.wizard_step ?? 'template'),
        wizard_section: row.wizard_section ?? null,
        optional_sections: optionalSections,
        gender: row.gender ?? null,
        birth_day: row.birth_day == null ? null : Number(row.birth_day),
        birth_month: row.birth_month == null ? null : Number(row.birth_month),
        birth_year: row.birth_year == null ? null : Number(row.birth_year),
        address_optional_collapsed: Boolean(row.address_optional_collapsed),
        photo_storage_path: row.photo_storage_path ?? null,
        photo_original_mime: row.photo_original_mime ?? null,
        desired_positions: Array.isArray(row.desired_positions) ? row.desired_positions : [],
        desired_locations: Array.isArray(row.desired_locations) ? row.desired_locations : [],
        employment_types: Array.isArray(row.employment_types) ? row.employment_types : [],
        start_availability: row.start_availability ?? null,
        salary_min: row.salary_min == null ? null : Number(row.salary_min),
        salary_currency: row.salary_currency ?? 'EUR',
        salary_period: row.salary_period ?? 'monthly',
        weekend_work: row.weekend_work == null ? null : Boolean(row.weekend_work),
        night_work: row.night_work == null ? null : Boolean(row.night_work),
        open_to_relocate_commute: row.open_to_relocate_commute == null
            ? null
            : Boolean(row.open_to_relocate_commute),
        remote_work_only: row.remote_work_only == null ? null : Boolean(row.remote_work_only),
        has_disability: Boolean(row.has_disability),
        email_job_alerts: Boolean(row.email_job_alerts),
        pdf_settings: row.pdf_settings && typeof row.pdf_settings === 'object'
            ? row.pdf_settings
            : {},
        pdf_generation_status: row.pdf_generation_status ?? 'pending',
        pdf_generated_at: row.pdf_generated_at ?? null,
        draft_saved_at: row.draft_saved_at ?? null,
        created_at: String(row.created_at),
        updated_at: String(row.updated_at),
    };
}
let CvService = class CvService {
    constructor(supabase, cvPdf, storageUpload, cvPdfQueue, cvPdfGeneration) {
        this.supabase = supabase;
        this.cvPdf = cvPdf;
        this.storageUpload = storageUpload;
        this.cvPdfQueue = cvPdfQueue;
        this.cvPdfGeneration = cvPdfGeneration;
    }
    schedulePdfRegeneration(userId, cvId) {
        const uid = String(userId ?? '').trim();
        const cid = String(cvId ?? '').trim();
        if (!uid || !cid) {
            return;
        }
        this.cvPdfQueue.scheduleRegeneration(cid, uid);
    }
    async loadHeaderForShell(shell) {
        const id = String(shell.id);
        const [personal, job] = await Promise.all([this.findPersonalRow(id), this.findJobRow(id)]);
        return mapMergedCvRow(shell, personal, job);
    }
    async findShellRow(cvId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('cvs')
            .select('*')
            .eq('id', cvId)
            .maybeSingle();
        if (error || !data)
            return null;
        return data;
    }
    async findDefaultShellRowForUser(userId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('cvs')
            .select('*')
            .eq('user_id', userId)
            .eq('is_default_for_profile', true)
            .maybeSingle();
        if (error || !data)
            return null;
        return data;
    }
    async findPersonalRow(cvId) {
        const { data } = await this.supabase
            .getClient()
            .from('cv_personal_info')
            .select('*')
            .eq('cv_id', cvId)
            .maybeSingle();
        return data ?? null;
    }
    async findJobRow(cvId) {
        const { data } = await this.supabase
            .getClient()
            .from('cv_job_preferences')
            .select('*')
            .eq('cv_id', cvId)
            .maybeSingle();
        return data ?? null;
    }
    async ensureCvChildRows(cvId) {
        const client = this.supabase.getClient();
        const personal = await this.findPersonalRow(cvId);
        if (!personal) {
            const { error } = await client.from('cv_personal_info').insert({
                cv_id: cvId,
                show_academic_title: false,
                show_birth_date: false,
                show_contact_details: true,
                address_optional_collapsed: false,
                driving_license_categories: [],
            });
            if (error)
                throw new common_1.NotFoundException(error.message);
        }
        const job = await this.findJobRow(cvId);
        if (!job) {
            const { error } = await client.from('cv_job_preferences').insert({
                cv_id: cvId,
                desired_positions: [],
                desired_locations: [],
                employment_types: [],
                salary_currency: 'EUR',
                salary_period: 'monthly',
                has_disability: false,
                email_job_alerts: false,
            });
            if (error)
                throw new common_1.NotFoundException(error.message);
        }
    }
    async assertWorkerRole(userId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('profiles')
            .select('worker_role')
            .eq('id', userId)
            .maybeSingle();
        if (error || !data) {
            throw new common_1.ForbiddenException('Profil nebol nájdený.');
        }
        const ok = Boolean(data.worker_role);
        if (!ok) {
            throw new common_1.ForbiddenException('Životopis si môžu vytvoriť len uchádzači o prácu.');
        }
    }
    async listMyCvs(userId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('cvs')
            .select('id, user_id, display_title, template_key, visible_to_employers, is_default_for_profile, draft_saved_at, updated_at, wizard_step, created_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });
        if (error || !data)
            return [];
        return data.map((r) => ({
            id: String(r.id),
            user_id: String(r.user_id),
            display_title: String(r.display_title ?? 'Životopis'),
            template_key: r.template_key ?? 'modern',
            visible_to_employers: Boolean(r.visible_to_employers),
            is_default_for_profile: Boolean(r.is_default_for_profile),
            draft_saved_at: r.draft_saved_at ?? null,
            updated_at: String(r.updated_at),
            wizard_step: r.wizard_step === 'editor' || r.wizard_step === 'final' ? r.wizard_step : 'template',
            created_at: r.created_at != null ? String(r.created_at) : String(r.updated_at),
        }));
    }
    async assertCvOwned(userId, cvId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('cvs')
            .select('id')
            .eq('id', cvId)
            .eq('user_id', userId)
            .maybeSingle();
        if (error || !data)
            throw new common_1.ForbiddenException('Toto CV nie je vaše.');
    }
    async createCv(userId, body) {
        await this.assertWorkerRole(userId);
        const client = this.supabase.getClient();
        const { data: existingDefault } = await client
            .from('cvs')
            .select('id')
            .eq('user_id', userId)
            .eq('is_default_for_profile', true)
            .maybeSingle();
        const isDefault = !existingDefault;
        const { data: profile } = await client
            .from('profiles')
            .select('first_name,last_name,bio,location,phone_e164,avatar_url')
            .eq('id', userId)
            .maybeSingle();
        const p = (profile ?? null);
        let email = null;
        try {
            const { data: authData } = await client.auth.admin.getUserById(userId);
            email = authData?.user?.email ?? null;
        }
        catch {
            email = null;
        }
        const title = body.display_title?.trim() || 'Životopis';
        const shellInsert = {
            user_id: userId,
            display_title: title,
            is_default_for_profile: isDefault,
            full_name: [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() || null,
            headline: null,
            bio: p?.bio ?? null,
            location: p?.location ?? null,
            photo_url: p?.avatar_url ?? null,
            visible_to_employers: false,
            gdpr_consent: false,
            terms_consent: false,
            marketing_consent: false,
            template_key: body.template_key ?? 'modern',
            wizard_step: 'template',
            wizard_section: null,
            optional_sections: {},
            pdf_settings: {},
        };
        const { data: shell, error: e1 } = await client.from('cvs').insert(shellInsert).select('*').single();
        if (e1 || !shell)
            throw new common_1.NotFoundException(e1?.message || 'Nepodarilo sa vytvoriť CV.');
        const cvId = String(shell.id);
        const personalRow = {
            cv_id: cvId,
            first_name: p?.first_name ?? null,
            last_name: p?.last_name ?? null,
            email,
            phone: p?.phone_e164 ?? null,
            about_me: p?.bio ?? null,
            show_academic_title: false,
            show_birth_date: false,
            show_contact_details: true,
            address_optional_collapsed: false,
            driving_license_categories: [],
        };
        const { error: e2 } = await client.from('cv_personal_info').insert(personalRow);
        if (e2)
            throw new common_1.NotFoundException(e2.message);
        const jobRow = {
            cv_id: cvId,
            desired_positions: [],
            desired_locations: [],
            employment_types: [],
            salary_currency: 'EUR',
            salary_period: 'monthly',
            has_disability: false,
            email_job_alerts: false,
        };
        const { error: e3 } = await client.from('cv_job_preferences').insert(jobRow);
        if (e3)
            throw new common_1.NotFoundException(e3.message);
        this.schedulePdfRegeneration(userId, cvId);
        return this.loadHeaderForShell(shell);
    }
    async deleteCv(userId, cvId) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const shell = await this.findShellRow(cvId);
        if (!shell)
            throw new common_1.NotFoundException('CV neexistuje.');
        const wasDefault = Boolean(shell.is_default_for_profile);
        const pdfPath = shell.pdf_storage_path ?? null;
        const { error } = await this.supabase.getClient().from('cvs').delete().eq('id', cvId);
        if (error)
            throw new common_1.NotFoundException(error.message);
        void this.cvPdfGeneration.removeStoredPdf(userId, cvId, pdfPath);
        if (wasDefault) {
            const { data: next } = await this.supabase
                .getClient()
                .from('cvs')
                .select('id')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (next && next.id) {
                await this.supabase
                    .getClient()
                    .from('cvs')
                    .update({ is_default_for_profile: true })
                    .eq('id', next.id);
            }
        }
    }
    async getOrCreateMyCv(userId) {
        await this.assertWorkerRole(userId);
        const shell = await this.findDefaultShellRowForUser(userId);
        if (shell)
            return this.loadHeaderForShell(shell);
        return this.createCv(userId, {});
    }
    async patchMyCv(userId, patch) {
        const cv = await this.getOrCreateMyCv(userId);
        return this.patchCv(userId, cv.id, patch);
    }
    async patchCv(userId, cvId, patch) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const shellRow = await this.findShellRow(cvId);
        if (!shellRow)
            throw new common_1.NotFoundException('CV neexistuje.');
        const cv = await this.loadHeaderForShell(shellRow);
        const now = new Date().toISOString();
        const shellUp = { updated_at: now, draft_saved_at: now };
        const personalUp = { updated_at: now };
        const jobUp = { updated_at: now };
        const shellKeys = new Set([
            'display_title',
            'full_name',
            'headline',
            'bio',
            'location',
            'photo_url',
            'visible_to_employers',
            'gdpr_consent',
            'terms_consent',
            'marketing_consent',
            'template_key',
            'wizard_step',
            'wizard_section',
            'optional_sections',
            'photo_storage_path',
            'photo_original_mime',
            'pdf_settings',
        ]);
        const jobKeys = new Set([
            'desired_positions',
            'desired_locations',
            'employment_types',
            'start_availability',
            'salary_min',
            'salary_currency',
            'salary_period',
            'weekend_work',
            'night_work',
            'open_to_relocate_commute',
            'remote_work_only',
            'has_disability',
            'email_job_alerts',
        ]);
        const keys = Object.keys(patch);
        for (const key of keys) {
            const value = patch[key];
            if (value === undefined)
                continue;
            if (key === 'driving_license_categories' && Array.isArray(value)) {
                personalUp[key] = filterDrivingLicenses(value);
                continue;
            }
            if (key === 'approximate_km_driven') {
                personalUp[key] = value === null ? null : Number(value);
                continue;
            }
            const ks = String(key);
            if (shellKeys.has(ks)) {
                shellUp[ks] = value;
                continue;
            }
            if (jobKeys.has(ks)) {
                jobUp[ks] = value;
                continue;
            }
            if (ks === 'about_me' || ks === 'hobbies' || ks === 'additional_skills_info') {
                personalUp[ks] = sanitizeCvRichTextField(value);
                continue;
            }
            personalUp[ks] = value;
        }
        const mergedPreview = { ...cv, ...patch };
        const generalErrors = this.validateHeaderValues(mergedPreview);
        if (generalErrors.length > 0)
            throw validationError(generalErrors);
        const client = this.supabase.getClient();
        const { error: eShell } = await client.from('cvs').update(shellUp).eq('id', cvId);
        if (eShell)
            throw new common_1.NotFoundException(eShell.message);
        const hasPersonalPatch = Object.keys(personalUp).some((k) => k !== 'updated_at');
        const hasJobPatch = Object.keys(jobUp).some((k) => k !== 'updated_at');
        if (hasPersonalPatch || hasJobPatch) {
            await this.ensureCvChildRows(cvId);
        }
        if (hasPersonalPatch) {
            const { data: personalRow, error: eP } = await client
                .from('cv_personal_info')
                .update(personalUp)
                .eq('cv_id', cvId)
                .select('*')
                .maybeSingle();
            if (eP)
                throw new common_1.NotFoundException(eP.message);
            if (!personalRow)
                throw new common_1.NotFoundException('Nepodarilo sa uložiť osobné údaje životopisu.');
            for (const key of Object.keys(personalUp)) {
                if (key === 'updated_at')
                    continue;
                const sent = personalUp[key];
                const stored = personalRow[key];
                if (key === 'about_me' || key === 'hobbies' || key === 'additional_skills_info') {
                    const sentNorm = sent == null || String(sent).trim() === '' ? null : sanitizeCvRichTextField(sent);
                    const storedNorm = stored == null || String(stored).trim() === '' ? null : String(stored);
                    if (sentNorm !== storedNorm) {
                        throw new common_1.NotFoundException('Nepodarilo sa uložiť osobné údaje životopisu.');
                    }
                    continue;
                }
                if (JSON.stringify(sent ?? null) !== JSON.stringify(stored ?? null)) {
                    throw new common_1.NotFoundException('Nepodarilo sa uložiť osobné údaje životopisu.');
                }
            }
        }
        if (hasJobPatch) {
            const { data: jobRow, error: eJ } = await client
                .from('cv_job_preferences')
                .update(jobUp)
                .eq('cv_id', cvId)
                .select('*')
                .maybeSingle();
            if (eJ)
                throw new common_1.NotFoundException(eJ.message);
            if (!jobRow)
                throw new common_1.NotFoundException('Nepodarilo sa uložiť pracovné preferencie životopisu.');
        }
        const nextShell = await this.findShellRow(cvId);
        if (!nextShell)
            throw new common_1.NotFoundException('CV neexistuje.');
        this.schedulePdfRegeneration(userId, cvId);
        return this.loadHeaderForShell(nextShell);
    }
    async getOwnerAggregateByCvId(cvId, ownerUserId) {
        const shell = await this.findShellRow(cvId);
        if (!shell || !cvOwnerIdsMatch(shell.user_id, ownerUserId))
            return null;
        const personal = await this.findPersonalRow(cvId);
        const job = await this.findJobRow(cvId);
        const cv = mapMergedCvRow(shell, personal, job);
        const [exp, edu, sk, soft, lng, cert, lnk, vol, port, aw, ref,] = await Promise.all([
            this.listSection('experience', cvId),
            this.listSection('education', cvId),
            this.listSection('skills', cvId),
            this.listSection('soft_skills', cvId),
            this.listSection('languages', cvId),
            this.listSection('certifications', cvId),
            this.listSection('links', cvId),
            this.listSection('volunteering', cvId),
            this.listSection('portfolio_links', cvId),
            this.listSection('awards', cvId),
            this.listSection('references', cvId),
        ]);
        return {
            cv,
            experience: exp.map((r) => this.mapExperienceRow(r)),
            education: edu.map((r) => this.mapEducationRow(r)),
            skills: sk.map((r) => this.mapSkillRow(r)),
            soft_skills: soft,
            languages: lng.map((r) => this.mapLanguageRow(r)),
            certifications: cert.map((r) => this.mapCertificationRow(r)),
            links: lnk,
            volunteering: vol.map((r) => this.mapVolunteeringRow(r)),
            portfolio_links: port,
            awards: aw,
            references: ref,
        };
    }
    async enrichCvHeaderPhotoViewUrl(cv) {
        const path = String(cv.photo_storage_path ?? cv.photo_url ?? '').trim();
        if (!path) {
            return cv;
        }
        if (/^https?:\/\//i.test(path)) {
            return { ...cv, photo_view_url: path };
        }
        try {
            const url = await this.storageUpload.resolveCvPhotoViewUrl(path, 3600);
            return { ...cv, photo_view_url: url };
        }
        catch {
            return cv;
        }
    }
    async getAggregateByCvId(cvId, viewerUserId) {
        const shell = await this.findShellRow(cvId);
        if (!shell)
            return null;
        const viewer = viewerUserId ?? null;
        const owner = cvOwnerIdsMatch(shell.user_id, viewer);
        const personal = await this.findPersonalRow(cvId);
        const job = await this.findJobRow(cvId);
        const cv = mapMergedCvRow(shell, personal, job);
        if (!owner) {
            if (!cv.visible_to_employers || !viewer)
                return null;
            const employerViewer = await this.isEmployerViewer(viewer);
            if (!employerViewer)
                return null;
        }
        const [exp, edu, sk, soft, lng, cert, lnk, vol, port, aw, ref,] = await Promise.all([
            this.listSection('experience', cvId),
            this.listSection('education', cvId),
            this.listSection('skills', cvId),
            this.listSection('soft_skills', cvId),
            this.listSection('languages', cvId),
            this.listSection('certifications', cvId),
            this.listSection('links', cvId),
            this.listSection('volunteering', cvId),
            this.listSection('portfolio_links', cvId),
            this.listSection('awards', cvId),
            this.listSection('references', cvId),
        ]);
        const cvOut = owner ? await this.enrichCvHeaderPhotoViewUrl(cv) : this.sanitizeHeaderForPublic(cv);
        return {
            cv: cvOut,
            experience: exp.map((r) => this.mapExperienceRow(r)),
            education: edu.map((r) => this.mapEducationRow(r)),
            skills: sk.map((r) => this.mapSkillRow(r)),
            soft_skills: soft,
            languages: lng.map((r) => this.mapLanguageRow(r)),
            certifications: cert.map((r) => this.mapCertificationRow(r)),
            links: lnk,
            volunteering: vol.map((r) => this.mapVolunteeringRow(r)),
            portfolio_links: port,
            awards: aw,
            references: ref,
        };
    }
    async getAggregateByUserId(userId, viewerUserId) {
        const shell = await this.findDefaultShellRowForUser(userId);
        if (!shell)
            return null;
        return this.getAggregateByCvId(String(shell.id), viewerUserId);
    }
    async isCvEligibleForEmployerDatabase(cvId) {
        const shell = await this.findShellRow(cvId);
        if (!shell || !Boolean(shell.visible_to_employers))
            return false;
        const userId = String(shell.user_id);
        const { data: prof } = await this.supabase
            .getClient()
            .from('profiles')
            .select('role,is_deleted,public_show_in_company_search')
            .eq('id', userId)
            .maybeSingle();
        const pr = prof;
        if (!pr || pr.is_deleted || pr.role !== 'individual')
            return false;
        if (pr.public_show_in_company_search === false)
            return false;
        // Match employer CV database list gates only (no minimum positions/skills/experience).
        return true;
    }
    async hasContactUnlock(companyId, cvId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('cv_contact_unlocks')
            .select('cv_id')
            .eq('company_id', companyId)
            .eq('cv_id', cvId)
            .maybeSingle();
        if (error)
            return false;
        return Boolean(data);
    }
    sanitizeHeaderForEmployerDatabaseView(cv, hasUnlock) {
        const mayShowContact = cv.show_contact_details === true || hasUnlock === true;
        const base = this.sanitizeHeaderForPublic({
            ...cv,
            show_contact_details: mayShowContact,
            show_birth_date: false,
        });
        const out = {
            ...base,
            gender: null,
            birth_day: null,
            birth_month: null,
            birth_year: null,
            birth_date: null,
            gdpr_consent: undefined,
            terms_consent: undefined,
            marketing_consent: undefined,
            phone: mayShowContact ? base.phone : null,
            email: mayShowContact ? base.email : null,
            linkedin_url: mayShowContact ? base.linkedin_url : null,
            show_contact_details: mayShowContact,
            contact_unlocked: hasUnlock === true,
            show_birth_date: false,
        };
        delete out.has_disability;
        return out;
    }
    sanitizeReferencesForEmployer(refs, mayShowContact) {
        if (!Array.isArray(refs))
            return refs;
        if (mayShowContact)
            return refs;
        return refs.map((r) => ({
            ...r,
            email: null,
            phone: null,
        }));
    }
    sanitizeAggregateForEmployer(agg, hasUnlock) {
        const mayShowContact = agg.cv.show_contact_details === true || hasUnlock === true;
        return {
            ...agg,
            cv: this.sanitizeHeaderForEmployerDatabaseView(agg.cv, hasUnlock),
            references: this.sanitizeReferencesForEmployer(agg.references, mayShowContact),
        };
    }
    async getEmployerAggregateByCvId(employerUserId, cvId) {
        if (!(await this.isEmployerViewer(employerUserId)))
            return null;
        if (!(await this.isCvEligibleForEmployerDatabase(cvId)))
            return null;
        const agg = await this.getAggregateByCvId(cvId, employerUserId);
        if (!agg)
            return null;
        const hasUnlock = await this.hasContactUnlock(employerUserId, cvId);
        return this.sanitizeAggregateForEmployer(agg, hasUnlock);
    }
    mapExperienceRow(r) {
        const rawBullets = r.bullets;
        const bullets = parseBullets(rawBullets);
        const legacy = r.achievements ?? null;
        const outBullets = bullets.length > 0 ? bullets : legacy ? legacy.split('\n').map((s) => s.trim()).filter(Boolean) : [];
        return {
            ...r,
            entry_type: 'employment',
            country: r.country ?? null,
            bullets: outBullets,
            achievements: outBullets.length ? outBullets.join('\n') : legacy,
        };
    }
    mapEducationRow(r) {
        const k = r.education_kind;
        const education_kind = k === 'secondary'
            ? 'secondary'
            : k === 'course_certificate'
                ? 'course_certificate'
                : 'university';
        const rawBullets = r.bullets;
        const bullets = parseBullets(rawBullets);
        return {
            ...r,
            education_kind,
            city: r.city ?? null,
            country: r.country ?? null,
            institution: r.institution ?? null,
            faculty: r.faculty ?? null,
            study_level: r.study_level ?? null,
            start_year: r.start_year ?? null,
            end_year: r.end_year ?? null,
            has_graduation: Boolean(r.has_graduation),
            currently_studying: Boolean(r.currently_studying),
            description: r.description ?? null,
            bullets,
            certificate_name: r.certificate_name ?? null,
            certificate_url: r.certificate_url ?? null,
            certificate_file_url: r.certificate_file_url ?? null,
            issued_year: r.issued_year == null
                ? null
                : Number(r.issued_year),
        };
    }
    mapLanguageRow(r) {
        const level = r.level && LANGUAGE_LEVEL_SET.has(r.level) ? r.level : null;
        return { ...r, level };
    }
    mapCertificationRow(r) {
        return {
            ...r,
            description: r.description ?? null,
            certificate_url: r.certificate_url ?? null,
            certificate_file_url: r.certificate_file_url ?? null,
        };
    }
    mapVolunteeringRow(r) {
        return {
            ...r,
            description: r.description ?? null,
            bullets: Array.isArray(r.bullets) ? r.bullets : [],
        };
    }
    sanitizeHeaderForPublic(cv) {
        if (cv.show_contact_details && cv.show_birth_date) {
            return cv;
        }
        return {
            ...cv,
            birth_date: cv.show_birth_date ? cv.birth_date : null,
            address_country: cv.show_contact_details ? cv.address_country : null,
            address_postal_code: cv.show_contact_details ? cv.address_postal_code : null,
            address_district: cv.show_contact_details ? cv.address_district : null,
            address_city: cv.show_contact_details ? cv.address_city : null,
            address_street: cv.show_contact_details ? cv.address_street : null,
        };
    }
    async isEmployerViewer(userId) {
        const { data, error } = await this.supabase
            .getClient()
            .from('profiles')
            .select('role,customer_role,provider_role')
            .eq('id', userId)
            .maybeSingle();
        if (error || !data)
            return false;
        const row = data;
        return row.role === 'company' || Boolean(row.customer_role || row.provider_role);
    }
    validateHeaderValues(header) {
        const errors = [];
        const linkedinRaw = cleanText(header.linkedin_url);
        const linkedin = linkedinRaw
            ? sanitize_external_url_util_1.sanitizeExternalUrl(linkedinRaw)
            : null;
        if (linkedinRaw && (!linkedin || !isValidLinkedInUrl(linkedin))) {
            errors.push({ field: 'linkedin_url', message: 'Zadajte platný LinkedIn profil.' });
        }
        const photoUrl = cleanText(header.photo_url);
        if (photoUrl && !isCvPhotoReference(photoUrl)) {
            errors.push({ field: 'photo_url', message: 'Fotografia musí byť JPG, PNG alebo WEBP.' });
        }
        const highest = cleanText(header.highest_education_level);
        if (highest && !HIGHEST_EDUCATION_LEVELS.has(highest)) {
            errors.push({ field: 'highest_education_level', message: 'Vyberte platné vzdelanie.' });
        }
        const km = header.approximate_km_driven;
        if (km !== null && km !== undefined) {
            const n = Number(km);
            if (!Number.isInteger(n) || n < 0) {
                errors.push({ field: 'approximate_km_driven', message: 'Kilometre musia byť nezáporné celé číslo.' });
            }
        }
        return errors;
    }
    validateEducationBody(body) {
        const errors = [];
        if (!isValidYear(body.start_year)) {
            errors.push({ field: 'start_year', message: 'Rok začiatku nie je platný.' });
        }
        if (!isValidYear(body.end_year)) {
            errors.push({ field: 'end_year', message: 'Rok ukončenia nie je platný.' });
        }
        return errors;
    }
    async addExperience(userId, cvId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('experience', cvId);
        const bullets = bulletsToJsonb(body.bullets ?? (body.achievements ? body.achievements.split('\n').filter(Boolean) : []));
        const row = await this.insertChildRow('experience', {
            cv_id: cvId,
            sort_order: sortOrder,
            entry_type: 'employment',
            company: body.company ?? '',
            position: body.position ?? '',
            city: body.city ?? null,
            country: body.country ?? null,
            start_date: body.start_date ?? null,
            end_date: body.current ? null : body.end_date ?? null,
            current: Boolean(body.current),
            description: sanitizeCvRichTextField(body.description),
            achievements: body.achievements ?? null,
            bullets,
        });
        return this.mapExperienceRow(row);
    }
    async updateExperience(userId, cvId, rowId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const bullets = bulletsToJsonb(body.bullets ?? (body.achievements ? body.achievements.split('\n').filter(Boolean) : []));
        const row = await this.updateChildRow(userId, 'experience', rowId, {
            entry_type: 'employment',
            company: body.company ?? '',
            position: body.position ?? '',
            city: body.city ?? null,
            country: body.country ?? null,
            start_date: body.start_date ?? null,
            end_date: body.current ? null : body.end_date ?? null,
            current: Boolean(body.current),
            description: sanitizeCvRichTextField(body.description),
            achievements: body.achievements ?? null,
            bullets,
        });
        return this.mapExperienceRow(row);
    }
    async addEducation(userId, cvId, body) {
        const errors = this.validateEducationBody(body);
        if (errors.length > 0)
            throw validationError(errors);
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('education', cvId);
        const k = body.education_kind ?? 'university';
        const education_kind = k === 'secondary' ? 'secondary' : k === 'course_certificate' ? 'course_certificate' : 'university';
        const bullets = bulletsToJsonb(body.bullets ?? []);
        const row = await this.insertChildRow('education', {
            cv_id: cvId,
            sort_order: sortOrder,
            education_kind,
            school: body.school ?? '',
            degree: body.degree ?? null,
            field: body.field ?? null,
            start_date: body.start_date ?? null,
            end_date: body.end_date ?? null,
            city: body.city ?? null,
            country: body.country ?? null,
            institution: body.institution ?? null,
            faculty: education_kind === 'university' ? body.faculty ?? null : null,
            study_level: education_kind === 'university' ? body.study_level ?? null : null,
            start_year: body.start_year ?? null,
            end_year: body.currently_studying ? null : body.end_year ?? null,
            has_graduation: Boolean(body.has_graduation),
            currently_studying: Boolean(body.currently_studying),
            description: sanitizeCvRichTextField(body.description),
            bullets,
            certificate_name: body.certificate_name ?? null,
            certificate_url: body.certificate_url ?? null,
            certificate_file_url: body.certificate_file_url ?? null,
            issued_year: body.issued_year ?? null,
        });
        return this.mapEducationRow(row);
    }
    async updateEducation(userId, cvId, rowId, body) {
        const errors = this.validateEducationBody(body);
        if (errors.length > 0)
            throw validationError(errors);
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const k = body.education_kind ?? 'university';
        const education_kind = k === 'secondary' ? 'secondary' : k === 'course_certificate' ? 'course_certificate' : 'university';
        const bullets = bulletsToJsonb(body.bullets ?? []);
        const row = await this.updateChildRow(userId, 'education', rowId, {
            education_kind,
            school: body.school ?? '',
            degree: body.degree ?? null,
            field: body.field ?? null,
            start_date: body.start_date ?? null,
            end_date: body.end_date ?? null,
            city: body.city ?? null,
            country: body.country ?? null,
            institution: body.institution ?? null,
            faculty: education_kind === 'university' ? body.faculty ?? null : null,
            study_level: education_kind === 'university' ? body.study_level ?? null : null,
            start_year: body.start_year ?? null,
            end_year: body.currently_studying ? null : body.end_year ?? null,
            has_graduation: Boolean(body.has_graduation),
            currently_studying: Boolean(body.currently_studying),
            description: sanitizeCvRichTextField(body.description),
            bullets,
            certificate_name: body.certificate_name ?? null,
            certificate_url: body.certificate_url ?? null,
            certificate_file_url: body.certificate_file_url ?? null,
            issued_year: body.issued_year ?? null,
        });
        return this.mapEducationRow(row);
    }
    mapSkillRow(row) {
        if (!row)
            return row;
        return { ...row, skill_name: (0, cv_skill_name_1.displaySkillName)(row.skill_name) };
    }
    firstRpcTableRow(data) {
        if (data == null) {
            return null;
        }
        if (Array.isArray(data)) {
            return data[0] ?? null;
        }
        if (typeof data === 'object') {
            return data;
        }
        return null;
    }
    /** Upsert shared catalog row so custom znalosti labels are searchable for others. */
    async ensureSkillCatalogName(displayName) {
        const trimmed = String(displayName ?? '').trim();
        if (trimmed.length < 2) {
            return trimmed;
        }
        const { data, error } = await this.supabase
            .getClient()
            .rpc('ensure_sk_cv_skill', { p_name: trimmed });
        if (error) {
            return trimmed;
        }
        const row = this.firstRpcTableRow(data);
        const canonical = row?.name != null ? String(row.name).trim() : '';
        return canonical.length > 0 ? canonical : trimmed;
    }
    async addSkill(userId, cvId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('skills', cvId);
        const trimmed = body.skill_name != null ? String(body.skill_name).trim() : '';
        if (!trimmed) {
            const { data, error } = await this.supabase
                .getClient()
                .from('cv_skills')
                .insert({
                cv_id: cvId,
                skill_name: (0, cv_skill_name_1.draftSkillStorageName)(),
                level: body.level ?? null,
                sort_order: sortOrder,
            })
                .select('*')
                .single();
            if (error || !data) {
                throw new common_1.NotFoundException(error?.message || 'Pridanie skillu zlyhalo.');
            }
            return this.mapSkillRow(data);
        }
        const catalogName = await this.ensureSkillCatalogName(trimmed);
        const { data: existing } = await this.supabase
            .getClient()
            .from('cv_skills')
            .select('*')
            .eq('cv_id', cvId)
            .ilike('skill_name', catalogName)
            .maybeSingle();
        if (existing) {
            return this.mapSkillRow(existing);
        }
        const { data, error } = await this.supabase
            .getClient()
            .from('cv_skills')
            .insert({
            cv_id: cvId,
            skill_name: catalogName,
            level: body.level ?? null,
            sort_order: sortOrder,
        })
            .select('*')
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(error?.message || 'Pridanie skillu zlyhalo.');
        }
        return this.mapSkillRow(data);
    }
    async updateSkill(userId, cvId, rowId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const trimmed = body.skill_name != null ? String(body.skill_name).trim() : '';
        const { data: current, error: curErr } = await this.supabase
            .getClient()
            .from('cv_skills')
            .select('id, skill_name, level')
            .eq('id', rowId)
            .eq('cv_id', cvId)
            .maybeSingle();
        if (curErr || !current) {
            throw new common_1.NotFoundException('Skill nenájdený.');
        }
        const currentDisplay = (0, cv_skill_name_1.displaySkillName)(current.skill_name);
        if (trimmed.length > 0 &&
            trimmed.toLowerCase() !== currentDisplay.toLowerCase()) {
            const { data: dup } = await this.supabase
                .getClient()
                .from('cv_skills')
                .select('id')
                .eq('cv_id', cvId)
                .ilike('skill_name', trimmed)
                .neq('id', rowId)
                .maybeSingle();
            if (dup) {
                throw new common_1.BadRequestException('Táto zručnosť už existuje.');
            }
        }
        let storageName;
        if (trimmed.length > 0) {
            storageName = await this.ensureSkillCatalogName(trimmed);
        }
        else if ((0, cv_skill_name_1.isDraftSkillStorageName)(current.skill_name)) {
            storageName = String(current.skill_name);
        }
        else {
            storageName = (0, cv_skill_name_1.draftSkillStorageName)();
        }
        const { data, error } = await this.supabase
            .getClient()
            .from('cv_skills')
            .update({
                skill_name: storageName,
                level: body.level !== undefined ? body.level : current.level,
            })
            .eq('id', rowId)
            .eq('cv_id', cvId)
            .select('*')
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(error?.message || 'Úprava skillu zlyhala.');
        }
        return this.mapSkillRow(data);
    }
    async addSoftSkill(userId, cvId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('soft_skills', cvId);
        const trimmed = body.skill_name.trim();
        if (!trimmed) {
            throw new common_1.BadRequestException('Zručnosť je prázdna.');
        }
        const { data: existing } = await this.supabase
            .getClient()
            .from('cv_soft_skills')
            .select('*')
            .eq('cv_id', cvId)
            .ilike('skill_name', trimmed)
            .maybeSingle();
        if (existing) {
            return existing;
        }
        const { data, error } = await this.supabase
            .getClient()
            .from('cv_soft_skills')
            .upsert({ cv_id: cvId, skill_name: trimmed, sort_order: sortOrder }, { onConflict: 'cv_id,skill_name' })
            .select('*')
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(error?.message || 'Pridanie mäkkej zručnosti zlyhalo.');
        }
        return data;
    }
    async addLanguage(userId, cvId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('languages', cvId);
        return this.insertChildRow('languages', {
            cv_id: cvId,
            sort_order: sortOrder,
            language: body.language ?? '',
            level: body.level ?? null,
        });
    }
    async updateLanguage(userId, cvId, rowId, body) {
        await this.assertCvOwned(userId, cvId);
        return this.updateChildRow(userId, 'languages', rowId, {
            language: body.language ?? '',
            level: body.level ?? null,
        });
    }
    async addCertification(userId, cvId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('certifications', cvId);
        return this.insertChildRow('certifications', {
            cv_id: cvId,
            sort_order: sortOrder,
            name: body.name,
            issuer: body.issuer ?? null,
            issued_date: body.issued_date ?? null,
            issued_year: body.issued_year ?? null,
            description: body.description ?? null,
            certificate_url: body.certificate_url ?? null,
            certificate_file_url: body.certificate_file_url ?? null,
        });
    }
    async updateCertification(userId, cvId, rowId, body) {
        await this.assertCvOwned(userId, cvId);
        return this.updateChildRow(userId, 'certifications', rowId, {
            name: body.name,
            issuer: body.issuer ?? null,
            issued_date: body.issued_date ?? null,
            issued_year: body.issued_year ?? null,
            description: body.description ?? null,
            certificate_url: body.certificate_url ?? null,
            certificate_file_url: body.certificate_file_url ?? null,
        });
    }
    async addLink(userId, cvId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('links', cvId);
        return this.insertChildRow('links', {
            cv_id: cvId,
            sort_order: sortOrder,
            type: body.type,
            url: body.url,
        });
    }
    async updateLink(userId, cvId, rowId, body) {
        await this.assertCvOwned(userId, cvId);
        return this.updateChildRow(userId, 'links', rowId, {
            type: body.type,
            url: body.url,
        });
    }
    async addVolunteering(userId, cvId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('volunteering', cvId);
        const bullets = bulletsToJsonb(body.bullets ?? []);
        const row = await this.insertChildRow('volunteering', {
            cv_id: cvId,
            sort_order: sortOrder,
            role_title: body.role_title ?? '',
            organization: body.organization ?? '',
            city: body.city ?? null,
            country: body.country ?? null,
            start_date: body.start_date ?? null,
            end_date: body.end_date ?? null,
            current: Boolean(body.current),
            description: body.description ?? null,
            bullets,
        });
        return this.mapVolunteeringRow(row);
    }
    async updateVolunteering(userId, cvId, rowId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const bullets = bulletsToJsonb(body.bullets ?? []);
        const row = await this.updateChildRow(userId, 'volunteering', rowId, {
            role_title: body.role_title ?? '',
            organization: body.organization ?? '',
            city: body.city ?? null,
            country: body.country ?? null,
            start_date: body.start_date ?? null,
            end_date: body.end_date ?? null,
            current: Boolean(body.current),
            description: body.description ?? null,
            bullets,
        });
        return this.mapVolunteeringRow(row);
    }
    async addPortfolioLink(userId, cvId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('portfolio_links', cvId);
        return this.insertChildRow('portfolio_links', {
            cv_id: cvId,
            sort_order: sortOrder,
            label: body.label,
            url: body.url,
        });
    }
    async updatePortfolioLink(userId, cvId, rowId, body) {
        await this.assertCvOwned(userId, cvId);
        return this.updateChildRow(userId, 'portfolio_links', rowId, {
            label: body.label,
            url: body.url,
        });
    }
    async addAward(userId, cvId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('awards', cvId);
        return this.insertChildRow('awards', {
            cv_id: cvId,
            sort_order: sortOrder,
            title: body.title,
            issuer: body.issuer ?? null,
            issued_year: body.issued_year ?? null,
            description: body.description ?? null,
        });
    }
    async updateAward(userId, cvId, rowId, body) {
        await this.assertCvOwned(userId, cvId);
        return this.updateChildRow(userId, 'awards', rowId, {
            title: body.title,
            issuer: body.issuer ?? null,
            issued_year: body.issued_year ?? null,
            description: body.description ?? null,
        });
    }
    async addReference(userId, cvId, body) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const sortOrder = await this.nextSortOrder('references', cvId);
        return this.insertChildRow('references', {
            cv_id: cvId,
            sort_order: sortOrder,
            person_name: body.person_name,
            organization: body.organization ?? null,
            position: body.position ?? null,
            email: body.email ?? null,
            phone: body.phone ?? null,
            relationship_note: body.relationship_note ?? null,
        });
    }
    async updateReference(userId, cvId, rowId, body) {
        await this.assertCvOwned(userId, cvId);
        return this.updateChildRow(userId, 'references', rowId, {
            person_name: body.person_name,
            organization: body.organization ?? null,
            position: body.position ?? null,
            email: body.email ?? null,
            phone: body.phone ?? null,
            relationship_note: body.relationship_note ?? null,
        });
    }
    async deleteChildRow(userId, cvId, section, rowId) {
        await this.assertCvOwned(userId, cvId);
        await this.assertChildOwnedByUser(section, rowId, userId);
        const { data: row } = await this.supabase
            .getClient()
            .from(SECTION_TABLES[section])
            .select('cv_id')
            .eq('id', rowId)
            .maybeSingle();
        if (!row || String(row.cv_id) !== cvId) {
            throw new common_1.ForbiddenException('Záznam nepatrí do tohto CV.');
        }
        const { error } = await this.supabase
            .getClient()
            .from(SECTION_TABLES[section])
            .delete()
            .eq('id', rowId);
        if (error) {
            throw new common_1.NotFoundException(error.message);
        }
        this.schedulePdfRegeneration(userId, cvId);
    }
    async reorderSection(userId, cvId, section, ids) {
        await this.assertCvOwned(userId, cvId);
        if (ids.length === 0) {
            return;
        }
        const table = SECTION_TABLES[section];
        const { data: rows, error } = await this.supabase
            .getClient()
            .from(table)
            .select('id, cv_id')
            .in('id', ids);
        if (error || !rows) {
            throw new common_1.NotFoundException(error?.message || 'Záznamy sa nenašli.');
        }
        for (const row of rows) {
            if (row.cv_id !== cvId) {
                throw new common_1.ForbiddenException('Niektoré záznamy nepatria do tohto CV.');
            }
        }
        await Promise.all(ids.map((rowId, index) => this.supabase
            .getClient()
            .from(table)
            .update({ sort_order: index })
            .eq('id', rowId)));
        this.schedulePdfRegeneration(userId, cvId);
    }
    async uploadPhoto(userId, cvId, body) {
        const dataUrl = typeof body?.data_url === 'string' ? body.data_url.trim() : '';
        if (!dataUrl) {
            throw new common_1.BadRequestException('Supported formats: JPG, PNG, WEBP.');
        }
        if (dataUrl.length > upload_policy_1.CV_PHOTO_DATA_URL_MAX_CHARS) {
            throw new common_1.BadRequestException('Image payload too large.');
        }
        const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/i);
        if (!match) {
            throw new common_1.BadRequestException('Supported formats: JPG, PNG, WEBP.');
        }
        const mime = match[1].toLowerCase();
        const b64 = match[2];
        const bytes = Buffer.from(b64, 'base64');
        if (!bytes.length) {
            throw new common_1.BadRequestException('Invalid image payload.');
        }
        if (bytes.length > upload_policy_1.CV_PHOTO_MAX_BYTES) {
            throw new common_1.BadRequestException('Image file is too large.');
        }
        return this.uploadPhotoFromFile(userId, cvId, bytes, {
            declaredMime: mime,
            filename: body?.file_name ?? 'photo.jpg',
        });
    }
    async uploadPhotoFromFile(userId, cvId, buffer, options = {}) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const shell = await this.findShellRow(cvId);
        if (!shell) {
            throw new common_1.NotFoundException('CV neexistuje.');
        }
        const previousPath = shell.photo_storage_path ?? null;
        const result = await this.storageUpload.uploadCvPhotoLegacy(userId, cvId, buffer, options);
        if (previousPath && previousPath !== result.storagePath) {
            removeStoredCvPhoto(this.supabase, previousPath);
        }
        const { error } = await this.supabase
            .getClient()
            .from('cvs')
            .update({
            photo_url: photoUrlFromUploadResult(result),
            photo_storage_path: result.storagePath,
            photo_original_mime: result.mime,
            updated_at: new Date().toISOString(),
            draft_saved_at: new Date().toISOString(),
        })
            .eq('id', cvId);
        if (error) {
            throw new common_1.NotFoundException(error?.message || 'Photo update failed.');
        }
        const next = await this.findShellRow(cvId);
        if (!next)
            throw new common_1.NotFoundException('CV neexistuje.');
        this.schedulePdfRegeneration(userId, cvId);
        return this.enrichCvHeaderPhotoViewUrl(await this.loadHeaderForShell(next));
    }
    async applyPhotoFromDirectUpload(userId, cvId, result) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const shell = await this.findShellRow(cvId);
        if (!shell) {
            throw new common_1.NotFoundException('CV neexistuje.');
        }
        const previousPath = shell.photo_storage_path ?? null;
        if (previousPath && previousPath !== result.storagePath) {
            removeStoredCvPhoto(this.supabase, previousPath);
        }
        const { error } = await this.supabase
            .getClient()
            .from('cvs')
            .update({
            photo_url: photoUrlFromUploadResult(result),
            photo_storage_path: result.storagePath,
            photo_original_mime: result.mime,
            updated_at: new Date().toISOString(),
            draft_saved_at: new Date().toISOString(),
        })
            .eq('id', cvId);
        if (error) {
            throw new common_1.NotFoundException(error?.message || 'Photo update failed.');
        }
        const next = await this.findShellRow(cvId);
        if (!next)
            throw new common_1.NotFoundException('CV neexistuje.');
        this.schedulePdfRegeneration(userId, cvId);
        return this.enrichCvHeaderPhotoViewUrl(await this.loadHeaderForShell(next));
    }
    async deletePhoto(userId, cvId) {
        await this.assertWorkerRole(userId);
        await this.assertCvOwned(userId, cvId);
        const cv = await this.loadHeaderForShell((await this.findShellRow(cvId)));
        if (cv.photo_storage_path) {
            removeStoredCvPhoto(this.supabase, cv.photo_storage_path);
        }
        const { error } = await this.supabase
            .getClient()
            .from('cvs')
            .update({
            photo_url: null,
            photo_storage_path: null,
            photo_original_mime: null,
            updated_at: new Date().toISOString(),
            draft_saved_at: new Date().toISOString(),
        })
            .eq('id', cvId);
        if (error) {
            throw new common_1.NotFoundException(error?.message || 'Photo delete failed.');
        }
        const next = await this.findShellRow(cvId);
        if (!next)
            throw new common_1.NotFoundException('CV neexistuje.');
        this.schedulePdfRegeneration(userId, cvId);
        return this.loadHeaderForShell(next);
    }
    async generatePdf(userId, cvId) {
        const out = await this.cvPdfGeneration.getPdfBytesForCv(cvId, userId);
        return { filename: out.filename, bytes: out.buffer };
    }
    isPreviewExportPayload(body) {
        const template = body?.template;
        return (typeof template === 'string' &&
            ['atlas', 'editorial', 'minimalist', 'monochrome'].includes(template));
    }
    async generatePdfFromExportData(userId, cvId, raw) {
        await this.assertCvOwned(userId, cvId);
        const { parseCvDocumentExportPayload } = require('./document/cv-document-export-parse');
        const data = parseCvDocumentExportPayload(raw);
        const first = (data.firstName ?? '').trim().toLowerCase() || 'uzivatel';
        const last = (data.lastName ?? '').trim().toLowerCase() || 'cv';
        const filename = `jobbie-zivotopis-${first}-${last}.pdf`;
        const bytes = await this.cvPdf.renderFromExportData(data);
        return { filename, bytes };
    }
    async resolvePdfExport(userId, cvId, body) {
        if (this.isPreviewExportPayload(body)) {
            return this.generatePdfFromExportData(userId, cvId, body);
        }
        return this.generatePdf(userId, cvId);
    }
    async listSection(section, cvId) {
        const { data, error } = await this.supabase
            .getClient()
            .from(SECTION_TABLES[section])
            .select('*')
            .eq('cv_id', cvId)
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: true });
        if (error || !data) {
            return [];
        }
        return data;
    }
    async nextSortOrder(section, cvId) {
        const { data } = await this.supabase
            .getClient()
            .from(SECTION_TABLES[section])
            .select('sort_order')
            .eq('cv_id', cvId)
            .order('sort_order', { ascending: false })
            .limit(1)
            .maybeSingle();
        const top = data?.sort_order ?? -1;
        return top + 1;
    }
    async insertChildRow(section, row) {
        const { data, error } = await this.supabase
            .getClient()
            .from(SECTION_TABLES[section])
            .insert(row)
            .select('*')
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(error?.message || 'Vloženie záznamu zlyhalo.');
        }
        const cvId = String(row.cv_id ?? data.cv_id ?? '');
        if (cvId) {
            const shell = await this.findShellRow(cvId);
            if (shell) {
                this.schedulePdfRegeneration(String(shell.user_id), cvId);
            }
        }
        return data;
    }
    async updateChildRow(userId, section, rowId, update) {
        await this.assertChildOwnedByUser(section, rowId, userId);
        const { data, error } = await this.supabase
            .getClient()
            .from(SECTION_TABLES[section])
            .update(update)
            .eq('id', rowId)
            .select('*')
            .single();
        if (error || !data) {
            throw new common_1.NotFoundException(error?.message || 'Aktualizácia zlyhala.');
        }
        const cvId = String(data.cv_id ?? '');
        if (cvId) {
            this.schedulePdfRegeneration(userId, cvId);
        }
        return data;
    }
    async assertChildOwnedByUser(section, rowId, userId) {
        const { data, error } = await this.supabase
            .getClient()
            .from(SECTION_TABLES[section])
            .select('cv_id, cvs!inner(user_id)')
            .eq('id', rowId)
            .maybeSingle();
        if (error || !data) {
            throw new common_1.NotFoundException('Záznam nebol nájdený.');
        }
        const ownerId = data.cvs;
        const owner = Array.isArray(ownerId) ? ownerId[0]?.user_id : ownerId?.user_id;
        if (owner !== userId) {
            throw new common_1.ForbiddenException('Tento záznam nie je váš.');
        }
    }
};
exports.CvService = CvService;
exports.CvService = CvService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService,
        cv_pdf_service_1.CvPdfService,
        storage_upload_service_1.StorageUploadService,
        cv_pdf_queue_service_1.CvPdfQueueService,
        cv_pdf_generation_service_1.CvPdfGenerationService])
], CvService);
//# sourceMappingURL=cv.service.js.map