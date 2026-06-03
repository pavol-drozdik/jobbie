import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtVerifyService } from '../auth/jwt-verify.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CurrentUser } from '../auth/auth.types';
import { ChatMessageResponseDto } from './chat.dto';
import { RealtimeService } from '../realtime/realtime.service';
import { ChatMessagesService } from './chat-messages.service';
import { ChatNotificationsService } from './chat-notifications.service';
import { buildSocketIoCorsOrigin } from '../common/http-cors.util';
import { resolveSocketAuthToken } from '../auth/socket-auth.util';

const ROOM_PREFIX = 'chat:';
const USER_PREFIX = 'user:';

type GatewayClient = {
  id: string;
  handshake: {
    auth?: { token?: string };
    query?: { token?: string };
    headers?: { authorization?: string };
  };
  data: { user?: CurrentUser };
  join: (room: string) => void;
  leave: (room: string) => void;
  disconnect: (close: boolean) => void;
};

function userCanAccessRoom(
  room: { company_id?: string; individual_id?: string },
  userId: string,
): boolean {
  return room.company_id === userId || room.individual_id === userId;
}

@WebSocketGateway({
  cors: { origin: buildSocketIoCorsOrigin(), credentials: true },
  path: '/socket.io',
  namespace: '/',
})
@Injectable()
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private ioServer: Server | null = null;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private jwtVerify: JwtVerifyService,
    private supabase: SupabaseService,
    private realtime: RealtimeService,
    private chatMessages: ChatMessagesService,
    private chatNotifications: ChatNotificationsService,
  ) {}

  afterInit(server: Server): void {
    this.ioServer = server;
    this.realtime.registerServer(server);
    this.logger.log('Chat Socket.IO server initialized');
  }

  async handleConnection(client: GatewayClient): Promise<void> {
    const token = resolveSocketAuthToken(client.handshake);
    const user = await this.jwtVerify.verifyToken(token);
    if (!user) {
      this.logger.warn('Chat connection rejected: invalid or missing token');
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    client.join(USER_PREFIX + user.id);
    this.logger.log(`Chat connected: ${user.id}`);
  }

  handleDisconnect(client: { data: { user?: CurrentUser }; id: string }): void {
    if (client.data.user) {
      this.logger.log(`Chat disconnected: ${client.data.user.id}`);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    client: GatewayClient,
    payload: { room_id: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const user = client.data.user;
    if (!user) return { ok: false, error: 'Unauthorized' };
    const roomId = payload?.room_id;
    if (!roomId || typeof roomId !== 'string') {
      return { ok: false, error: 'room_id required' };
    }
    const allowed = await this.userIsInRoom(user.id, roomId);
    if (!allowed) {
      return { ok: false, error: 'Room not found' };
    }
    client.join(ROOM_PREFIX + roomId);
    return { ok: true };
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    client: GatewayClient,
    payload: { room_id: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const user = client.data.user;
    if (!user) return { ok: false, error: 'Unauthorized' };
    const roomId = payload?.room_id;
    if (!roomId || typeof roomId !== 'string') {
      return { ok: false, error: 'room_id required' };
    }
    const allowed = await this.userIsInRoom(user.id, roomId);
    if (!allowed) {
      return { ok: false, error: 'Room not found' };
    }
    client.leave(ROOM_PREFIX + roomId);
    return { ok: true };
  }

  @SubscribeMessage('message')
  async handleMessage(
    client: { data: { user?: CurrentUser }; id: string },
    payload: { room_id: string; content: string; reply_to_message_id?: string },
  ): Promise<{ ok: boolean; message?: ChatMessageResponseDto; error?: string }> {
    const user = client.data.user;
    if (!user) return { ok: false, error: 'Unauthorized' };
    const roomId = payload?.room_id;
    const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
    const replyRaw = payload?.reply_to_message_id;
    const replyToMessageId =
      typeof replyRaw === 'string' && replyRaw.trim().length > 0
        ? replyRaw.trim()
        : undefined;
    if (!roomId || !content || content.length > 65536) {
      return { ok: false, error: 'Invalid room_id or content' };
    }
    const allowed = await this.userIsInRoom(user.id, roomId);
    if (!allowed) {
      return { ok: false, error: 'Room not found' };
    }
    try {
      const message = await this.chatMessages.insertOutgoingMessage({
        roomId,
        senderId: user.id,
        content,
        replyToMessageId,
      });
      const participants = await this.getRoomParticipants(roomId);
      this.emitMessageToRoom(roomId, message, participants);
      const { data: parties } = await this.supabase
        .getClient()
        .from('chat_rooms')
        .select('company_id, individual_id')
        .eq('id', roomId)
        .maybeSingle();
      if (parties) {
        const pr = parties as { company_id: string; individual_id: string };
        await this.chatNotifications.notifyRecipientOfNewMessage({
          room: pr,
          senderId: user.id,
          roomId,
          plainContent: content,
        });
      }
      return { ok: true, message };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        return { ok: false, error: 'Invalid reply_to_message_id' };
      }
      if (err instanceof ForbiddenException) {
        return { ok: false, error: 'Failed to save message' };
      }
      throw err;
    }
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    client: GatewayClient,
    payload: { room_id: string },
  ): Promise<{ ok: boolean; error?: string }> {
    return this.broadcastTyping(client, payload, 'typing_start');
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    client: GatewayClient,
    payload: { room_id: string },
  ): Promise<{ ok: boolean; error?: string }> {
    return this.broadcastTyping(client, payload, 'typing_stop');
  }

  private async broadcastTyping(
    client: GatewayClient,
    payload: { room_id: string },
    event: 'typing_start' | 'typing_stop',
  ): Promise<{ ok: boolean; error?: string }> {
    const user = client.data.user;
    if (!user) return { ok: false, error: 'Unauthorized' };
    const roomId = payload?.room_id;
    if (!roomId || typeof roomId !== 'string') {
      return { ok: false, error: 'room_id required' };
    }
    const io = this.ioServer ?? this.server;
    if (!io) {
      return { ok: false, error: 'Socket server not ready' };
    }
    io.to(ROOM_PREFIX + roomId)
      .except(client.id)
      .emit(event, { room_id: roomId, user_id: user.id });
    return { ok: true };
  }

  /**
   * Broadcast a persisted message to everyone subscribed to the chat room.
   * Also fans out to each participant's personal `user:<id>` room so that:
   *   - the sender receives their own echo even if their socket hasn't yet
   *     completed `join_room` for this chat,
   *   - the recipient receives it live even if they are not currently viewing
   *     the chat page (useful for badges / rooms sidebar previews).
   * Listeners on the frontend de-dupe by message id.
   */
  emitMessageToRoom(
    roomId: string,
    message: ChatMessageResponseDto,
    participantUserIds: string[] = [],
  ): void {
    const io = this.ioServer ?? this.server;
    if (!io) {
      this.logger.warn('emitMessageToRoom: Socket.IO server not ready');
      return;
    }
    // NestJS often injects the default Namespace (`/`), not the top-level Server —
    // Namespaces have no `.of()`. Use `namespace.adapter`; the main Server also
    // exposes the same via `server.sockets.adapter`.
    const ns = io as unknown as {
      sockets?: { adapter?: { rooms?: Map<string, Set<string>> } };
      adapter?: { rooms?: Map<string, Set<string>> };
    };
    const nRecipients =
      (ns.sockets?.adapter ?? ns.adapter)?.rooms
        ?.get(ROOM_PREFIX + roomId)
        ?.size ?? 0;
    io.to(ROOM_PREFIX + roomId).emit('message', message);
    for (const userId of participantUserIds) {
      if (!userId) continue;
      io.to(USER_PREFIX + userId).emit('message', message);
    }
    if (nRecipients === 0) {
      this.logger.debug(
        `emitMessageToRoom: no sockets in room ${ROOM_PREFIX + roomId} (delivered via user rooms or HTTP poll)`,
      );
    }
  }

  private async userIsInRoom(userId: string, roomId: string): Promise<boolean> {
    const { data: room, error } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('id, company_id, individual_id')
      .eq('id', roomId)
      .single();
    if (error || !room) {
      return false;
    }
    return userCanAccessRoom(room as Record<string, string>, userId);
  }

  /** Resolve both participant user IDs for a chat room. Empty array on error. */
  async getRoomParticipants(roomId: string): Promise<string[]> {
    const { data: room, error } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('company_id, individual_id')
      .eq('id', roomId)
      .single();
    if (error || !room) return [];
    const r = room as { company_id?: string; individual_id?: string };
    return [r.company_id, r.individual_id].filter(
      (id): id is string => typeof id === 'string' && id.length > 0,
    );
  }
}
