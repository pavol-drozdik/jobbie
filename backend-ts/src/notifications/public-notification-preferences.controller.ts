import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { PreferenceTokenService } from './preference-token.service';
import {
  CATEGORY_DEFAULTS,
  type NotificationCategory,
  type NotificationChannel,
} from './notification-prefs.util';

const ALLOWED_CATEGORIES = new Set<NotificationCategory>(
  Object.keys(CATEGORY_DEFAULTS) as NotificationCategory[],
);
const ALLOWED_CHANNELS = new Set<NotificationChannel>([
  'in_app',
  'email',
  'push',
  'sms',
]);
const MAX_PREFS_BYTES = 16 * 1024;

/**
 * Returns a sanitized preferences object that ONLY contains the v2 schema
 * shape `{ v: 2, categories: { <known>: { <channel>: boolean } } }` plus a
 * small set of legacy top-level flags. Anything else (unknown keys, deeply
 * nested arbitrary JSON) is dropped — preventing storage-bloat / JSON-bomb
 * inputs and ensuring downstream code paths only see known shapes.
 */
function sanitizePreferences(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') return { v: 2, categories: {} };
  const raw = input as Record<string, unknown>;
  // Bound size up-front so a hostile token-holder cannot store megabytes of
  // JSON in a profile row.
  if (JSON.stringify(raw).length > MAX_PREFS_BYTES) {
    throw new BadRequestException('preferences too large');
  }
  const out: Record<string, unknown> = { v: 2 };
  const categoriesIn =
    raw.categories && typeof raw.categories === 'object'
      ? (raw.categories as Record<string, unknown>)
      : {};
  const categoriesOut: Record<string, Record<NotificationChannel, boolean>> = {};
  for (const [key, value] of Object.entries(categoriesIn)) {
    if (!ALLOWED_CATEGORIES.has(key as NotificationCategory)) continue;
    if (!value || typeof value !== 'object') continue;
    const channelsIn = value as Record<string, unknown>;
    const channelsOut: Record<NotificationChannel, boolean> = {
      in_app: CATEGORY_DEFAULTS[key as NotificationCategory].in_app,
      email: CATEGORY_DEFAULTS[key as NotificationCategory].email,
      push: CATEGORY_DEFAULTS[key as NotificationCategory].push,
      sms: false,
    };
    for (const [ch, val] of Object.entries(channelsIn)) {
      if (!ALLOWED_CHANNELS.has(ch as NotificationChannel)) continue;
      if (typeof val !== 'boolean') continue;
      if (ch === 'sms') continue;
      channelsOut[ch as NotificationChannel] = val;
    }
    categoriesOut[key] = channelsOut;
  }
  out.categories = categoriesOut;
  return out;
}

@Public()
@Controller('public/notification-preferences')
export class PublicNotificationPreferencesController {
  constructor(
    private supabase: SupabaseService,
    private tokens: PreferenceTokenService,
  ) {}

  @Get()
  async getPrefs(@Query('token') token: string): Promise<{ preferences: unknown }> {
    if (!token?.trim()) {
      throw new UnauthorizedException('token required');
    }
    const payload = this.tokens.verify(token);
    if (payload.aud !== 'jobbie-preferences') {
      throw new UnauthorizedException('Invalid token audience');
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('notification_preferences')
      .eq('id', payload.sub)
      .maybeSingle();
    if (error || !data) {
      throw new UnauthorizedException('User not found');
    }
    return { preferences: (data as { notification_preferences?: unknown }).notification_preferences ?? {} };
  }

  @Patch()
  async patchPrefs(
    @Query('token') token: string,
    @Body() body: { preferences: Record<string, unknown> },
  ): Promise<{ ok: true }> {
    if (!token?.trim()) {
      throw new UnauthorizedException('token required');
    }
    const payload = this.tokens.verify(token);
    if (payload.aud !== 'jobbie-preferences') {
      throw new UnauthorizedException('Invalid token audience');
    }
    // Reject unknown categories / channels and merge with the existing row
    // instead of overwriting. Avoids token-holder being able to nuke unrelated
    // settings or stuff arbitrary JSON into the column.
    const incoming = sanitizePreferences(body?.preferences);
    const { data: existing, error: readErr } = await this.supabase
      .getClient()
      .from('profiles')
      .select('notification_preferences')
      .eq('id', payload.sub)
      .maybeSingle();
    if (readErr || !existing) {
      throw new UnauthorizedException('User not found');
    }
    const previous = sanitizePreferences(
      (existing as { notification_preferences?: unknown })
        .notification_preferences,
    );
    const merged: Record<string, unknown> = {
      v: 2,
      categories: {
        ...((previous.categories as Record<string, unknown>) ?? {}),
        ...((incoming.categories as Record<string, unknown>) ?? {}),
      },
    };
    const { error } = await this.supabase
      .getClient()
      .from('profiles')
      .update({ notification_preferences: merged })
      .eq('id', payload.sub);
    if (error) {
      throw new UnauthorizedException('Update failed');
    }
    return { ok: true };
  }

  @Patch('unsubscribe')
  async unsubscribe(
    @Query('token') token: string,
    @Body() body: { category: NotificationCategory },
  ): Promise<{ ok: true }> {
    if (!token?.trim()) {
      throw new UnauthorizedException('token required');
    }
    const payload = this.tokens.verify(token);
    if (payload.aud !== 'jobbie-unsubscribe' && payload.aud !== 'jobbie-preferences') {
      throw new UnauthorizedException('Invalid token audience');
    }
    const cat = body.category;
    if (!cat || !ALLOWED_CATEGORIES.has(cat)) {
      throw new BadRequestException('invalid category');
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('notification_preferences')
      .eq('id', payload.sub)
      .maybeSingle();
    if (error || !data) {
      throw new UnauthorizedException('User not found');
    }
    const raw = (data as { notification_preferences?: unknown }).notification_preferences;
    const base = raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : {};
    const categories = {
      ...(typeof base.categories === 'object' && base.categories !== null
        ? (base.categories as Record<string, Record<string, boolean>>)
        : {}),
    };
    const prev = categories[cat] ?? {};
    categories[cat] = {
      in_app: typeof prev.in_app === 'boolean' ? prev.in_app : true,
      email: false,
      push: typeof prev.push === 'boolean' ? prev.push : false,
      sms: false,
    };
    const next = { ...base, v: 2, categories };
    const { error: upErr } = await this.supabase
      .getClient()
      .from('profiles')
      .update({ notification_preferences: next })
      .eq('id', payload.sub);
    if (upErr) {
      throw new UnauthorizedException('Update failed');
    }
    return { ok: true };
  }
}
