import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  GoneException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import {
  avatarUrlFromProfileRow,
  displayNameFromProfileRow,
} from '../profiles/profile-display.util';
import { SupabaseService } from '../supabase/supabase.service';
import { decodeKeysetCursor } from '../common/keyset-cursor';
import {
  ChatMediaSignedUrlResponseDto,
  ChatMessageCreateDto,
  ChatMessageResponseDto,
  ChatMessageSearchHitDto,
  ChatRoomResponseDto,
} from './chat.dto';
import { ChatContentCryptoService } from './chat-content-crypto.service';
import { ChatGateway } from './chat.gateway';
import { ChatMessagesService, type ChatMessageDbRow } from './chat-messages.service';
import { ChatNotificationsService } from './chat-notifications.service';
import { ChatRoomsService } from './chat-rooms.service';
import { previewFromMessageContent } from './chat-preview.helper';
import { RealtimeService } from '../realtime/realtime.service';
import { StorageUploadService } from '../storage/storage-upload.service';
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
  is_deleted?: boolean;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  logo_url?: string | null;
};

type ChatRoomDbRow = {
  id: string;
  job_id: string | null;
  company_ad_id?: string | null;
  company_id: string;
  individual_id: string;
  application_id: string | null;
  created_at: string;
  company_last_read_at?: string | null;
  individual_last_read_at?: string | null;
};

