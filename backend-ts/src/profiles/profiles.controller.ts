import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfileResponseDto, ProfileUpdateDto } from './profiles.dto';

const PROFILE_COLUMNS =
  'id,role,display_name,company_name,first_name,last_name,registered_office,' +
  'tax_id,vat_id,avatar_url,bio,education,skills,job_interests,location,' +
  'description,sector,experience,registration_number,website,logo_url,credits';

@Controller('profiles')
@UseGuards(JwksAuthGuard)
export class ProfilesController {
  private readonly logger = new Logger(ProfilesController.name);

  constructor(private supabase: SupabaseService) {}

  @Get('me')
  async getMe(@CurrentUserDecorator() user: CurrentUser): Promise<ProfileResponseDto> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .single();
    if (!error && data) {
      return data as unknown as ProfileResponseDto;
    }
    this.logger.warn(
      `Profile select failed for user ${user.id}: code=${(error as { code?: string })?.code} message=${(error as { message?: string })?.message}`,
    );
    const { data: created, error: insertError } = await this.supabase
      .getClient()
      .from('profiles')
      .insert({
        id: user.id,
        role: user.role,
        credits: 0,
      })
      .select(PROFILE_COLUMNS)
      .single();
    if (!insertError && created) {
      return created as unknown as ProfileResponseDto;
    }
    const { data: retry } = await this.supabase
      .getClient()
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .single();
    if (retry) return retry as unknown as ProfileResponseDto;
    throw new NotFoundException(
      `Profil nebol nájdený. (user id: ${user.id})`,
    );
  }

  @Patch('me')
  async patchMe(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ProfileUpdateDto,
  ): Promise<ProfileResponseDto> {
    const payload = body as Record<string, unknown>;
    const keys = Object.keys(payload).filter(
      (k) => payload[k] !== undefined && k !== 'credits',
    );
    if (keys.length === 0) {
      const { data, error } = await this.supabase
        .getClient()
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', user.id)
        .single();
      if (error || !data) {
        throw new NotFoundException(
          `Profil nebol nájdený. (user id: ${user.id})`,
        );
      }
      return data as unknown as ProfileResponseDto;
    }
    const update: Record<string, unknown> = {};
    for (const k of keys) update[k] = payload[k];
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .update(update)
      .eq('id', user.id)
      .select(PROFILE_COLUMNS)
      .single();
    if (error || !data) {
      this.logger.warn(
        `Profile update failed for user ${user.id}: code=${(error as { code?: string })?.code} message=${(error as { message?: string })?.message}`,
      );
      const { data: fallback } = await this.supabase
        .getClient()
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', user.id)
        .single();
      if (fallback) return fallback as unknown as ProfileResponseDto;
      throw new NotFoundException(
        `Profil nebol nájdený. (user id: ${user.id})`,
      );
    }
    return data as unknown as ProfileResponseDto;
  }
}
