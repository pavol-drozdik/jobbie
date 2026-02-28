import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtVerifyService } from '../auth/jwt-verify.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CurrentUser } from '../auth/auth.types';
import { ChatMessageResponseDto } from './chat.dto';

const ROOM_PREFIX = 'chat:';

function userCanAccessRoom(
  room: { company_id?: string; individual_id?: string },
  userId: string,
): boolean {
  return room.company_id === userId || room.individual_id === userId;
}

@WebSocketGateway({
  cors: { origin: true },
  path: '/socket.io',
  namespace: '/',
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private jwtVerify: JwtVerifyService,
    private supabase: SupabaseService,
  ) {}

  async handleConnection(client: {
    handshake: {
      auth?: { token?: string };
      query?: { token?: string };
      headers?: { authorization?: string };
    };
    data: { user?: CurrentUser };
    join: (room: string) => void;
    disconnect: (close: boolean) => void;
  }): Promise<void> {
    const token =
      client.handshake.auth?.token ??
      client.handshake.query?.token ??
      (typeof client.handshake.headers?.authorization === 'string'
        ? client.handshake.headers.authorization
        : undefined);
    const user = await this.jwtVerify.verifyToken(token);
    if (!user) {
      this.logger.warn('Chat connection rejected: invalid or missing token');
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    this.logger.log(`Chat connected: ${user.id}`);
  }

  handleDisconnect(client: { data: { user?: CurrentUser }; id: string }): void {
    if (client.data.user) {
      this.logger.log(`Chat disconnected: ${client.data.user.id}`);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    client: {
      data: { user?: CurrentUser };
      join: (room: string) => void;
    },
    payload: { room_id: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const user = client.data.user;
    if (!user) return { ok: false, error: 'Unauthorized' };
    const roomId = payload?.room_id;
    if (!roomId || typeof roomId !== 'string') {
      return { ok: false, error: 'room_id required' };
    }
    const { data: room, error } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('id, company_id, individual_id')
      .eq('id', roomId)
      .single();
    if (error || !room || !userCanAccessRoom(room as Record<string, string>, user.id)) {
      return { ok: false, error: 'Room not found' };
    }
    client.join(ROOM_PREFIX + roomId);
    return { ok: true };
  }

  @SubscribeMessage('message')
  async handleMessage(
    client: {
      data: { user?: CurrentUser };
      id: string;
    },
    payload: { room_id: string; content: string },
  ): Promise<{ ok: boolean; message?: ChatMessageResponseDto; error?: string }> {
    const user = client.data.user;
    if (!user) return { ok: false, error: 'Unauthorized' };
    const roomId = payload?.room_id;
    const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
    if (!roomId || !content || content.length > 4000) {
      return { ok: false, error: 'Invalid room_id or content' };
    }
    const { data: room, error: roomErr } = await this.supabase
      .getClient()
      .from('chat_rooms')
      .select('id, company_id, individual_id')
      .eq('id', roomId)
      .single();
    if (roomErr || !room || !userCanAccessRoom(room as Record<string, string>, user.id)) {
      return { ok: false, error: 'Room not found' };
    }
    const row = {
      room_id: roomId,
      sender_id: user.id,
      content,
    };
    const { data: msg, error } = await this.supabase
      .getClient()
      .from('chat_messages')
      .insert(row)
      .select()
      .single();
    if (error || !msg) {
      return { ok: false, error: 'Failed to save message' };
    }
    const message = msg as unknown as ChatMessageResponseDto;
    this.server.to(ROOM_PREFIX + roomId).emit('message', message);
    return { ok: true, message };
  }
}
