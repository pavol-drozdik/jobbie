import {

  Controller,

  Get,

  Patch,

  Put,

  Body,

  Param,

  Query,

  Res,

  ParseUUIDPipe,

} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import type { Response } from 'express';

import { CurrentUserDecorator } from '../auth/current-user.decorator';

import { CurrentUser } from '../auth/auth.types';

import { EmployerApplicantsService } from './employer-applicants.service';

import {

  EmployerApplicantStatusPatchDto,

  EmployerApplicantsBulkStatusDto,

  EmployerApplicantsQueryDto,

  EmployerApplicationNoteDto,

  EmployerJobReplySettingsDto,

  EmployerJobsHubQueryDto,

  EmployerMessageTemplateUpsertDto,

} from './employer-applicants.dto';



/** Auth: {@link GlobalAuthGuard} (BFF cookies + Bearer). Do not add JwksAuthGuard — exports use cookie fetch. */
@Controller('employer')
export class EmployerApplicantsController {

  constructor(private readonly employerApplicants: EmployerApplicantsService) {}



  @Get('jobs')

  async listCompanyJobs(

    @CurrentUserDecorator() user: CurrentUser,

    @Query() query: EmployerJobsHubQueryDto,

  ) {

    return this.employerApplicants.listCompanyJobs(user.id, query);

  }



  @Get('jobs/:jobId/applicants')

  async listApplicants(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('jobId', ParseUUIDPipe) jobId: string,

    @Query() query: EmployerApplicantsQueryDto,

  ) {

    return this.employerApplicants.listApplicants(jobId, user.id, query);

  }



  @Get('jobs/:jobId/applicants/print')

  async printApplicants(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('jobId', ParseUUIDPipe) jobId: string,

    @Query() query: EmployerApplicantsQueryDto,

    @Query('ids') ids?: string,

  ) {

    const idList = ids

      ? ids

          .split(',')

          .map((s) => s.trim())

          .filter(Boolean)

      : undefined;

    return this.employerApplicants.getPrintList(jobId, user.id, query, idList);

  }



  @Get('jobs/:jobId/applicants/export')

  async exportApplicants(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('jobId', ParseUUIDPipe) jobId: string,

    @Query() query: EmployerApplicantsQueryDto,

    @Res() res: Response,

    @Query('ids') ids?: string,

  ): Promise<void> {

    const idList = ids

      ? ids

          .split(',')

          .map((s) => s.trim())

          .filter(Boolean)

      : undefined;

    const { buffer, filename } = await this.employerApplicants.exportInvitedPdf(

      jobId,

      user.id,

      query,

      idList,

    );

    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(buffer);

  }



  @Get('jobs/:jobId/applicants/export/excel')

  async exportApplicantsExcel(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('jobId', ParseUUIDPipe) jobId: string,

    @Query() query: EmployerApplicantsQueryDto,

    @Res() res: Response,

    @Query('ids') ids?: string,

  ): Promise<void> {

    const idList = ids

      ? ids

          .split(',')

          .map((s) => s.trim())

          .filter(Boolean)

      : undefined;

    const { buffer, filename } = await this.employerApplicants.exportApplicantsExcel(

      jobId,

      user.id,

      query,

      idList,

    );

    res.setHeader(

      'Content-Type',

      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    );

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(buffer);

  }



  @Get('jobs/:jobId/applicants/export/cvs')

  async exportApplicantsCvs(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('jobId', ParseUUIDPipe) jobId: string,

    @Query() query: EmployerApplicantsQueryDto,

    @Res() res: Response,

    @Query('ids') ids?: string,

  ): Promise<void> {

    const idList = ids

      ? ids

          .split(',')

          .map((s) => s.trim())

          .filter(Boolean)

      : undefined;

    const { buffer, filename } = await this.employerApplicants.exportApplicantsCvsZip(

      jobId,

      user.id,

      query,

      idList,

    );

    res.setHeader('Content-Type', 'application/zip');

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(buffer);

  }



  @Get('jobs/:jobId/reply-settings')

  async getReplySettings(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('jobId', ParseUUIDPipe) jobId: string,

  ) {

    return this.employerApplicants.getReplySettings(jobId, user.id);

  }



  @Put('jobs/:jobId/reply-settings')

  async saveReplySettings(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('jobId', ParseUUIDPipe) jobId: string,

    @Body() body: EmployerJobReplySettingsDto,

  ) {

    return this.employerApplicants.saveReplySettings(jobId, user.id, body);

  }



  @Get('applications/:applicationId')

  async getApplicationDetail(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('applicationId', ParseUUIDPipe) applicationId: string,

  ) {

    return this.employerApplicants.getApplicationDetail(applicationId, user.id);

  }



  @Get('applications/:applicationId/cv/pdf')

  @Throttle({ default: { limit: 30, ttl: 60000 } })

  async downloadApplicantCvPdf(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('applicationId', ParseUUIDPipe) applicationId: string,

    @Res() res: Response,

  ): Promise<void> {

    const { buffer, filename } = await this.employerApplicants.exportApplicantCvPdf(

      applicationId,

      user.id,

    );

    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    res.send(buffer);

  }



  @Patch('applications/:applicationId/status')

  @Throttle({ default: { limit: 60, ttl: 60000 } })

  async patchStatus(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('applicationId', ParseUUIDPipe) applicationId: string,

    @Body() body: EmployerApplicantStatusPatchDto,

  ) {

    return this.employerApplicants.setApplicationStatus(

      applicationId,

      user.id,

      body.status,

      {

        send_auto_reply: body.send_auto_reply,

        force_resend: body.force_resend,

        note: body.note,

      },

    );

  }



  @Patch('applications/bulk-status')

  @Throttle({ default: { limit: 20, ttl: 60000 } })

  async bulkPatchStatus(

    @CurrentUserDecorator() user: CurrentUser,

    @Body() body: EmployerApplicantsBulkStatusDto,

  ) {

    return this.employerApplicants.bulkSetApplicationStatus(user.id, body);

  }



  @Put('applications/:applicationId/note')

  async upsertNote(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('applicationId', ParseUUIDPipe) applicationId: string,

    @Body() body: EmployerApplicationNoteDto,

  ) {

    return this.employerApplicants.upsertNote(applicationId, user.id, body.note);

  }



  @Get('applicant-message-templates')

  async listTemplates(@CurrentUserDecorator() user: CurrentUser) {

    return this.employerApplicants.listMessageTemplates(user.id);

  }



  @Put('applicant-message-templates')

  async upsertTemplate(

    @CurrentUserDecorator() user: CurrentUser,

    @Body() body: EmployerMessageTemplateUpsertDto,

  ) {

    return this.employerApplicants.upsertMessageTemplate(user.id, body);

  }

}


