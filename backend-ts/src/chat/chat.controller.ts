import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ChatRoomResponseDto,
  ChatMessageResponseDto,
  ChatMessageCreateDto,
} from './chat.dto';

function userCanAccessRoom(
  room: { company_id?: string; individual_id?: string },
  userId: string,
): boolean {
  return room.company_id === userId || room.individual_id === userId;
}

function getOtherUserId(
  room: { company_id?: string; individual_id?: string },
  userId: string,
): string {
  return room.company_id === userId ? String(room.individual_id) : String(room.company_id);
}

type ProfileSummary = {
  id: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  logo_url?: string | null;
};

@Controller('chat')
@UseGuards(JwksAuthGuard)
export class ChatController {
  constructor(private supabase: SupabaseService) {}

  @Post('rooms')
  async getOrCreateRoom(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('application_id') applicationId: string,
  ): Promise<ChatRoomResponseDto> {
    if (!applicationId) {
      throw new NotFoundException('application_id required');
    }
    const { data: app, error: appErr } = await this.supabase
      .getClient()
      .from('applications')
      .select('id, job_id, individual_id')
      .eq('id', applicationId)
      .single();
    if (appErr || !app) {
      throw new NotFoundException('Application not found');
    }
    const a = app as { job_id: string; individual_id: string };
    const { data: job, error: jobErr } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('company_id')
      .eq('id', a.job_id)
      .single();
    if (jobErr || !job) {
      throw new NotFoundException('Job not found');
    }
    const companyId = (job as { company_id: string }).company_id;
    if (user.id !== a.individual_id && user.id !== companyId) {
      throw new ForbiddenException('Not your application or job');
    }
    const { data: existing } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('*')
      .eq('application_id', applicationId)
      .maybeSingle();
    if (existing) {
      const room = existing as {
        id: string;
        company_id: string;
        individual_id: string;
        job_id: string;
        application_id: string;
        created_at: string;
      };
      const otherUserId = getOtherUserId(room, user.id);
      const { data: profile } = await this.supabase
        .getClient()
        .from('profiles')
        .select('id, display_name, first_name, last_name, logo_url')
        .eq('id', otherUserId)
        .single();
      const p = profile as
        | {
            id: string;
            display_name?: string | null;
            first_name?: string | null;
            last_name?: string | null;
            logo_url?: string | null;
          }
        | null;
      const nameFromProfile =
        p?.display_name ||
        [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
        null;
      return {
        ...room,
        other_user_id: otherUserId,
        other_user_name: nameFromProfile,
        other_user_avatar_url: p?.logo_url ?? null,
      };
    }
    const row = {
      job_id: a.job_id,
      company_id: companyId,
      individual_id: a.individual_id,
      application_id: applicationId,
    };
    const { data: created, error } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .insert(row)
      .select()
      .single();
    if (error || !created) {
      throw new ForbiddenException('Failed to create room');
    }
    const room = created as {
      id: string;
      company_id: string;
      individual_id: string;
      job_id: string;
      application_id: string;
      created_at: string;
    };
    const otherUserId = getOtherUserId(room, user.id);
    const { data: profile } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id, display_name, first_name, last_name, logo_url')
      .eq('id', otherUserId)
      .single();
    const p = profile as
      | {
          id: string;
          display_name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          logo_url?: string | null;
        }
      | null;
    const nameFromProfile =
      p?.display_name ||
      [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
      null;
    return {
      ...room,
      other_user_id: otherUserId,
      other_user_name: nameFromProfile,
      other_user_avatar_url: p?.logo_url ?? null,
    };
  }

  @Get('rooms')
  async listRooms(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ): Promise<ChatRoomResponseDto[]> {
    const limitNum = Math.min(Number(limit) || 50, 100);
    const offsetNum = Math.max(Number(offset) || 0, 0);
    const { data } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('*')
      .or(`company_id.eq.${user.id},individual_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .range(offsetNum, offsetNum + limitNum - 1);
    const rooms = (data ?? []) as {
      id: string;
      job_id: string;
      company_id: string;
      individual_id: string;
      application_id: string;
      created_at: string;
    }[];
    if (!rooms.length) return [];

    const otherIdsSet = new Set<string>();
    for (const room of rooms) {
      const otherId = getOtherUserId(room, user.id);
      if (otherId) otherIdsSet.add(otherId);
    }
    const otherIds = Array.from(otherIdsSet);

    let profilesById = new Map<string, ProfileSummary>();
    if (otherIds.length > 0) {
      const { data: profiles } = await this.supabase
        .getClient()
        .from('profiles')
        .select('id, display_name, first_name, last_name, logo_url')
        .in('id', otherIds);
      const rows = (profiles ?? []) as ProfileSummary[];
      profilesById = new Map(rows.map((p) => [p.id, p]));
    }

    return rooms.map((room) => {
      const otherId = getOtherUserId(room, user.id);
      const p = profilesById.get(otherId);
      const nameFromProfile =
        p?.display_name ||
        [p?.first_name, p?.last_name].filter(Boolean).join(' ') ||
        null;
      return {
        ...room,
        other_user_id: otherId,
        other_user_name: nameFromProfile,
        other_user_avatar_url: p?.logo_url ?? null,
      };
    });
  }

  @Post('messages')
  async sendMessage(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ChatMessageCreateDto,
  ): Promise<ChatMessageResponseDto> {
    const { data: room, error: roomErr } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('*')
      .eq('id', body.room_id)
      .single();
    if (roomErr || !room || !userCanAccessRoom(room as Record<string, string>, user.id)) {
      throw new NotFoundException('Room not found');
    }
    const row = {
      room_id: body.room_id,
      sender_id: user.id,
      content: body.content,
    };
    const { data: msg, error } = await this.supabase
      .getClient()
      .from('chat_messages')
      .insert(row)
      .select()
      .single();
    if (error || !msg) {
      throw new ForbiddenException('Failed to send message');
    }
    return msg as ChatMessageResponseDto;
  }

  @Get('rooms/:room_id/messages')
  async listMessages(
    @Param('room_id') roomId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
  ): Promise<ChatMessageResponseDto[]> {
    const { data: room, error: roomErr } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    if (roomErr || !room || !userCanAccessRoom(room as Record<string, string>, user.id)) {
      throw new NotFoundException('Room not found');
    }
    const limitNum = Math.min(Number(limit) || 100, 200);
    const offsetNum = Math.max(Number(offset) || 0, 0);
    const { data } = await this.supabase
      .getClient()
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .range(offsetNum, offsetNum + limitNum - 1);
    return (data ?? []) as ChatMessageResponseDto[];
  }
}
