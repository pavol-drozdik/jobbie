import type { CurrentUser } from '../auth/auth.types';
import { CvService } from './cv.service';
import { AwardUpsertDto, CertificationUpsertDto, CvCreateDto, CvHeaderPatchDto, CvPhotoUpsertDto, CvProgressPatchDto, EducationUpsertDto, ExperienceUpsertDto, LanguageUpsertDto, LinkUpsertDto, PortfolioLinkUpsertDto, ReferenceUpsertDto, ReorderDto, SkillUpsertDto, SoftSkillUpsertDto, VolunteeringUpsertDto, type AwardResponseDto, type CertificationResponseDto, type CvAggregateResponseDto, type CvHeaderResponseDto, type CvListItemResponseDto, type EducationResponseDto, type ExperienceResponseDto, type LanguageResponseDto, type LinkResponseDto, type PortfolioLinkResponseDto, type ReferenceResponseDto, type SkillResponseDto, type SoftSkillResponseDto, type VolunteeringResponseDto } from './cv.dto';
import { Response } from 'express';
export declare class CvController {
    private cv;
    constructor(cv: CvService);
    private defaultCvId;
    listMine(user: CurrentUser): Promise<CvListItemResponseDto[]>;
    createCv(user: CurrentUser, body: CvCreateDto): Promise<CvHeaderResponseDto>;
    getPublicByUser(userId: string, viewer: CurrentUser | null): Promise<CvAggregateResponseDto>;
    getMine(user: CurrentUser): Promise<CvAggregateResponseDto>;
    patchMine(user: CurrentUser, body: CvHeaderPatchDto): Promise<CvHeaderResponseDto>;
    patchProgress(user: CurrentUser, body: CvProgressPatchDto): Promise<CvHeaderResponseDto>;
    uploadPhotoMe(user: CurrentUser, body: CvPhotoUpsertDto): Promise<CvHeaderResponseDto>;
    deletePhotoMe(user: CurrentUser): Promise<CvHeaderResponseDto>;
    exportPdfMe(user: CurrentUser, res: Response): Promise<void>;
    getOneMine(user: CurrentUser, cvId: string): Promise<CvAggregateResponseDto>;
    patchOne(user: CurrentUser, cvId: string, body: CvHeaderPatchDto): Promise<CvHeaderResponseDto>;
    patchOneProgress(user: CurrentUser, cvId: string, body: CvProgressPatchDto): Promise<CvHeaderResponseDto>;
    deleteOne(user: CurrentUser, cvId: string): Promise<{
        ok: true;
    }>;
    exportPdfOne(user: CurrentUser, cvId: string, res: Response): Promise<void>;
    uploadPhotoOne(user: CurrentUser, cvId: string, body: CvPhotoUpsertDto, file?: Express.Multer.File): Promise<CvHeaderResponseDto>;
    deletePhotoOne(user: CurrentUser, cvId: string): Promise<CvHeaderResponseDto>;
    addExperienceMe(user: CurrentUser, body: ExperienceUpsertDto): Promise<ExperienceResponseDto>;
    reorderExperienceMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateExperienceMe(user: CurrentUser, id: string, body: ExperienceUpsertDto): Promise<ExperienceResponseDto>;
    deleteExperienceMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
    addEducationMe(user: CurrentUser, body: EducationUpsertDto): Promise<EducationResponseDto>;
    reorderEducationMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateEducationMe(user: CurrentUser, id: string, body: EducationUpsertDto): Promise<EducationResponseDto>;
    deleteEducationMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
    addSkillMe(user: CurrentUser, body: SkillUpsertDto): Promise<SkillResponseDto>;
    reorderSkillsMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    deleteSkillMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
    addSoftSkillMe(user: CurrentUser, body: SoftSkillUpsertDto): Promise<SoftSkillResponseDto>;
    reorderSoftSkillsMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    deleteSoftSkillMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
    addLanguageMe(user: CurrentUser, body: LanguageUpsertDto): Promise<LanguageResponseDto>;
    reorderLanguagesMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateLanguageMe(user: CurrentUser, id: string, body: LanguageUpsertDto): Promise<LanguageResponseDto>;
    deleteLanguageMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
    addCertificationMe(user: CurrentUser, body: CertificationUpsertDto): Promise<CertificationResponseDto>;
    reorderCertificationsMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateCertificationMe(user: CurrentUser, id: string, body: CertificationUpsertDto): Promise<CertificationResponseDto>;
    deleteCertificationMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
    addLinkMe(user: CurrentUser, body: LinkUpsertDto): Promise<LinkResponseDto>;
    reorderLinksMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateLinkMe(user: CurrentUser, id: string, body: LinkUpsertDto): Promise<LinkResponseDto>;
    deleteLinkMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
    addVolunteeringMe(user: CurrentUser, body: VolunteeringUpsertDto): Promise<VolunteeringResponseDto>;
    reorderVolunteeringMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateVolunteeringMe(user: CurrentUser, id: string, body: VolunteeringUpsertDto): Promise<VolunteeringResponseDto>;
    deleteVolunteeringMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
    addPortfolioLinkMe(user: CurrentUser, body: PortfolioLinkUpsertDto): Promise<PortfolioLinkResponseDto>;
    reorderPortfolioLinksMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updatePortfolioLinkMe(user: CurrentUser, id: string, body: PortfolioLinkUpsertDto): Promise<PortfolioLinkResponseDto>;
    deletePortfolioLinkMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
    addAwardMe(user: CurrentUser, body: AwardUpsertDto): Promise<AwardResponseDto>;
    reorderAwardsMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateAwardMe(user: CurrentUser, id: string, body: AwardUpsertDto): Promise<AwardResponseDto>;
    deleteAwardMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
    addReferenceMe(user: CurrentUser, body: ReferenceUpsertDto): Promise<ReferenceResponseDto>;
    reorderReferencesMe(user: CurrentUser, body: ReorderDto): Promise<{
        ok: true;
    }>;
    updateReferenceMe(user: CurrentUser, id: string, body: ReferenceUpsertDto): Promise<ReferenceResponseDto>;
    deleteReferenceMe(user: CurrentUser, id: string): Promise<{
        ok: true;
    }>;
}
