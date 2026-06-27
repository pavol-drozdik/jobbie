import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export const CV_LINK_TYPES = [
  'linkedin', 'website', 'github', 'behance', 'twitter', 'instagram', 'other',
] as const;
export type CvLinkType = (typeof CV_LINK_TYPES)[number];

export const CV_EXPERIENCE_ENTRY_TYPES = ['employment'] as const;
export type CvExperienceEntryType = (typeof CV_EXPERIENCE_ENTRY_TYPES)[number];

export const CV_EDUCATION_KINDS = ['secondary', 'university', 'course_certificate'] as const;
export type CvEducationKind = (typeof CV_EDUCATION_KINDS)[number];

export const CV_TEMPLATE_KEYS = [
  'modern', 'minimal', 'professional', 'creative', 'elegant', 'classic',
] as const;
export type CvTemplateKey = (typeof CV_TEMPLATE_KEYS)[number];

export const CV_WIZARD_STEPS = ['template', 'editor', 'final'] as const;
export type CvWizardStep = (typeof CV_WIZARD_STEPS)[number];

export const CV_LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type CvLanguageLevel = (typeof CV_LANGUAGE_LEVELS)[number];

export const CV_SKILL_LEVELS = [
  'Zaciatocnik',
  'Mierne pokrocily',
  'Pokrocily',
  'Expert',
  'Začiatočník',
  'Mierne pokročilý',
  'Pokročilý',
] as const;
export type CvSkillLevel = (typeof CV_SKILL_LEVELS)[number];

export const CV_DRIVING_LICENSE_CATEGORIES = [
  'AM', 'A1', 'A2', 'A', 'B1', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'D1', 'D1E', 'D', 'DE', 'T',
] as const;

export class CvCreateDto {
    @IsOptional()
    @IsString()
    display_title?: string;

    @IsOptional()
    @IsIn(CV_TEMPLATE_KEYS)
    template_key?: CvTemplateKey;
}
export class CvHeaderPatchDto {
    @IsOptional()
    @IsString()
    display_title?: string | null;

    @IsOptional()
    @IsString()
    full_name?: string | null;

    @IsOptional()
    @IsString()
    headline?: string | null;

    @IsOptional()
    @IsString()
    bio?: string | null;

    @IsOptional()
    @IsString()
    phone?: string | null;

    @IsOptional()
    @IsString()
    email?: string | null;

    @IsOptional()
    @IsString()
    location?: string | null;

    @IsOptional()
    @IsString()
    photo_url?: string | null;

    @IsOptional()
    @IsString()
    first_name?: string | null;

    @IsOptional()
    @IsString()
    last_name?: string | null;

    @IsOptional()
    @IsBoolean()
    show_academic_title?: boolean;

    @IsOptional()
    @IsString()
    academic_title?: string | null;

    @IsOptional()
    @IsString()
    title_before_name?: string | null;

    @IsOptional()
    @IsString()
    title_after_name?: string | null;

    @IsOptional()
    @IsString()
    birth_date?: string | null;

    @IsOptional()
    @IsBoolean()
    show_birth_date?: boolean;

    @IsOptional()
    @IsString()
    linkedin_url?: string | null;

    @IsOptional()
    @IsBoolean()
    show_contact_details?: boolean;

    @IsOptional()
    @IsString()
    address_country?: string | null;

    @IsOptional()
    @IsString()
    address_postal_code?: string | null;

    @IsOptional()
    @IsString()
    address_district?: string | null;

    @IsOptional()
    @IsString()
    address_city?: string | null;

    @IsOptional()
    @IsString()
    address_street?: string | null;

    @IsOptional()
    @IsString()
    about_me?: string | null;

    @IsOptional()
    @IsString()
    cv_title?: string | null;

    @IsOptional()
    @IsBoolean()
    visible_to_employers?: boolean;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    driving_license_categories?: string[];

    @IsOptional()
    @IsInt()
    approximate_km_driven?: number | null;

    @IsOptional()
    @IsString()
    additional_skills_info?: string | null;

    @IsOptional()
    @IsString()
    hobbies?: string | null;

    @IsOptional()
    @IsString()
    highest_education_level?: string | null;

    @IsOptional()
    @IsBoolean()
    gdpr_consent?: boolean;

