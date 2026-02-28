import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { ProfileResponseDto, ProfileUpdateDto } from './profiles.dto';

const PROFILE_COLUMNS =
  'id,role,display_name,company_name,avatar_url,bio,education,skills,' +
  'job_interests,location,description,sector';

@Controller('profiles')
@UseGuards(JwksAuthGuard)
export class ProfilesController {
  constructor(private supabase: SupabaseService) {}

  @Get('me')
  async getMe(@CurrentUserDecorator() user: CurrentUser): Promise<ProfileResponseDto> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', user.id)
      .single();
    if (error || !data) {
      throw new NotFoundException('Profil nebol nájdený.');
    }
    return data as unknown as ProfileResponseDto;
  }

  @Patch('me')
  async patchMe(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ProfileUpdateDto,
  ): Promise<ProfileResponseDto> {
    const payload = body as Record<string, unknown>;
    const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);
    if (keys.length === 0) {
      const { data, error } = await this.supabase
        .getClient()
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', user.id)
        .single();
      if (error || !data) {
        throw new NotFoundException('Profil nebol nájdený.');
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
      throw new NotFoundException('Profil nebol nájdený.');
    }
    return data as unknown as ProfileResponseDto;
  }
}
