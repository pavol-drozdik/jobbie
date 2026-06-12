import type { CurrentUser } from '../auth/auth.types';
import { CvService } from './cv.service';
import { AwardUpsertDto, CertificationUpsertDto, EducationUpsertDto, ExperienceUpsertDto, LanguageUpsertDto, LinkUpsertDto, PortfolioLinkUpsertDto, ReferenceUpsertDto, ReorderDto, SkillUpsertDto, SoftSkillUpsertDto, VolunteeringUpsertDto, type AwardResponseDto, type CertificationResponseDto, type EducationResponseDto, type ExperienceResponseDto, type LanguageResponseDto, type LinkResponseDto, type PortfolioLinkResponseDto, type ReferenceResponseDto, type SkillResponseDto, type SoftSkillResponseDto, type VolunteeringResponseDto } from './cv.dto';
export declare class CvScopedSectionsController {
    private readonly cv;
    constructor(cv: CvService);
    addExperience(user: CurrentUser, cvId: string, body: ExperienceUpsertDto): Promise<ExperienceResponseDto>;
    reorderExperience(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateExperience(user: CurrentUser, cvId: string, id: string, body: ExperienceUpsertDto): Promise<ExperienceResponseDto>;
    deleteExperience(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
    addEducation(user: CurrentUser, cvId: string, body: EducationUpsertDto): Promise<EducationResponseDto>;
    reorderEducation(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateEducation(user: CurrentUser, cvId: string, id: string, body: EducationUpsertDto): Promise<EducationResponseDto>;
    deleteEducation(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
    addSkill(user: CurrentUser, cvId: string, body: SkillUpsertDto): Promise<SkillResponseDto>;
    reorderSkills(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    deleteSkill(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
    addSoftSkill(user: CurrentUser, cvId: string, body: SoftSkillUpsertDto): Promise<SoftSkillResponseDto>;
    reorderSoftSkills(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    deleteSoftSkill(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
    addLanguage(user: CurrentUser, cvId: string, body: LanguageUpsertDto): Promise<LanguageResponseDto>;
    reorderLanguages(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateLanguage(user: CurrentUser, cvId: string, id: string, body: LanguageUpsertDto): Promise<LanguageResponseDto>;
    deleteLanguage(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
    addCertification(user: CurrentUser, cvId: string, body: CertificationUpsertDto): Promise<CertificationResponseDto>;
    reorderCertifications(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateCertification(user: CurrentUser, cvId: string, id: string, body: CertificationUpsertDto): Promise<CertificationResponseDto>;
    deleteCertification(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
    addLink(user: CurrentUser, cvId: string, body: LinkUpsertDto): Promise<LinkResponseDto>;
    reorderLinks(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateLink(user: CurrentUser, cvId: string, id: string, body: LinkUpsertDto): Promise<LinkResponseDto>;
    deleteLink(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
    addVolunteering(user: CurrentUser, cvId: string, body: VolunteeringUpsertDto): Promise<VolunteeringResponseDto>;
    reorderVolunteering(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateVolunteering(user: CurrentUser, cvId: string, id: string, body: VolunteeringUpsertDto): Promise<VolunteeringResponseDto>;
    deleteVolunteering(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
    addPortfolioLink(user: CurrentUser, cvId: string, body: PortfolioLinkUpsertDto): Promise<PortfolioLinkResponseDto>;
    reorderPortfolioLinks(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updatePortfolioLink(user: CurrentUser, cvId: string, id: string, body: PortfolioLinkUpsertDto): Promise<PortfolioLinkResponseDto>;
    deletePortfolioLink(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
    addAward(user: CurrentUser, cvId: string, body: AwardUpsertDto): Promise<AwardResponseDto>;
    reorderAwards(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateAward(user: CurrentUser, cvId: string, id: string, body: AwardUpsertDto): Promise<AwardResponseDto>;
    deleteAward(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
    addReference(user: CurrentUser, cvId: string, body: ReferenceUpsertDto): Promise<ReferenceResponseDto>;
    reorderReferences(user: CurrentUser, cvId: string, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateReference(user: CurrentUser, cvId: string, id: string, body: ReferenceUpsertDto): Promise<ReferenceResponseDto>;
    deleteReference(user: CurrentUser, cvId: string, id: string): Promise<{
        ok: true;
    }>;
}
