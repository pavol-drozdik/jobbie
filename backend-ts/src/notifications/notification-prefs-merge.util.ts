import {
  CATEGORY_DEFAULTS,
  type NotificationCategory,
  type NotificationChannel,
} from './notification-prefs.util';

export const NOTIFICATION_CHANNELS: NotificationChannel[] = [
  'in_app',
  'email',
  'push',
  'sms',
];

export type NotificationPrefsV2 = {
  v: 2;
  categories: Record<
    string,
    Partial<Record<NotificationChannel, boolean>>
  >;
};

function channelRecord(
  over: Partial<Record<NotificationChannel, boolean>> = {},
): Record<NotificationChannel, boolean> {
  return {
    in_app: over.in_app ?? true,
    email: over.email ?? true,
    push: over.push ?? true,
    sms: over.sms ?? false,
  };
}

function defaultsForCategory(cat: string): Record<NotificationChannel, boolean> {
  if (cat in CATEGORY_DEFAULTS) {
    return { ...CATEGORY_DEFAULTS[cat as NotificationCategory] };
  }
  return channelRecord();
}

function sanitizeCategoryChannels(
  input: unknown,
  cat: string,
): Record<NotificationChannel, boolean> {
  const base = defaultsForCategory(cat);
  if (!input || typeof input !== 'object') {
    return base;
  }
  const o = input as Record<string, unknown>;
  const out = { ...base };
  for (const ch of NOTIFICATION_CHANNELS) {
    if (typeof o[ch] === 'boolean') {
      out[ch] = o[ch] as boolean;
    }
  }
  out.sms = false;
  return out;
}

/** Build full v2 categories from legacy flat booleans or partial v2. */
export function legacyToNotificationPrefsV2(raw: unknown): NotificationPrefsV2 {
  const categories: NotificationPrefsV2['categories'] = {};
  const knownCats = Object.keys(CATEGORY_DEFAULTS) as NotificationCategory[];

  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (o.v === 2 && o.categories && typeof o.categories === 'object') {
      for (const [cat, ch] of Object.entries(
        o.categories as Record<string, unknown>,
      )) {
        categories[cat] = sanitizeCategoryChannels(ch, cat);
      }
    }
    if (typeof o.messages === 'boolean') {
      const v = o.messages;
      categories.messages = channelRecord({
        in_app: v,
        email: v,
        push: v,
        sms: false,
      });
    }
    if (typeof o.new_applications === 'boolean') {
      const v = o.new_applications;
      categories.applications = channelRecord({
        in_app: v,
        email: v,
        push: v,
        sms: false,
      });
    }
    if (typeof o.reviews === 'boolean') {
      const v = o.reviews;
      categories.reviews = channelRecord({
        in_app: v,
        email: v,
        push: false,
        sms: false,
      });
    }
  }

  for (const cat of knownCats) {
    if (!categories[cat]) {
      categories[cat] = defaultsForCategory(cat);
    }
  }

  return { v: 2, categories };
}

export function serializeNotificationPreferencesForClient(
  raw: unknown,
): NotificationPrefsV2 {
  return legacyToNotificationPrefsV2(raw);
}

export function mergeNotificationPreferences(
  existing: unknown,
  partial: unknown,
): NotificationPrefsV2 {
  const base = legacyToNotificationPrefsV2(existing);
  if (!partial || typeof partial !== 'object') {
    return base;
  }
  const p = partial as Record<string, unknown>;

  if (p.v === 2 && p.categories && typeof p.categories === 'object') {
    const mergedCats = { ...base.categories };
    for (const [cat, ch] of Object.entries(
      p.categories as Record<string, unknown>,
    )) {
      mergedCats[cat] = sanitizeCategoryChannels(
        {
          ...(mergedCats[cat] ?? {}),
          ...(ch && typeof ch === 'object' ? ch : {}),
        },
        cat,
      );
    }
    return { v: 2, categories: mergedCats };
  }

  const combined: Record<string, unknown> =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  if (typeof p.messages === 'boolean') {
    combined.messages = p.messages;
  }
  if (typeof p.new_applications === 'boolean') {
    combined.new_applications = p.new_applications;
  }
  if (typeof p.reviews === 'boolean') {
    combined.reviews = p.reviews;
  }
  return legacyToNotificationPrefsV2(combined);
}