    @IsOptional()
    @IsBoolean()
    terms_consent?: boolean;

    @IsOptional()
    @IsBoolean()
    marketing_consent?: boolean;

    @IsOptional()
    @IsIn(CV_TEMPLATE_KEYS)
    template_key?: CvTemplateKey;

    @IsOptional()
    @IsIn(CV_WIZARD_STEPS)
    wizard_step?: CvWizardStep;

    @IsOptional()
    @IsString()
    wizard_section?: string | null;

    @IsOptional()
    @IsString()
    gender?: string | null;

    @IsOptional()
    @IsInt()
    birth_day?: number | null;

    @IsOptional()
    @IsInt()
    birth_month?: number | null;

    @IsOptional()
    @IsInt()
    birth_year?: number | null;

    @IsOptional()
    @IsBoolean()
    address_optional_collapsed?: boolean;

    @IsOptional()
    @IsString()
    photo_storage_path?: string | null;

    @IsOptional()
    @IsString()
    photo_original_mime?: string | null;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    desired_positions?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    desired_locations?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    employment_types?: string[];

    @IsOptional()
    @IsString()
    start_availability?: string | null;

    @IsOptional()
    @IsNumber()
    salary_min?: number | null;

    @IsOptional()
    @IsString()
    salary_currency?: string | null;

    @IsOptional()
    @IsString()
    salary_period?: string | null;

    @IsOptional()
    @IsBoolean()
    weekend_work?: boolean | null;

    @IsOptional()
    @IsBoolean()
    night_work?: boolean | null;

    @IsOptional()
    @IsBoolean()
    open_to_relocate_commute?: boolean | null;

    @IsOptional()
    @IsBoolean()
    remote_work_only?: boolean | null;

    @IsOptional()
    @IsBoolean()
    has_disability?: boolean;

    @IsOptional()
    @IsBoolean()
    email_job_alerts?: boolean;

    @IsOptional()
    @IsObject()
    pdf_settings?: Record<string, unknown>;

    @IsOptional()
    @IsObject()
    optional_sections?: Record<string, unknown>;
}
export class ExperienceUpsertDto {
    @IsOptional()
    @IsString()
    company?: string;

    @IsOptional()
    @IsString()
    position?: string;

    @IsOptional()
    @IsString()
    city?: string | null;

    @IsOptional()
    @IsString()
    country?: string | null;

    @IsOptional()
    @IsString()
    start_date?: string | null;

    @IsOptional()
    @IsString()
    end_date?: string | null;

    @IsOptional()
    @IsBoolean()
    current?: boolean;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    bullets?: string[];

    @IsOptional()
    @IsString()
    achievements?: string | null;
}
export class EducationUpsertDto {
    @IsOptional()
    @IsIn(CV_EDUCATION_KINDS)
    education_kind?: CvEducationKind;

    @IsOptional()
    @IsString()
    school?: string;

    @IsOptional()
    @IsString()
    degree?: string | null;

    @IsOptional()
    @IsString()
    field?: string | null;

    @IsOptional()
    @IsString()
    start_date?: string | null;

    @IsOptional()
    @IsString()
    end_date?: string | null;

    @IsOptional()
    @IsString()
    city?: string | null;

    @IsOptional()
    @IsString()
    country?: string | null;

    @IsOptional()
    @IsString()
    institution?: string | null;

    @IsOptional()
    @IsString()
    faculty?: string | null;

    @IsOptional()
    @IsString()
    study_level?: string | null;

    @IsOptional()
    @IsInt()
    start_year?: number | null;

    @IsOptional()
    @IsInt()
    end_year?: number | null;

    @IsOptional()
    @IsBoolean()
    has_graduation?: boolean;

    @IsOptional()
    @IsBoolean()
    currently_studying?: boolean;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    bullets?: string[];

    @IsOptional()
    @IsString()
    certificate_name?: string | null;

    @IsOptional()
    @IsString()
    certificate_url?: string | null;

    @IsOptional()
    @IsString()
    certificate_file_url?: string | null;

    @IsOptional()
    @IsInt()
    issued_year?: number | null;
}
export class SkillUpsertDto {
    @IsOptional()
    @IsString()
    skill_name?: string;

