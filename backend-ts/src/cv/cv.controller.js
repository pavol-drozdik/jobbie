"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CvController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const throttler_1 = require("@nestjs/throttler");
const upload_policy_1 = require("../storage/upload-policy");
const jwks_auth_guard_1 = require("../auth/jwks-auth.guard");
const optional_jwks_auth_guard_1 = require("../auth/optional-jwks-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const cv_service_1 = require("./cv.service");
const cv_dto_1 = require("./cv.dto");
const cv_document_utils_1 = require("./document/cv-document-utils");
const cv_pdf_service_1 = require("./cv-pdf.service");
const cv_document_paginate_service_1 = require("./document/cv-document-paginate.service");
const cv_document_export_parse_1 = require("./document/cv-document-export-parse");
const OK = { ok: true };
let CvController = class CvController {
    constructor(cv, cvPdf, documentPaginate) {
        this.cv = cv;
        this.cvPdf = cvPdf;
        this.documentPaginate = documentPaginate;
    }
    async defaultCvId(user) {
        const h = await this.cv.getOrCreateMyCv(user.id);
        return h.id;
    }
    async resolvePhotoUpload(userId, cvId, body, file) {
        if (file?.buffer?.length) {
            throw new common_1.GoneException('Multipart upload removed. Use POST /api/storage/uploads/init with purpose cv_photo, then finalize.');
        }
        const dataUrl = typeof body?.data_url === 'string' ? body.data_url.trim() : '';
        if (dataUrl.length > 0) {
            return this.cv.uploadPhoto(userId, cvId, body);
        }
        throw new common_1.BadRequestException('Nahrajte obrázok (JPG, PNG alebo WEBP).');
    }
    async listMine(user) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.listMyCvs(user.id);
    }
    async createCv(user, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.createCv(user.id, body);
    }
    async getPublicByUser(userId, viewer) {
        const aggregate = await this.cv.getAggregateByUserId(userId, viewer?.id ?? null);
        if (!aggregate) {
            throw new common_1.NotFoundException('CV nebolo nájdené.');
        }
        return aggregate;
    }
    async getMine(user) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.getOrCreateMyCv(user.id);
        const aggregate = await this.cv.getAggregateByUserId(user.id, user.id);
        if (!aggregate) {
            throw new common_1.NotFoundException('CV nebolo nájdené.');
        }
        return aggregate;
    }
    async patchMine(user, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.patchMyCv(user.id, body);
    }
    async patchProgress(user, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.patchMyCv(user.id, body);
    }
    async uploadPhotoMe(user, body, file) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.resolvePhotoUpload(user.id, cvId, body, file);
    }
    async deletePhotoMe(user) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.deletePhoto(user.id, cvId);
    }
    async exportPdfMe(user, body, res) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        const out = await this.cv.resolvePdfExport(user.id, cvId, body);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', (0, cv_document_utils_1.buildAttachmentContentDisposition)(out.filename));
        res.status(common_1.HttpStatus.OK).send(out.bytes);
    }
    async getOneMine(user, cvId) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.assertCvOwned(user.id, cvId);
        const aggregate = await this.cv.getAggregateByCvId(cvId, user.id);
        if (!aggregate) {
            throw new common_1.NotFoundException('CV nebolo nájdené.');
        }
        return aggregate;
    }
    async patchOne(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.patchCv(user.id, cvId, body);
    }
    async patchOneProgress(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.patchCv(user.id, cvId, body);
    }
    async deleteOne(user, cvId) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteCv(user.id, cvId);
        return OK;
    }
    async exportPdfOneGet(user, cvId, res) {
        return this.exportPdfOne(user, cvId, {}, res);
    }
    async exportPdfOne(user, cvId, body, res) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.assertCvOwned(user.id, cvId);
        const out = await this.cv.resolvePdfExport(user.id, cvId, body);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', (0, cv_document_utils_1.buildAttachmentContentDisposition)(out.filename));
        res.status(common_1.HttpStatus.OK).send(out.bytes);
    }
    async exportPdfRenderOne(user, cvId, body, res) {
        return this.exportPdfOne(user, cvId, body, res);
    }
    async previewDocumentOne(user, cvId, body, res) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.assertCvOwned(user.id, cvId);
        const exportData = (0, cv_document_export_parse_1.isCvDocumentPreviewExportPayload)(body)
            ? (0, cv_document_export_parse_1.parseCvDocumentExportPayload)(body)
            : await this.resolvePreviewExportData(cvId, user.id);
        const bytes = await this.documentPaginate.renderPdfFromExportData(exportData);
        const first = (exportData.firstName ?? '').trim().toLowerCase() || 'uzivatel';
        const last = (exportData.lastName ?? '').trim().toLowerCase() || 'cv';
        const filename = `jobbie-zivotopis-${first}-${last}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', (0, cv_document_utils_1.buildInlineContentDisposition)(filename));
        res.status(common_1.HttpStatus.OK).send(bytes);
    }
    /** Temporary HTML preview for template/CSS work (paginated preview layout, not PDF). */
    async previewDocumentHtmlOne(user, cvId, body, res) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.assertCvOwned(user.id, cvId);
        const exportData = (0, cv_document_export_parse_1.isCvDocumentPreviewExportPayload)(body)
            ? (0, cv_document_export_parse_1.parseCvDocumentExportPayload)(body)
            : await this.resolvePreviewExportData(cvId, user.id);
        const { previewHtml } = await this.documentPaginate.buildPreviewHtml(exportData);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(common_1.HttpStatus.OK).send(previewHtml);
    }
    async resolvePreviewExportData(cvId, userId) {
        const aggregate = await this.cv.getAggregateByCvId(cvId, userId);
        if (!aggregate) {
            throw new common_1.NotFoundException('CV nebolo nájdené.');
        }
        return this.cvPdf.buildExportData(aggregate);
    }
    async uploadPhotoOne(user, cvId, body, file) {
        await this.cv.assertWorkerRole(user.id);
        return this.resolvePhotoUpload(user.id, cvId, body, file);
    }
    async deletePhotoOne(user, cvId) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.deletePhoto(user.id, cvId);
    }
    async addExperienceMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addExperience(user.id, cvId, body);
    }
    async reorderExperienceMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'experience', body.ids);
        return OK;
    }
    async updateExperienceMe(user, id, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.updateExperience(user.id, cvId, id, body);
    }
    async deleteExperienceMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'experience', id);
        return OK;
    }
    async addEducationMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addEducation(user.id, cvId, body);
    }
    async reorderEducationMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'education', body.ids);
        return OK;
    }
    async updateEducationMe(user, id, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.updateEducation(user.id, cvId, id, body);
    }
    async deleteEducationMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'education', id);
        return OK;
    }
    async addSkillMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addSkill(user.id, cvId, body);
    }
    async reorderSkillsMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'skills', body.ids);
        return OK;
    }
    async deleteSkillMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'skills', id);
        return OK;
    }
    async addSoftSkillMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addSoftSkill(user.id, cvId, body);
    }
    async reorderSoftSkillsMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'soft_skills', body.ids);
        return OK;
    }
    async deleteSoftSkillMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'soft_skills', id);
        return OK;
    }
    async addLanguageMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addLanguage(user.id, cvId, body);
    }
    async reorderLanguagesMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'languages', body.ids);
        return OK;
    }
    async updateLanguageMe(user, id, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.updateLanguage(user.id, cvId, id, body);
    }
    async deleteLanguageMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'languages', id);
        return OK;
    }
    async addCertificationMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addCertification(user.id, cvId, body);
    }
    async reorderCertificationsMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'certifications', body.ids);
        return OK;
    }
    async updateCertificationMe(user, id, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.updateCertification(user.id, cvId, id, body);
    }
    async deleteCertificationMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'certifications', id);
        return OK;
    }
    async addLinkMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addLink(user.id, cvId, body);
    }
    async reorderLinksMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'links', body.ids);
        return OK;
    }
    async updateLinkMe(user, id, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.updateLink(user.id, cvId, id, body);
    }
    async deleteLinkMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'links', id);
        return OK;
    }
    async addVolunteeringMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addVolunteering(user.id, cvId, body);
    }
    async reorderVolunteeringMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'volunteering', body.ids);
        return OK;
    }
    async updateVolunteeringMe(user, id, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.updateVolunteering(user.id, cvId, id, body);
    }
    async deleteVolunteeringMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'volunteering', id);
        return OK;
    }
    async addPortfolioLinkMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addPortfolioLink(user.id, cvId, body);
    }
    async reorderPortfolioLinksMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'portfolio_links', body.ids);
        return OK;
    }
    async updatePortfolioLinkMe(user, id, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.updatePortfolioLink(user.id, cvId, id, body);
    }
    async deletePortfolioLinkMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'portfolio_links', id);
        return OK;
    }
    async addAwardMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addAward(user.id, cvId, body);
    }
    async reorderAwardsMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'awards', body.ids);
        return OK;
    }
    async updateAwardMe(user, id, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.updateAward(user.id, cvId, id, body);
    }
    async deleteAwardMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'awards', id);
        return OK;
    }
    async addReferenceMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.addReference(user.id, cvId, body);
    }
    async reorderReferencesMe(user, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.reorderSection(user.id, cvId, 'references', body.ids);
        return OK;
    }
    async updateReferenceMe(user, id, body) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        return this.cv.updateReference(user.id, cvId, id, body);
    }
    async deleteReferenceMe(user, id) {
        await this.cv.assertWorkerRole(user.id);
        const cvId = await this.defaultCvId(user);
        await this.cv.deleteChildRow(user.id, cvId, 'references', id);
        return OK;
    }
};
exports.CvController = CvController;
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "listMine", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.CvCreateDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "createCv", null);
__decorate([
    (0, common_1.Get)('by-user/:userId'),
    (0, common_1.UseGuards)(optional_jwks_auth_guard_1.OptionalJwksAuthGuard),
    __param(0, (0, common_1.Param)('userId', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "getPublicByUser", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "getMine", null);
__decorate([
    (0, common_1.Patch)('me'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.CvHeaderPatchDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "patchMine", null);
__decorate([
    (0, common_1.Patch)('me/progress'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.CvProgressPatchDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "patchProgress", null);
__decorate([
    (0, common_1.Post)('me/photo'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        fileIsRequired: false,
        validators: [new common_1.MaxFileSizeValidator({ maxSize: upload_policy_1.CV_PHOTO_MAX_BYTES })],
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.CvPhotoUpsertDto, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "uploadPhotoMe", null);
__decorate([
    (0, common_1.Delete)('me/photo'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deletePhotoMe", null);
__decorate([
    (0, common_1.Post)('me/pdf'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "exportPdfMe", null);
__decorate([
    (0, common_1.Get)(':cvId'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "getOneMine", null);
__decorate([
    (0, common_1.Patch)(':cvId'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.CvHeaderPatchDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "patchOne", null);
__decorate([
    (0, common_1.Patch)(':cvId/progress'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.CvProgressPatchDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "patchOneProgress", null);
__decorate([
    (0, common_1.Delete)(':cvId'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteOne", null);
__decorate([
    (0, common_1.Post)(':cvId/pdf/render'),
    (0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60_000 } }),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "exportPdfRenderOne", null);
__decorate([
    (0, common_1.Post)(':cvId/document/preview'),
    (0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60_000 } }),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "previewDocumentOne", null);
__decorate([
    (0, common_1.Post)(':cvId/document/preview-html'),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "previewDocumentHtmlOne", null);
__decorate([
    (0, common_1.Get)(':cvId/pdf'),
    (0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60_000 } }),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "exportPdfOneGet", null);
__decorate([
    (0, common_1.Post)(':cvId/pdf'),
    (0, throttler_1.Throttle)({ default: { limit: 15, ttl: 60_000 } }),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "exportPdfOne", null);
__decorate([
    (0, common_1.Post)(':cvId/photo'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        fileIsRequired: false,
        validators: [new common_1.MaxFileSizeValidator({ maxSize: upload_policy_1.CV_PHOTO_MAX_BYTES })],
    }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.CvPhotoUpsertDto, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "uploadPhotoOne", null);
__decorate([
    (0, common_1.Delete)(':cvId/photo'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deletePhotoOne", null);
__decorate([
    (0, common_1.Post)('me/experience'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ExperienceUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addExperienceMe", null);
__decorate([
    (0, common_1.Patch)('me/experience/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderExperienceMe", null);
__decorate([
    (0, common_1.Patch)('me/experience/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ExperienceUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "updateExperienceMe", null);
__decorate([
    (0, common_1.Delete)('me/experience/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteExperienceMe", null);
__decorate([
    (0, common_1.Post)('me/education'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.EducationUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addEducationMe", null);
__decorate([
    (0, common_1.Patch)('me/education/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderEducationMe", null);
__decorate([
    (0, common_1.Patch)('me/education/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.EducationUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "updateEducationMe", null);
__decorate([
    (0, common_1.Delete)('me/education/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteEducationMe", null);
__decorate([
    (0, common_1.Post)('me/skills'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.SkillUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addSkillMe", null);
__decorate([
    (0, common_1.Patch)('me/skills/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderSkillsMe", null);
__decorate([
    (0, common_1.Delete)('me/skills/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteSkillMe", null);
__decorate([
    (0, common_1.Post)('me/soft-skills'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.SoftSkillUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addSoftSkillMe", null);
__decorate([
    (0, common_1.Patch)('me/soft-skills/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderSoftSkillsMe", null);
__decorate([
    (0, common_1.Delete)('me/soft-skills/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteSoftSkillMe", null);
__decorate([
    (0, common_1.Post)('me/languages'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.LanguageUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addLanguageMe", null);
__decorate([
    (0, common_1.Patch)('me/languages/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderLanguagesMe", null);
__decorate([
    (0, common_1.Patch)('me/languages/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.LanguageUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "updateLanguageMe", null);
__decorate([
    (0, common_1.Delete)('me/languages/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteLanguageMe", null);
__decorate([
    (0, common_1.Post)('me/certifications'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.CertificationUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addCertificationMe", null);
__decorate([
    (0, common_1.Patch)('me/certifications/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderCertificationsMe", null);
__decorate([
    (0, common_1.Patch)('me/certifications/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.CertificationUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "updateCertificationMe", null);
__decorate([
    (0, common_1.Delete)('me/certifications/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteCertificationMe", null);
__decorate([
    (0, common_1.Post)('me/links'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.LinkUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addLinkMe", null);
__decorate([
    (0, common_1.Patch)('me/links/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderLinksMe", null);
__decorate([
    (0, common_1.Patch)('me/links/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.LinkUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "updateLinkMe", null);
__decorate([
    (0, common_1.Delete)('me/links/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteLinkMe", null);
__decorate([
    (0, common_1.Post)('me/volunteering'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.VolunteeringUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addVolunteeringMe", null);
__decorate([
    (0, common_1.Patch)('me/volunteering/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderVolunteeringMe", null);
__decorate([
    (0, common_1.Patch)('me/volunteering/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.VolunteeringUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "updateVolunteeringMe", null);
__decorate([
    (0, common_1.Delete)('me/volunteering/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteVolunteeringMe", null);
__decorate([
    (0, common_1.Post)('me/portfolio-links'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.PortfolioLinkUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addPortfolioLinkMe", null);
__decorate([
    (0, common_1.Patch)('me/portfolio-links/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderPortfolioLinksMe", null);
__decorate([
    (0, common_1.Patch)('me/portfolio-links/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.PortfolioLinkUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "updatePortfolioLinkMe", null);
__decorate([
    (0, common_1.Delete)('me/portfolio-links/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deletePortfolioLinkMe", null);
__decorate([
    (0, common_1.Post)('me/awards'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.AwardUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addAwardMe", null);
__decorate([
    (0, common_1.Patch)('me/awards/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderAwardsMe", null);
__decorate([
    (0, common_1.Patch)('me/awards/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.AwardUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "updateAwardMe", null);
__decorate([
    (0, common_1.Delete)('me/awards/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteAwardMe", null);
__decorate([
    (0, common_1.Post)('me/references'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReferenceUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "addReferenceMe", null);
__decorate([
    (0, common_1.Patch)('me/references/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "reorderReferencesMe", null);
__decorate([
    (0, common_1.Patch)('me/references/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReferenceUpsertDto]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "updateReferenceMe", null);
__decorate([
    (0, common_1.Delete)('me/references/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "deleteReferenceMe", null);
exports.CvController = CvController = __decorate([
    (0, common_1.Controller)('cv'),
    __metadata("design:paramtypes", [cv_service_1.CvService, cv_pdf_service_1.CvPdfService, cv_document_paginate_service_1.CvDocumentPaginateService])
], CvController);
//# sourceMappingURL=cv.controller.js.map