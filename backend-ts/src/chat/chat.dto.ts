import { IsString, MinLength, MaxLength } from 'class-validator';

export interface ChatRoomResponseDto {
  id: string;
  job_id: string;
  company_id: string;
  individual_id: string;
  application_id: string;
  created_at: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_avatar_url: string | null;
}

export interface ChatMessageResponseDto {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export class ChatMessageCreateDto {
  @IsString()
  room_id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;
}