    @IsOptional()
    @IsIn(CV_SKILL_LEVELS)
    level?: CvSkillLevel | null;
}
export class SoftSkillUpsertDto {
    @IsString()
    skill_name!: string;
}
export class LanguageUpsertDto {
    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsIn(CV_LANGUAGE_LEVELS)
    level?: CvLanguageLevel | null;
}
export class CertificationUpsertDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    issuer?: string | null;

    @IsOptional()
    @IsString()
    issued_date?: string | null;

    @IsOptional()
    @IsInt()
    issued_year?: number | null;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsString()
    certificate_url?: string | null;

    @IsOptional()
    @IsString()
    certificate_file_url?: string | null;
}
export class LinkUpsertDto {
    @IsIn(CV_LINK_TYPES)
    type!: CvLinkType;

    @IsString()
    url!: string;
}
export class PortfolioLinkUpsertDto {
    @IsString()
    label!: string;

    @IsString()
    url!: string;
}
export class VolunteeringUpsertDto {
    @IsOptional()
    @IsString()
    role_title?: string;

    @IsOptional()
    @IsString()
    organization?: string;

    @IsOptional()
    @IsString()
    city?: string | null;

    @IsOptional()
    @IsString()
    country?: string | null;

    @IsOptional()
    @IsString()
    start_date?: string | null;

    @IsOptional()
    @IsString()
    end_date?: string | null;

    @IsOptional()
    @IsBoolean()
    current?: boolean;

    @IsOptional()
    @IsString()
    description?: string | null;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    bullets?: string[];
}
export class AwardUpsertDto {
    @IsString()
    title!: string;

    @IsOptional()
    @IsString()
    issuer?: string | null;

    @IsOptional()
    @IsInt()
    issued_year?: number | null;

    @IsOptional()
    @IsString()
    description?: string | null;
}
export class ReferenceUpsertDto {
    @IsString()
    person_name!: string;

    @IsOptional()
    @IsString()
    organization?: string | null;

    @IsOptional()
    @IsString()
    position?: string | null;

    @IsOptional()
    @IsString()
    email?: string | null;

    @IsOptional()
    @IsString()
    phone?: string | null;

    @IsOptional()
    @IsString()
    relationship_note?: string | null;
}
export class CvProgressPatchDto {
    @IsIn(CV_WIZARD_STEPS)
    wizard_step!: CvWizardStep;

    @IsOptional()
    @IsString()
    wizard_section?: string | null;
}
export class CvPhotoUpsertDto {
    /** Legacy JSON upload; omit when sending multipart `file`. */
    @IsOptional()
    @IsString()
    data_url?: string;

