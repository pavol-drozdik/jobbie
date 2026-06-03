import type { UserNotificationType } from './notifications.dto';

export type NotificationCategory =
  | 'messages'
  | 'applications'
  | 'marketing'
  | 'digest'
  | 'job_updates'
  | 'payments'
  | 'reviews'
  | 'offer_expiry'
  | 'low_credits'
  | 'job_email_alerts'
  | 'cv_database';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms';

export const CATEGORY_DEFAULTS: Record<NotificationCategory, Record<NotificationChannel, boolean>> = {
  messages: { in_app: true, email: true, push: true, sms: false },
  applications: { in_app: true, email: true, push: true, sms: false },
  marketing: { in_app: true, email: false, push: false, sms: false },
  digest: { in_app: true, email: true, push: false, sms: false },
  job_updates: { in_app: true, email: true, push: true, sms: false },
  payments: { in_app: true, email: true, push: true, sms: false },
  reviews: { in_app: true, email: true, push: false, sms: false },
  offer_expiry: { in_app: true, email: true, push: true, sms: false },
  low_credits: { in_app: true, email: true, push: true, sms: false },
  job_email_alerts: { in_app: true, email: true, push: false, sms: false },
  cv_database: { in_app: true, email: true, push: true, sms: false },
};

/**
 * Resolves whether a channel is enabled for a category from `profiles.notification_preferences`.
 * Supports legacy flat booleans (`messages`, `new_applications`, `reviews`) and v2 `{ v: 2, categories: { ... } }`.
 */
export function resolveNotificationChannel(
  raw: unknown,
  category: NotificationCategory,
  channel: NotificationChannel,
): boolean {
  if (channel === 'sms') {
    return false;
  }
  if (!raw || typeof raw !== 'object') {
    return CATEGORY_DEFAULTS[category][channel];
  }
  const o = raw as Record<string, unknown>;
  if (o.v === 2 && o.categories && typeof o.categories === 'object') {
    const cat = (o.categories as Record<string, Partial<Record<NotificationChannel, boolean>>>)[category];
    if (cat && typeof cat[channel] === 'boolean') {
      return cat[channel] as boolean;
    }
    return CATEGORY_DEFAULTS[category][channel];
  }
  if (category === 'messages' && typeof o.messages === 'boolean') {
    return o.messages;
  }
  if (category === 'applications' && typeof o.new_applications === 'boolean') {
    return o.new_applications;
  }
  if (category === 'reviews' && typeof o.reviews === 'boolean') {
    return o.reviews;
  }
  return CATEGORY_DEFAULTS[category][channel];
}

export function categoryFromNotificationType(type: UserNotificationType): NotificationCategory {
  switch (type) {
    case 'chat_message':
      return 'messages';
    case 'job_application':
    case 'application_status':
      return 'applications';
    case 'payment_received':
      return 'payments';
    case 'job_status':
      return 'job_updates';
    case 'security_alert':
      return 'messages';
    case 'admin_broadcast':
    case 'reengagement':
      return 'marketing';
    case 'weekly_digest':
      return 'digest';
    default:
      return 'messages';
  }
}
