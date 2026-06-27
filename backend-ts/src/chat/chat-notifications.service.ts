import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../realtime/realtime.service';
import { previewFromMessageContent } from './chat-preview.helper';
import { displayNameFromProfileRow } from '../profiles/profile-display.util';

const PREVIEW_MAX_LEN = 100;

function getOtherUserId(
  room: { company_id?: string; individual_id?: string },
  senderId: string,
): string {
  return room.company_id === senderId ? String(room.individual_id) : String(room.company_id);
}

type ProfileSummary = {
  id: string;
  is_deleted?: boolean;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
};

@Injectable()
export class ChatNotificationsService {
  constructor(
    private supabase: SupabaseService,
    private notifications: NotificationsService,
    private realtime: RealtimeService,
  ) {}

  /**
   * When the recipient is not in the chat Socket.IO room, creates per-channel notifications
   * (in-app, push, email, …) via {@link NotificationsService.createForUser}. When they are
   * in the room, skips external notification (live `message` event is enough).
   */
  async notifyRecipientOfNewMessage(input: {
    room: { company_id: string; individual_id: string };
    senderId: string;
    roomId: string;
    /** Trimmed client message body (JSON envelope or plain text), same as sent over WebSocket/HTTP. */
    plainContent: string;
  }): Promise<void> {
    const recipientId = getOtherUserId(input.room, input.senderId);
    if (!recipientId || recipientId === input.senderId) {
      return;
    }
    if (await this.realtime.isUserInChatRoom(recipientId, input.roomId)) {
      return;
    }
    const { data: profile } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id, is_deleted, display_name, first_name, last_name, company_name')
      .eq('id', input.senderId)
      .maybeSingle();
    const p = profile as ProfileSummary | null;
    const senderLabel = displayNameFromProfileRow(p) || 'Užívateľ';
    const fullPreview = previewFromMessageContent(input.plainContent);
    const body =
      fullPreview.length > PREVIEW_MAX_LEN
        ? `${fullPreview.slice(0, PREVIEW_MAX_LEN)}…`
        : fullPreview;
    await this.notifications.createForUser({
      userId: recipientId,
      type: 'chat_message',
      title: senderLabel,
      body,
      metadata: {
        room_id: input.roomId,
        preview: body,
        sender_label: senderLabel,
      },
    });
  }
}