@Controller('chat')
@UseGuards(JwksAuthGuard)
export class ChatController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly chatGateway: ChatGateway,
    private readonly chatContentCrypto: ChatContentCryptoService,
    private readonly chatMessages: ChatMessagesService,
    private readonly chatNotifications: ChatNotificationsService,
    private readonly realtime: RealtimeService,
    private readonly chatRooms: ChatRoomsService,
    private readonly storageUpload: StorageUploadService,
  ) {}

  private async assertRoomForUser(roomId: string, userId: string): Promise<ChatRoomDbRow> {
    const { data: room, error } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    if (error || !room || !userCanAccessRoom(room as Record<string, string>, userId)) {
      throw new NotFoundException('Room not found');
    }
    return room as ChatRoomDbRow;
  }

  private async loadUnreadCountsByRoom(
    userId: string,
    rooms: ChatRoomDbRow[],
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    if (!rooms.length) {
      return out;
    }
    const roomIds = rooms.map((r) => r.id);
    const { data, error } = await this.supabase
      .getClient()
      .rpc('chat_unread_counts_for_viewer', {
        p_user_id: userId,
        p_room_ids: roomIds,
      });
    if (error) {
      return out;
    }
    for (const row of (data ?? []) as { room_id: string; unread_count: number }[]) {
      out.set(row.room_id, Number(row.unread_count) || 0);
    }
    return out;
  }

  private async enrichRoomForViewer(
    user: CurrentUser,
    room: ChatRoomDbRow,
    applicationStatus = 'pending',
    profileById?: Map<string, ProfileSummary>,
    jobTitleByJobId?: Map<string, string | null>,
    companyAdTitleById?: Map<string, string | null>,
    lastMessageByRoomId?: Map<string, { content: string; created_at: string }>,
    unreadByRoomId?: Map<string, number>,
  ): Promise<ChatRoomResponseDto> {
    const client = this.supabase.getClient();
    const otherUserId = getOtherUserId(room, user.id);
    let p = profileById?.get(otherUserId) ?? null;
    if (!p) {
      const { data: profile } = await client
        .from('profiles')
        .select('id, is_deleted, display_name, first_name, last_name, company_name, logo_url')
        .eq('id', otherUserId)
        .maybeSingle();
      p = profile as ProfileSummary | null;
    }
    let jobTitle: string | null = null;
    const companyAdId = room.company_ad_id?.trim() || null;
    if (companyAdId) {
      jobTitle = companyAdTitleById?.get(companyAdId) ?? null;
      if (jobTitle === undefined) {
        const { data: adRow } = await client
          .from('company_ads')
          .select('title')
          .eq('id', companyAdId)
          .maybeSingle();
        jobTitle = (adRow as { title?: string | null } | null)?.title?.trim() || null;
      }
    } else if (room.job_id) {
      jobTitle = jobTitleByJobId?.get(room.job_id) ?? null;
      if (jobTitle === undefined) {
        const { data: jobRow } = await client
          .from('job_offers')
          .select('title')
          .eq('id', room.job_id)
          .maybeSingle();
        jobTitle = (jobRow as { title?: string | null } | null)?.title?.trim() || null;
      }
    }
    let last = lastMessageByRoomId?.get(room.id);
    if (!last) {
      const { data: lastMsgs } = await client
        .from('chat_messages')
        .select('content, created_at')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1);
      last = (lastMsgs ?? [])[0] as { content: string; created_at: string } | undefined;
    }
    const lastMessageAt = last?.created_at ?? null;
    const lastMessagePreview = last
      ? previewFromMessageContent(this.chatContentCrypto.mapMessageContent(last.content))
      : null;
    const myLastRead =
      room.company_id === user.id
        ? room.company_last_read_at ?? null
        : room.individual_last_read_at ?? null;
    let unreadCount = unreadByRoomId?.get(room.id);
    if (unreadCount === undefined) {
      const { count } = await client
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id)
        .neq('sender_id', user.id)
        .gt('created_at', myLastRead ?? '1970-01-01T00:00:00.000Z');
      unreadCount = typeof count === 'number' ? count : 0;
    }
    const peerLastRead =
      room.company_id === user.id
        ? room.individual_last_read_at ?? null
        : room.company_last_read_at ?? null;
    return {
      id: room.id,
      job_id: room.job_id,
      company_ad_id: room.company_ad_id ?? null,
      company_id: room.company_id,
      individual_id: room.individual_id,
      application_id: room.application_id,
      created_at: room.created_at,
      other_user_id: otherUserId,
      other_user_name: displayNameFromProfileRow(p),
      other_user_avatar_url: avatarUrlFromProfileRow(p),
      application_status: applicationStatus,
      job_title: jobTitle,
      last_message_at: lastMessageAt,
      last_message_preview: lastMessagePreview,
      unread_count: unreadCount,
      peer_last_read_at: peerLastRead,
      other_user_has_cv: false,
    };
  }

  @Post('rooms')
  async getOrCreateRoom(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('application_id') applicationId: string,
  ): Promise<ChatRoomResponseDto> {
    if (!applicationId) throw new NotFoundException('application_id required');
    const { data: app, error: appErr } = await this.supabase
      .getClient()
      .from('applications')
      .select('id, job_id, individual_id, status')
      .eq('id', applicationId)
      .single();
    if (appErr || !app) throw new NotFoundException('Application not found');
    const a = app as { job_id: string; individual_id: string; status: string };
    const { data: job, error: jobErr } = await this.supabase
      .getClient()
      .from('job_offers')
      .select('company_id')
      .eq('id', a.job_id)
      .single();
    if (jobErr || !job) throw new NotFoundException('Job not found');
    const companyId = (job as { company_id: string }).company_id;
    if (user.id !== a.individual_id && user.id !== companyId) {
      throw new ForbiddenException('Not your application or job');
    }
    const { room, applicationStatus } =
      await this.chatRooms.ensureRoomForApplication(applicationId);
    return this.enrichRoomForViewer(user, room, applicationStatus);
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
    const rooms = (data ?? []) as ChatRoomDbRow[];
    if (!rooms.length) return [];
    const applicationIds = [
      ...new Set(
        rooms.map((r) => r.application_id).filter((id): id is string => Boolean(id)),
      ),
    ];
    const applicationStatusById = new Map<string, string>();
    if (applicationIds.length > 0) {
      const { data: apps } = await this.supabase
        .getClient()
        .from('applications')
        .select('id, status')
        .in('id', applicationIds);
      for (const row of (apps ?? []) as { id: string; status: string }[]) {
        applicationStatusById.set(row.id, row.status);
      }
    }
    const otherIds = [...new Set(rooms.map((r) => getOtherUserId(r, user.id)).filter(Boolean))];
    const profilesById = new Map<string, ProfileSummary>();
    if (otherIds.length > 0) {
      const { data: profiles } = await this.supabase
        .getClient()
        .from('profiles')
        .select('id, is_deleted, display_name, first_name, last_name, company_name, logo_url')
        .in('id', otherIds);
      for (const p of (profiles ?? []) as ProfileSummary[]) profilesById.set(p.id, p);
    }
    const jobIds = [...new Set(rooms.map((r) => r.job_id).filter(Boolean))] as string[];
    const jobTitleByJobId = new Map<string, string | null>();
    if (jobIds.length > 0) {
      const { data: jobs } = await this.supabase
        .getClient()
        .from('job_offers')
        .select('id, title')
        .in('id', jobIds);
      for (const j of (jobs ?? []) as { id: string; title?: string | null }[]) {
        jobTitleByJobId.set(j.id, j.title?.trim() || null);
      }
    }
    const companyAdIds = [
      ...new Set(
        rooms
          .map((r) => r.company_ad_id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const companyAdTitleById = new Map<string, string | null>();
    if (companyAdIds.length > 0) {
      const { data: ads } = await this.supabase
        .getClient()
        .from('company_ads')
        .select('id, title')
        .in('id', companyAdIds);
      for (const ad of (ads ?? []) as { id: string; title?: string | null }[]) {
        companyAdTitleById.set(ad.id, ad.title?.trim() || null);
      }
    }
    const roomIds = rooms.map((r) => r.id);
    const lastMessageByRoomId = new Map<string, { content: string; created_at: string }>();
    if (roomIds.length > 0) {
      const { data: msgs } = await this.supabase
        .getClient()
        .from('chat_messages')
        .select('room_id, content, created_at')
        .in('room_id', roomIds)
        .order('created_at', { ascending: false })
        .limit(Math.min(roomIds.length * 3, 300));
      for (const m of (msgs ?? []) as {
        room_id: string;
        content: string;
        created_at: string;
      }[]) {
        if (!lastMessageByRoomId.has(m.room_id)) {
          lastMessageByRoomId.set(m.room_id, {
            content: m.content,
            created_at: m.created_at,
          });
        }
      }
    }
    const unreadByRoomId = await this.loadUnreadCountsByRoom(user.id, rooms);
    const enriched = await Promise.all(
      rooms.map((room) =>
        this.enrichRoomForViewer(
          user,
          room,
          room.application_id
            ? (applicationStatusById.get(room.application_id) ?? 'pending')
            : room.company_ad_id
              ? 'ad_inquiry'
              : 'cv_outreach',
          profilesById,
          jobTitleByJobId,
          companyAdTitleById,
          lastMessageByRoomId,
          unreadByRoomId,
        ),
      ),
    );
    enriched.sort((a, b) => {
      const ta = a.last_message_at ?? a.created_at;
      const tb = b.last_message_at ?? b.created_at;
      return tb.localeCompare(ta);
    });
    return enriched;
  }

  @Get('rooms/:room_id')
  async getRoom(
    @Param('room_id', ParseUUIDPipe) roomId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<ChatRoomResponseDto> {
    const room = await this.assertRoomForUser(roomId, user.id);
    let status = 'cv_outreach';
    if (room.application_id) {
      status = 'pending';
      const { data: app } = await this.supabase
        .getClient()
        .from('applications')
        .select('status')
        .eq('id', room.application_id)
        .maybeSingle();
      if (app && typeof (app as { status?: string }).status === 'string') {
        status = (app as { status: string }).status;
      }
    } else if (room.company_ad_id) {
      status = 'ad_inquiry';
    }
    return this.enrichRoomForViewer(user, room, status);
  }

  @Patch('rooms/:room_id/read')
  async markRoomRead(
    @Param('room_id', ParseUUIDPipe) roomId: string,
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<{ ok: true; read_at: string }> {
    const room = await this.assertRoomForUser(roomId, user.id);
    const readAt = new Date().toISOString();
    const patch =
      room.company_id === user.id
        ? { company_last_read_at: readAt }
        : { individual_last_read_at: readAt };
    const { error } = await this.supabase.getClient().from('chat_rooms').update(patch).eq('id', roomId);
    if (error) throw new ForbiddenException('Failed to mark read');
    this.realtime.emitToRoom(roomId, 'room_read', { room_id: roomId, user_id: user.id, read_at: readAt });
    return { ok: true, read_at: readAt };
  }

  @Post('messages')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async sendMessage(
    @CurrentUserDecorator() user: CurrentUser,
    @Body() body: ChatMessageCreateDto,
  ): Promise<ChatMessageResponseDto> {
    const room = await this.assertRoomForUser(body.room_id, user.id);
    const msg = await this.chatMessages.insertOutgoingMessage({
      roomId: body.room_id,
      senderId: user.id,
      content: body.content,
      replyToMessageId: body.reply_to_message_id ?? null,
    });
    const participants = await this.chatGateway.getRoomParticipants(body.room_id);
    this.chatGateway.emitMessageToRoom(body.room_id, msg, participants);
    await this.chatNotifications.notifyRecipientOfNewMessage({
      room,
      senderId: user.id,
      roomId: body.room_id,
      plainContent: body.content,
    });
    return msg;
  }

  @Get('rooms/:room_id/messages/around/:message_id')
  async listMessagesAround(
    @Param('room_id', ParseUUIDPipe) roomId: string,
    @Param('message_id', ParseUUIDPipe) messageId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Query('before') before = 60,
    @Query('after') after = 60,
  ): Promise<ChatMessageResponseDto[]> {
    await this.assertRoomForUser(roomId, user.id);
    const { data: anchor, error } = await this.supabase
      .getClient()
      .from('chat_messages')
      .select('created_at')
      .eq('room_id', roomId)
      .eq('id', messageId)
      .maybeSingle();
    if (error || !anchor) throw new NotFoundException('Message not found');
    const anchorAt = (anchor as { created_at: string }).created_at;
    const beforeLimit = Math.min(Number(before) || 60, 150);
    const afterLimit = Math.min(Number(after) || 60, 150);
    const [older, newer] = await Promise.all([
      this.supabase
        .getClient()
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .lte('created_at', anchorAt)
        .order('created_at', { ascending: false })
        .limit(beforeLimit + 1),
      this.supabase
        .getClient()
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .gt('created_at', anchorAt)
        .order('created_at', { ascending: true })
        .limit(afterLimit),
    ]);
    const rows = [
      ...((older.data ?? []) as ChatMessageDbRow[]).reverse(),
      ...((newer.data ?? []) as ChatMessageDbRow[]),
    ];
    return this.chatMessages.mapRowsToResponseDto(roomId, rows);
  }

  @Get('rooms/:room_id/messages')
  async listMessages(
    @Param('room_id', ParseUUIDPipe) roomId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Query('limit') limit = 100,
    @Query('offset') offset = 0,
    @Query('cursor') cursorRaw?: string,
    /** Keyset cursor of the oldest message already loaded — returns older page (ascending). */
    @Query('before') beforeRaw?: string,
  ): Promise<ChatMessageResponseDto[]> {
    await this.assertRoomForUser(roomId, user.id);
    const limitNum = Math.min(Number(limit) || 100, 300);
    const client = this.supabase.getClient();

    const before = decodeKeysetCursor(beforeRaw);
    if (before) {
      const { data } = await client
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .or(
          `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
        )
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limitNum);
      const rows = [...((data ?? []) as ChatMessageDbRow[])].reverse();
      return this.chatMessages.mapRowsToResponseDto(roomId, rows);
    }

    const keyset = decodeKeysetCursor(cursorRaw);
    if (keyset) {
      const { data } = await client
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .or(
          `created_at.gt.${keyset.createdAt},and(created_at.eq.${keyset.createdAt},id.gt.${keyset.id})`,
        )
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limitNum);
      return this.chatMessages.mapRowsToResponseDto(
        roomId,
        (data ?? []) as ChatMessageDbRow[],
      );
    }

    const offsetNum = Math.max(Number(offset) || 0, 0);
    if (offsetNum > 0) {
      const { data } = await client
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .range(offsetNum, offsetNum + limitNum - 1);
      return this.chatMessages.mapRowsToResponseDto(roomId, (data ?? []) as ChatMessageDbRow[]);
    }

    const { data } = await client
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limitNum);
    const rows = [...((data ?? []) as ChatMessageDbRow[])].reverse();
    return this.chatMessages.mapRowsToResponseDto(roomId, rows);
  }

  @Get('messages/search')
  async searchMessages(
    @CurrentUserDecorator() user: CurrentUser,
    @Query('room_id', ParseUUIDPipe) roomId: string,
    @Query('q') q: string,
    @Query('limit') limit = 20,
  ): Promise<ChatMessageSearchHitDto[]> {
    await this.assertRoomForUser(roomId, user.id);
    const needle = (q ?? '').trim().toLowerCase();
    if (needle.length < 2) return [];
    const { data } = await this.supabase
      .getClient()
      .from('chat_messages')
      .select('id, room_id, content, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(500);
    const hits: ChatMessageSearchHitDto[] = [];
    for (const row of (data ?? []) as ChatMessageDbRow[]) {
      const plain = this.chatContentCrypto.mapMessageContent(row.content);
      const preview = previewFromMessageContent(plain);
      if (preview.toLowerCase().includes(needle) || plain.toLowerCase().includes(needle)) {
        hits.push({ id: row.id, room_id: row.room_id, created_at: row.created_at, snippet: preview });
      }
      if (hits.length >= Math.min(Number(limit) || 20, 50)) break;
    }
    return hits;
  }

  @Post('rooms/:room_id/media')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  uploadMediaDeprecated(): never {
    throw new GoneException(
      'Multipart upload removed. Use POST /api/storage/uploads/init with purpose chat_media, then finalize.',
    );
  }

  @Get('rooms/:room_id/media-url')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getMediaUrl(
    @Param('room_id', ParseUUIDPipe) roomId: string,
    @CurrentUserDecorator() user: CurrentUser,
    @Query('path') path: string,
  ): Promise<ChatMediaSignedUrlResponseDto> {
    await this.assertRoomForUser(roomId, user.id);
    const storagePath = (path ?? '').trim();
    await this.storageUpload.assertChatMediaReadableInRoom(roomId, storagePath);
    const signedUrl = await this.storageUpload.createChatSignedUrl(storagePath, 60 * 10);
    return { signedUrl };
  }
}
