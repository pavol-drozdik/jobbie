import {

  Body,

  Controller,

  ForbiddenException,

  Get,

  Param,

  ParseUUIDPipe,

  Post,

  Query,

  Res,

  UseGuards,

} from '@nestjs/common';

import type { Response } from 'express';

import { JwksAuthGuard } from '../auth/jwks-auth.guard';

import { CurrentUserDecorator } from '../auth/current-user.decorator';

import { CurrentUser, UserRole } from '../auth/auth.types';

import { EmployerCvDatabaseService } from './employer-cv-database.service';

import { CvDatabaseQuotaService } from '../billing/cv-database-quota.service';

import { SupabaseService } from '../supabase/supabase.service';

import { CvService } from '../cv/cv.service';

import { CvPdfService } from '../cv/cv-pdf.service';

import {

  EmployerCvDatabaseOpenChatBodyDto,

  EmployerCvDatabaseQueryDto,

} from './employer-cv-database.dto';



// SECURITY: Company role only; contact/unlock rules enforced in EmployerCvDatabaseService.

@Controller('employer')

@UseGuards(JwksAuthGuard)

export class EmployerCvDatabaseController {

  constructor(

    private readonly cvDatabase: EmployerCvDatabaseService,

    private readonly cvQuota: CvDatabaseQuotaService,

    private readonly supabase: SupabaseService,

    private readonly cvService: CvService,

    private readonly cvPdf: CvPdfService,

  ) {}



  private assertCompany(user: CurrentUser): void {

    if (user.role !== UserRole.company) {

      throw new ForbiddenException('Len účty zamestnávateľa môžu používať databázu životopisov');

    }

  }



  @Get('cv-database')

  async list(

    @CurrentUserDecorator() user: CurrentUser,

    @Query() query: EmployerCvDatabaseQueryDto,

  ) {

    this.assertCompany(user);

    return this.cvDatabase.list(user.id, query);

  }



  @Get('cv-database/:cvId')

  async detail(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('cvId', ParseUUIDPipe) cvId: string,

  ) {

    this.assertCompany(user);

    await this.cvQuota.consumeIncludedPdfAccess(user.id, cvId);

    return this.cvDatabase.getDetail(user.id, cvId);

  }



  @Post('cv-database/:cvId/unlock')

  async unlock(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('cvId', ParseUUIDPipe) cvId: string,

  ) {

    this.assertCompany(user);

    // SECURITY: Verify the CV is actually eligible for the employer database
    // BEFORE consuming quota / inserting an unlock row. Without this guard a
    // company can burn their monthly unlock budget on arbitrary UUIDs and
    // pollute cv_contact_unlocks with rows for CVs that don't exist or are
    // hidden — also a soft DoS against legitimate visibility checks.
    const eligible = await this.cvService.isCvEligibleForEmployerDatabase(cvId);

    if (!eligible) {

      throw new ForbiddenException('CV nie je dostupný na odomknutie.');

    }

    const client = this.supabase.getClient();

    const { data: existing } = await client

      .from('cv_contact_unlocks')

      .select('id')

      .eq('company_id', user.id)

      .eq('cv_id', cvId)

      .maybeSingle();

    if (existing) {

      return { unlocked: true, already_unlocked: true };

    }



    await this.cvQuota.consumeIncludedQuota(user.id, 'unlock');

    const { error: unlockErr } = await client.from('cv_contact_unlocks').insert({

      company_id: user.id,

      cv_id: cvId,

    });

    if (unlockErr) {

      throw new ForbiddenException('Nepodarilo sa odomknúť kontakt.');

    }

    return { unlocked: true, already_unlocked: false };

  }



  @Post('cv-database/:cvId/open-chat')

  async openChat(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('cvId', ParseUUIDPipe) cvId: string,

    @Body() body: EmployerCvDatabaseOpenChatBodyDto,

  ) {

    this.assertCompany(user);

    await this.cvQuota.consumeIncludedQuota(user.id, 'contact');

    return this.cvDatabase.openChat(user.id, cvId, {

      application_id: body.application_id,

    });

  }



  @Get('cv-database/:cvId/pdf')

  async downloadPdf(

    @CurrentUserDecorator() user: CurrentUser,

    @Param('cvId', ParseUUIDPipe) cvId: string,

    @Res() res: Response,

  ): Promise<void> {

    this.assertCompany(user);

    await this.cvQuota.consumeIncludedPdfAccess(user.id, cvId);



    const agg = await this.cvService.getEmployerAggregateByCvId(user.id, cvId);

    if (!agg) {

      throw new ForbiddenException('Životopis sa nenašiel alebo nie je dostupný');

    }



    const buffer = await this.cvPdf.render(agg);

    const title =

      (agg.cv.display_title as string | undefined)?.trim() ||

      (agg.cv.cv_title as string | undefined)?.trim() ||

      'zivotopis';

    const safeName = title

      .replace(/[^\w\s-]/g, '')

      .trim()

      .replace(/\s+/g, '-')

      .slice(0, 60) || 'zivotopis';



    res.setHeader('Content-Type', 'application/pdf');

    res.setHeader(

      'Content-Disposition',

      `attachment; filename="jobbie-${safeName}.pdf"`,

    );

    res.send(buffer);

  }

}

