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
exports.CvScopedSectionsController = void 0;
const common_1 = require("@nestjs/common");
const jwks_auth_guard_1 = require("../auth/jwks-auth.guard");
const current_user_decorator_1 = require("../auth/current-user.decorator");
const cv_service_1 = require("./cv.service");
const cv_dto_1 = require("./cv.dto");
const OK = { ok: true };
let CvScopedSectionsController = class CvScopedSectionsController {
    constructor(cv) {
        this.cv = cv;
    }
    async addExperience(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addExperience(user.id, cvId, body);
    }
    async reorderExperience(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'experience', body.ids);
        return OK;
    }
    async updateExperience(user, cvId, id, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.updateExperience(user.id, cvId, id, body);
    }
    async deleteExperience(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'experience', id);
        return OK;
    }
    async addEducation(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addEducation(user.id, cvId, body);
    }
    async reorderEducation(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'education', body.ids);
        return OK;
    }
    async updateEducation(user, cvId, id, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.updateEducation(user.id, cvId, id, body);
    }
    async deleteEducation(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'education', id);
        return OK;
    }
    async addSkill(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addSkill(user.id, cvId, body);
    }
    async reorderSkills(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'skills', body.ids);
        return OK;
    }
    async updateSkill(user, cvId, id, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.updateSkill(user.id, cvId, id, body);
    }
    async deleteSkill(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'skills', id);
        return OK;
    }
    async addSoftSkill(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addSoftSkill(user.id, cvId, body);
    }
    async reorderSoftSkills(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'soft_skills', body.ids);
        return OK;
    }
    async deleteSoftSkill(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'soft_skills', id);
        return OK;
    }
    async addLanguage(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addLanguage(user.id, cvId, body);
    }
    async reorderLanguages(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'languages', body.ids);
        return OK;
    }
    async updateLanguage(user, cvId, id, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.updateLanguage(user.id, cvId, id, body);
    }
    async deleteLanguage(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'languages', id);
        return OK;
    }
    async addCertification(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addCertification(user.id, cvId, body);
    }
    async reorderCertifications(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'certifications', body.ids);
        return OK;
    }
    async updateCertification(user, cvId, id, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.updateCertification(user.id, cvId, id, body);
    }
    async deleteCertification(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'certifications', id);
        return OK;
    }
    async addLink(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addLink(user.id, cvId, body);
    }
    async reorderLinks(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'links', body.ids);
        return OK;
    }
    async updateLink(user, cvId, id, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.updateLink(user.id, cvId, id, body);
    }
    async deleteLink(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'links', id);
        return OK;
    }
    async addVolunteering(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addVolunteering(user.id, cvId, body);
    }
    async reorderVolunteering(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'volunteering', body.ids);
        return OK;
    }
    async updateVolunteering(user, cvId, id, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.updateVolunteering(user.id, cvId, id, body);
    }
    async deleteVolunteering(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'volunteering', id);
        return OK;
    }
    async addPortfolioLink(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addPortfolioLink(user.id, cvId, body);
    }
    async reorderPortfolioLinks(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'portfolio_links', body.ids);
        return OK;
    }
    async updatePortfolioLink(user, cvId, id, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.updatePortfolioLink(user.id, cvId, id, body);
    }
    async deletePortfolioLink(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'portfolio_links', id);
        return OK;
    }
    async addAward(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addAward(user.id, cvId, body);
    }
    async reorderAwards(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'awards', body.ids);
        return OK;
    }
    async updateAward(user, cvId, id, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.updateAward(user.id, cvId, id, body);
    }
    async deleteAward(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'awards', id);
        return OK;
    }
    async addReference(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.addReference(user.id, cvId, body);
    }
    async reorderReferences(user, cvId, body) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.reorderSection(user.id, cvId, 'references', body.ids);
        return OK;
    }
    async updateReference(user, cvId, id, body) {
        await this.cv.assertWorkerRole(user.id);
        return this.cv.updateReference(user.id, cvId, id, body);
    }
    async deleteReference(user, cvId, id) {
        await this.cv.assertWorkerRole(user.id);
        await this.cv.deleteChildRow(user.id, cvId, 'references', id);
        return OK;
    }
};
exports.CvScopedSectionsController = CvScopedSectionsController;
__decorate([
    (0, common_1.Post)(':cvId/experience'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ExperienceUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addExperience", null);
__decorate([
    (0, common_1.Patch)(':cvId/experience/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderExperience", null);
__decorate([
    (0, common_1.Patch)(':cvId/experience/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, cv_dto_1.ExperienceUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "updateExperience", null);
__decorate([
    (0, common_1.Delete)(':cvId/experience/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deleteExperience", null);
__decorate([
    (0, common_1.Post)(':cvId/education'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.EducationUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addEducation", null);
__decorate([
    (0, common_1.Patch)(':cvId/education/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderEducation", null);
__decorate([
    (0, common_1.Patch)(':cvId/education/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, cv_dto_1.EducationUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "updateEducation", null);
__decorate([
    (0, common_1.Delete)(':cvId/education/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deleteEducation", null);
__decorate([
    (0, common_1.Post)(':cvId/skills'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.SkillUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addSkill", null);
__decorate([
    (0, common_1.Patch)(':cvId/skills/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderSkills", null);
__decorate([
    (0, common_1.Patch)(':cvId/skills/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, cv_dto_1.SkillUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "updateSkill", null);
__decorate([
    (0, common_1.Delete)(':cvId/skills/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deleteSkill", null);
__decorate([
    (0, common_1.Post)(':cvId/soft-skills'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.SoftSkillUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addSoftSkill", null);
__decorate([
    (0, common_1.Patch)(':cvId/soft-skills/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderSoftSkills", null);
__decorate([
    (0, common_1.Delete)(':cvId/soft-skills/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deleteSoftSkill", null);
__decorate([
    (0, common_1.Post)(':cvId/languages'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.LanguageUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addLanguage", null);
__decorate([
    (0, common_1.Patch)(':cvId/languages/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderLanguages", null);
__decorate([
    (0, common_1.Patch)(':cvId/languages/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, cv_dto_1.LanguageUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "updateLanguage", null);
__decorate([
    (0, common_1.Delete)(':cvId/languages/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deleteLanguage", null);
__decorate([
    (0, common_1.Post)(':cvId/certifications'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.CertificationUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addCertification", null);
__decorate([
    (0, common_1.Patch)(':cvId/certifications/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderCertifications", null);
__decorate([
    (0, common_1.Patch)(':cvId/certifications/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, cv_dto_1.CertificationUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "updateCertification", null);
__decorate([
    (0, common_1.Delete)(':cvId/certifications/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deleteCertification", null);
__decorate([
    (0, common_1.Post)(':cvId/links'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.LinkUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addLink", null);
__decorate([
    (0, common_1.Patch)(':cvId/links/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderLinks", null);
__decorate([
    (0, common_1.Patch)(':cvId/links/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, cv_dto_1.LinkUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "updateLink", null);
__decorate([
    (0, common_1.Delete)(':cvId/links/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deleteLink", null);
__decorate([
    (0, common_1.Post)(':cvId/volunteering'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.VolunteeringUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addVolunteering", null);
__decorate([
    (0, common_1.Patch)(':cvId/volunteering/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderVolunteering", null);
__decorate([
    (0, common_1.Patch)(':cvId/volunteering/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, cv_dto_1.VolunteeringUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "updateVolunteering", null);
__decorate([
    (0, common_1.Delete)(':cvId/volunteering/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deleteVolunteering", null);
__decorate([
    (0, common_1.Post)(':cvId/portfolio-links'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.PortfolioLinkUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addPortfolioLink", null);
__decorate([
    (0, common_1.Patch)(':cvId/portfolio-links/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderPortfolioLinks", null);
__decorate([
    (0, common_1.Patch)(':cvId/portfolio-links/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, cv_dto_1.PortfolioLinkUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "updatePortfolioLink", null);
__decorate([
    (0, common_1.Delete)(':cvId/portfolio-links/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deletePortfolioLink", null);
__decorate([
    (0, common_1.Post)(':cvId/awards'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.AwardUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addAward", null);
__decorate([
    (0, common_1.Patch)(':cvId/awards/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderAwards", null);
__decorate([
    (0, common_1.Patch)(':cvId/awards/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, cv_dto_1.AwardUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "updateAward", null);
__decorate([
    (0, common_1.Delete)(':cvId/awards/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deleteAward", null);
__decorate([
    (0, common_1.Post)(':cvId/references'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReferenceUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "addReference", null);
__decorate([
    (0, common_1.Patch)(':cvId/references/order'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, cv_dto_1.ReorderDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "reorderReferences", null);
__decorate([
    (0, common_1.Patch)(':cvId/references/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, cv_dto_1.ReferenceUpsertDto]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "updateReference", null);
__decorate([
    (0, common_1.Delete)(':cvId/references/:id'),
    (0, common_1.UseGuards)(jwks_auth_guard_1.JwksAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_1.CurrentUserDecorator)()),
    __param(1, (0, common_1.Param)('cvId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], CvScopedSectionsController.prototype, "deleteReference", null);
exports.CvScopedSectionsController = CvScopedSectionsController = __decorate([
    (0, common_1.Controller)('cv'),
    __metadata("design:paramtypes", [cv_service_1.CvService])
], CvScopedSectionsController);
//# sourceMappingURL=cv-scoped-sections.controller.js.map