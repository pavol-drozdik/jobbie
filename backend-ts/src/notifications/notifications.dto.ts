import { IsOptional, IsInt, Min, Max, IsString, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export type UserNotificationType =
  | 'chat_message'
  | 'job_application'
  | 'security_alert'
  | 'application_status'
  | 'payment_received'
  | 'job_status'
  | 'admin_broadcast'
  | 'weekly_digest'
  | 'reengagement';

export interface NotificationMetadata {
  room_id?: string;
  job_id?: string;
  application_id?: string;
  job_title?: string;
  sender_label?: string;
  preview?: string;
  device_id?: string;
  ip?: string;
  previous_ip?: string;
  status?: string;
  link_path?: string;
  broadcast_id?: string;
}

export class NotificationsListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class PushSubscribeDto {
  @IsString()
  endpoint!: string;

  @IsObject()
  keys!: { p256dh: string; auth: string };
}

export type UserNotificationRow = {
  id: string;
  user_id: string;
  type: UserNotificationType;
  title: string;
  body: string | null;
  metadata: NotificationMetadata;
  read_at: string | null;
  created_at: string;
};

export type UserNotificationItemDto = {
  id: string;
  type: UserNotificationType;
  title: string;
  body: string | null;
  link_path: string;
  metadata: NotificationMetadata;
  read_at: string | null;
  created_at: string;
};

export type NotificationsListResponseDto = {
  items: UserNotificationItemDto[];
  unread_count: number;
};
