import { Injectable, Logger } from '@nestjs/common';
import type { Server } from 'socket.io';

/**
 * Shared registry for the Socket.IO server instance so non-gateway services (e.g. notifications)
 * can push events to specific user/room sockets without creating a DI cycle with ChatGateway.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  private server: Server | null = null;

  registerServer(server: Server): void {
    this.server = server;
  }

  /** Emit an event to every socket connection belonging to a specific authenticated user. */
  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!userId) {
      return;
    }
    if (!this.server) {
      this.logger.debug(
        `emitToUser skipped; Socket.IO server not registered yet (event=${event})`,
      );
      return;
    }
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  /** Emit an event to every socket currently joined to a chat room. */
  emitToRoom(roomId: string, event: string, payload: unknown): void {
    if (!roomId) {
      return;
    }
    if (!this.server) {
      this.logger.debug(
        `emitToRoom skipped; Socket.IO server not registered yet (event=${event})`,
      );
      return;
    }
    this.server.to(`chat:${roomId}`).emit(event, payload);
  }

  /**
   * True if the user has any connected socket currently joined to `chat:{roomId}`
   * (same room name as `ChatGateway` `join_room`).
   */
  async isUserInChatRoom(userId: string, roomId: string): Promise<boolean> {
    if (!userId?.trim() || !roomId?.trim()) {
      return false;
    }
    if (!this.server) {
      return false;
    }
    try {
      const sockets = await this.server.in(`chat:${roomId}`).fetchSockets();
      return sockets.some((s) => {
        const u = (s.data as { user?: { id?: string } } | undefined)?.user?.id;
        return u === userId;
      });
    } catch (err) {
      this.logger.warn(`isUserInChatRoom failed: ${String(err)}`);
      return false;
    }
  }
}
