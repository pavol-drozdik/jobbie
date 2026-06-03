import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import type { CurrentUser } from '../auth/auth.types';
import {
  CreateSavedSearchDto,
  SavedSearchResponseDto,
  UpdateSavedSearchDto,
} from './saved-searches.dto';
import { SavedSearchesService } from './saved-searches.service';

@Controller('saved-searches')
@UseGuards(JwksAuthGuard)
export class SavedSearchesController {
  constructor(private readonly savedSearches: SavedSearchesService) {}

  @Get()
  async list(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<SavedSearchResponseDto[]> {
    return this.savedSearches.listForUser(user.id);
  }

  @Post()
  async create(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: CreateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    return this.savedSearches.create(user.id, body);
  }

  @Patch(':id')
  async update(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
    @Body() body: UpdateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    return this.savedSearches.update(user.id, id, body);
  }

  @Delete(':id')
  async remove(
    @CurrentUserDecorator() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<{ ok: boolean }> {
    return this.savedSearches.remove(user.id, id);
  }
}
