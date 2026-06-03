import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ChatContentCryptoService } from './chat-content-crypto.service';
import { StorageUploadService } from '../storage/storage-upload.service';
import {
  ChatMessageReplyQuoteDto,
  ChatMessageResponseDto,
} from './chat.dto';
import { previewFromMessageContent } from './chat-preview.helper';
import { displayNameFromProfileRow } from '../profiles/profile-display.util';

export type ChatMessageDbRow = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_message_id?: string | null;
};

type ProfileReplyRow = {
  id: string;
  is_deleted?: boolean;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

/** Room membership checked by controller; bodies encrypted at rest when CHAT_CONTENT_ENCRYPTION_KEY set. */
@Injectable()
export class ChatMessagesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly chatContentCrypto: ChatContentCryptoService,
    private readonly storageUpload: StorageUploadService,
  ) {}

  async insertOutgoingMessage(params: {
    roomId: string;
    senderId: string;
    content: string;
    replyToMessageId?: string | null;
  }): Promise<ChatMessageResponseDto> {
    const { roomId, senderId, content, replyToMessageId } = params;
    if (replyToMessageId) {
      await this.assertReplyParentInRoom(roomId, replyToMessageId);
    }
    await this.assertContentMediaBinding(roomId, senderId, content);
    const storedContent = this.chatContentCrypto.mapIncomingContent(content);
    const row: Record<string, unknown> = {
      room_id: roomId,
      sender_id: senderId,
      content: storedContent,
    };
    if (replyToMessageId) {
      row.reply_to_message_id = replyToMessageId;
    }
    const { data: msg, error } = await this.supabase
      .getClient()
      .from('chat_messages')
      .insert(row)
      .select()
      .single();
    if (error || !msg) {
      throw new ForbiddenException('Failed to send message');
    }
    const mapped = await this.mapRowsToResponseDto(roomId, [
      msg as ChatMessageDbRow,
    ]);
    const dto = mapped[0];
    if (!dto) {
      throw new ForbiddenException('Failed to send message');
    }
    return dto;
  }

  async mapRowsToResponseDto(
    roomId: string,
    rows: ChatMessageDbRow[],
  ): Promise<ChatMessageResponseDto[]> {
    const replyIds = Array.from(
      new Set(
        rows
          .map((r) => r.reply_to_message_id ?? null)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );
    const parentById = new Map<string, ChatMessageDbRow>();
    if (replyIds.length > 0) {
      const { data: parents } = await this.supabase
        .getClient()
        .from('chat_messages')
        .select('id, room_id, sender_id, content')
        .eq('room_id', roomId)
        .in('id', replyIds);
      for (const p of parents ?? []) {
        const row = p as ChatMessageDbRow;
        parentById.set(row.id, row);
      }
    }
    const senderIds = Array.from(
      new Set(
        [...parentById.values()].map((p) => p.sender_id),
      ),
    );
    const profileById = new Map<string, ProfileReplyRow>();
    if (senderIds.length > 0) {
      const { data: profiles } = await this.supabase
        .getClient()
        .from('profiles')
        .select('id, is_deleted, display_name, first_name, last_name')
        .in('id', senderIds);
      for (const pr of profiles ?? []) {
        const p = pr as ProfileReplyRow;
        profileById.set(p.id, p);
      }
    }
    return rows.map((r) =>
      this.mapSingleRow(r, parentById, profileById),
    );
  }

  private async assertReplyParentInRoom(
    roomId: string,
    replyToMessageId: string,
  ): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('chat_messages')
      .select('id')
      .eq('id', replyToMessageId)
      .eq('room_id', roomId)
      .maybeSingle();
    if (error || !data) {
      throw new BadRequestException('Invalid reply_to_message_id');
    }
  }

  private mapSingleRow(
    raw: ChatMessageDbRow,
    parentById: Map<string, ChatMessageDbRow>,
    profileById: Map<string, ProfileReplyRow>,
  ): ChatMessageResponseDto {
    const replyToId =
      typeof raw.reply_to_message_id === 'string' && raw.reply_to_message_id.length > 0
        ? raw.reply_to_message_id
        : null;
    let reply_quote: ChatMessageReplyQuoteDto | null = null;
    if (replyToId) {
      const parent = parentById.get(replyToId);
      if (!parent) {
        reply_quote = { deleted: true };
      } else {
        const decrypted = this.chatContentCrypto.mapMessageContent(parent.content);
        const snippet = previewFromMessageContent(decrypted);
        const profile = profileById.get(parent.sender_id);
        const sender_name = displayNameFromProfileRow(profile);
        reply_quote = this.buildReplyQuoteFromEnvelope(decrypted, snippet, sender_name);
      }
    }
    return {
      id: raw.id,
      room_id: raw.room_id,
      sender_id: raw.sender_id,
      content: this.chatContentCrypto.mapMessageContent(raw.content),
      created_at: raw.created_at,
      reply_to_message_id: replyToId,
      reply_quote,
    };
  }

  /**
   * Returns a structured reply quote (kind + media metadata) so clients can
   * render Instagram-style image thumbnails inside the embedded "replied-to"
   * preview without making extra requests.
   */
  private buildReplyQuoteFromEnvelope(
    decryptedContent: string,
    snippet: string,
    sender_name: string | null,
  ): ChatMessageReplyQuoteDto {
    const raw = (decryptedContent ?? '').trim();
    if (raw.startsWith('{')) {
      try {
        const o = JSON.parse(raw) as {
          kind?: string;
          storage_path?: string;
          mime?: string;
          original_name?: string;
        };
        if (
          o.kind === 'image' &&
          typeof o.storage_path === 'string' &&
          typeof o.mime === 'string'
        ) {
          return {
            sender_name,
            snippet,
            kind: 'image',
            storage_path: o.storage_path,
            mime: o.mime,
          };
        }
        if (
          o.kind === 'file' &&
          typeof o.storage_path === 'string' &&
          typeof o.mime === 'string'
        ) {
          return {
            sender_name,
            snippet,
            kind: 'file',
            storage_path: o.storage_path,
            mime: o.mime,
            original_name:
              typeof o.original_name === 'string' && o.original_name.length > 0
                ? o.original_name
                : snippet,
          };
        }
      } catch {
        /* fall through to text */
      }
    }
    return { sender_name, snippet, kind: 'text' };
  }

  /**
   * If the message content is a structured media envelope (`{ kind: 'image' |
   * 'file', storage_path, mime, ... }`), require that the storage_path is a
   * finalized chat-media upload that belongs to this room and was uploaded by
   * the sender. Defeats messages that reference arbitrary or foreign storage
   * paths (IDOR-style read via signed URLs).
   */
  private async assertContentMediaBinding(
    roomId: string,
    senderId: string,
    content: string,
  ): Promise<void> {
    const raw = (content ?? '').trim();
    if (!raw.startsWith('{')) return;
    let parsed: { kind?: unknown; storage_path?: unknown } | null = null;
    try {
      parsed = JSON.parse(raw) as { kind?: unknown; storage_path?: unknown };
    } catch {
      return;
    }
    if (!parsed) return;
    if (parsed.kind !== 'image' && parsed.kind !== 'file') return;
    if (typeof parsed.storage_path !== 'string' || !parsed.storage_path) {
      throw new BadRequestException('Missing storage_path on media message');
    }
    await this.storageUpload.assertChatMediaPathForFinalizedUpload(
      roomId,
      parsed.storage_path,
      senderId,
    );
  }
}
