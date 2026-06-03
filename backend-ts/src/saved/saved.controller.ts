import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Body,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import { SavedService } from './saved.service';
import type {
  SavedCompanyIdsResponseDto,
  SavedCompanyItemDto,
} from './saved.dto';
import { SaveCompanyBodyDto } from './saved.dto';

@Controller('saved')
export class SavedController {
  constructor(private saved: SavedService) {}

  @Get('companies/ids')
  @UseGuards(JwksAuthGuard)
  async listCompanyIds(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<SavedCompanyIdsResponseDto> {
    const company_ids = await this.saved.listSavedCompanyIds(user.id);
    return { company_ids };
  }

  @Get('companies')
  @UseGuards(JwksAuthGuard)
  async listCompanies(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<SavedCompanyItemDto[]> {
    return this.saved.listSavedCompanies(user.id);
  }

  @Post('companies')
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async saveCompany(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: SaveCompanyBodyDto,
  ): Promise<{ ok: boolean }> {
    await this.saved.saveCompany(user.id, body.company_id);
    return { ok: true };
  }

  @Delete('companies/:company_id')
  @UseGuards(JwksAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unsaveCompany(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('company_id', ParseUUIDPipe) companyId: string,
  ): Promise<{ ok: boolean }> {
    await this.saved.unsaveCompany(user.id, companyId);
    return { ok: true };
  }
}