    @IsOptional()
    @IsString()
    file_name?: string;
}
export class ReorderDto {
    @IsArray()
    @IsString({ each: true })
    ids!: string[];
}
export interface CvListItemResponseDto {
    id: string;
    user_id: string;
    display_title: string;
    template_key: CvTemplateKey;
    visible_to_employers: boolean;
    is_default_for_profile: boolean;
    draft_saved_at: string | null;
    updated_at: string;
    wizard_step: CvWizardStep;
    created_at: string;
}
export interface CvHeaderResponseDto {
    id: string;
    user_id: string;
    is_default_for_profile: boolean;
    display_title: string;
    full_name: string | null;
    headline: string | null;
    bio: string | null;
    phone: string | null;
    email: string | null;
    location: string | null;
    photo_url: string | null;
    first_name: string | null;
    last_name: string | null;
    show_academic_title: boolean;
    academic_title: string | null;
    title_before_name: string | null;
    title_after_name: string | null;
    birth_date: string | null;
    show_birth_date: boolean;
    linkedin_url: string | null;
    show_contact_details: boolean;
    address_country: string | null;
    address_postal_code: string | null;
    address_district: string | null;
    address_city: string | null;
    address_street: string | null;
    about_me: string | null;
    cv_title: string | null;
    visible_to_employers: boolean;
    driving_license_categories: string[];
    approximate_km_driven: number | null;
    additional_skills_info: string | null;
    hobbies: string | null;
    highest_education_level: string | null;
    gdpr_consent: boolean;
    terms_consent: boolean;
    marketing_consent: boolean;
    template_key: CvTemplateKey;
    wizard_step: CvWizardStep;
    wizard_section: string | null;
    optional_sections: Record<string, unknown>;
    gender: string | null;
    birth_day: number | null;
    birth_month: number | null;
    birth_year: number | null;
    address_optional_collapsed: boolean;
    photo_storage_path: string | null;
    photo_original_mime: string | null;
    desired_positions: string[];
    desired_locations: string[];
    employment_types: string[];
    start_availability: string | null;
    salary_min: number | null;
    salary_currency: string | null;
    salary_period: string | null;
    weekend_work: boolean | null;
    night_work: boolean | null;
    open_to_relocate_commute: boolean | null;
    remote_work_only: boolean | null;
    has_disability: boolean;
    email_job_alerts: boolean;
    pdf_settings: Record<string, unknown>;
    draft_saved_at: string | null;
    created_at: string;
    updated_at: string;
}
export interface ExperienceResponseDto {
    id: string;
    cv_id: string;
    entry_type: CvExperienceEntryType;
    company: string;
    position: string;
    city: string | null;
    country: string | null;
    start_date: string | null;
    end_date: string | null;
    current: boolean;
    description: string | null;
    achievements: string | null;
    bullets: string[];
    sort_order: number;
}
export interface EducationResponseDto {
    id: string;
    cv_id: string;
    education_kind: CvEducationKind;
    school: string;
    degree: string | null;
    field: string | null;
    start_date: string | null;
    end_date: string | null;
    city: string | null;
    country: string | null;
    institution: string | null;
    faculty: string | null;
    study_level: string | null;
    start_year: number | null;
    end_year: number | null;
    has_graduation: boolean;
    currently_studying: boolean;
    description: string | null;
    bullets: string[];
    certificate_name: string | null;
    certificate_url: string | null;
    certificate_file_url: string | null;
    issued_year: number | null;
    sort_order: number;
}
export interface SkillResponseDto {
    id: string;
    cv_id: string;
    skill_name: string;
    level: CvSkillLevel | null;
    sort_order: number;
}
export interface SoftSkillResponseDto {
    id: string;
    cv_id: string;
    skill_name: string;
    sort_order: number;
}
export interface LanguageResponseDto {
    id: string;
    cv_id: string;
    language: string;
    level: CvLanguageLevel | null;
    sort_order: number;
}
export interface CertificationResponseDto {
    id: string;
    cv_id: string;
    name: string;
    issuer: string | null;
    issued_date: string | null;
    issued_year: number | null;
    description: string | null;
    certificate_url: string | null;
    certificate_file_url: string | null;
    sort_order: number;
}
export interface LinkResponseDto {
    id: string;
    cv_id: string;
    type: CvLinkType;
    url: string;
    sort_order: number;
}
export interface PortfolioLinkResponseDto {
    id: string;
    cv_id: string;
    label: string;
    url: string;
    sort_order: number;
}
export interface VolunteeringResponseDto {
    id: string;
    cv_id: string;
    role_title: string;
    organization: string;
    city: string | null;
    country: string | null;
    start_date: string | null;
    end_date: string | null;
    current: boolean;
    description: string | null;
    bullets: string[];
    sort_order: number;
}
export interface AwardResponseDto {
    id: string;
    cv_id: string;
    title: string;
    issuer: string | null;
    issued_year: number | null;
    description: string | null;
    sort_order: number;
}
export interface ReferenceResponseDto {
    id: string;
    cv_id: string;
    person_name: string;
    organization: string | null;
    position: string | null;
    email: string | null;
    phone: string | null;
    relationship_note: string | null;
    sort_order: number;
}
export interface CvAggregateResponseDto {
    cv: CvHeaderResponseDto;
    experience: ExperienceResponseDto[];
    education: EducationResponseDto[];
    skills: SkillResponseDto[];
    soft_skills: SoftSkillResponseDto[];
    languages: LanguageResponseDto[];
    certifications: CertificationResponseDto[];
    links: LinkResponseDto[];
    volunteering: VolunteeringResponseDto[];
    portfolio_links: PortfolioLinkResponseDto[];
    awards: AwardResponseDto[];
    references: ReferenceResponseDto[];
}

