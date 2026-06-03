import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export interface ChatRoomResponseDto {
  id: string;
  job_id: string;
  company_id: string;
  individual_id: string;
  application_id: string | null;
  created_at: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar_url: string | null;
  application_status?: string;
  job_title?: string | null;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  unread_count?: number;
  peer_last_read_at?: string | null;
  other_user_has_cv?: boolean;
}

export type ChatMessageReplyQuoteDto =
  | { deleted: true }
  | {
      sender_name: string | null;
      snippet: string;
      kind: 'text';
    }
  | {
      sender_name: string | null;
      snippet: string;
      kind: 'image';
      storage_path: string;
      mime: string;
    }
  | {
      sender_name: string | null;
      snippet: string;
      kind: 'file';
      storage_path: string;
      mime: string;
      original_name: string;
    };

export interface ChatMessageResponseDto {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reply_to_message_id: string | null;
  reply_quote: ChatMessageReplyQuoteDto | null;
}

export interface ChatMessageSearchHitDto {
  id: string;
  room_id: string;
  created_at: string;
  snippet: string;
}

/** Response from POST /api/chat/rooms/:room_id/media (service-role storage upload). */
export interface ChatMediaUploadResponseDto {
  storage_path: string;
  mime: string;
  size: number;
  original_name: string;
}

/** Response from GET /api/chat/rooms/:room_id/media-url (short-lived read URL). */
export interface ChatMediaSignedUrlResponseDto {
  signedUrl: string;
}

export class ChatMessageCreateDto {
  @IsString()
  room_id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(65536)
  content!: string;

  @IsOptional()
  @IsUUID()
  reply_to_message_id?: string;
}
