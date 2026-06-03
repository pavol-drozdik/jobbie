import { Injectable } from '@nestjs/common';
import archiver = require('archiver');
import { PassThrough } from 'stream';
import { SupabaseService } from '../supabase/supabase.service';
import { CvService } from '../cv/cv.service';
import { serializeNotificationPreferencesForClient } from '../notifications/notification-prefs-merge.util';

const README_TEXT = `JOBBIE — export osobných údajov (GDPR)
=====================================

Tento archív obsahuje kópiu údajov uložených vo vašom účte k dátumu exportu.
Súbor data.json je strojovo čitateľný prenos údajov.

Údaje uchovávame podľa zásad ochrany osobných údajov Jobbie.
Po zmazaní účtu sú osobné údaje profilu anonymizované; niektoré záznamy
(metadáta transakcií, audit) môžu byť uchované po zákonne požadovanú dobu.

Otázky: podpora@jobbie.sk
`;

/** GDPR ZIP — add new personal data tables/fields to buildExportPayload when schema grows. */
@Injectable()
export class DataExportService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly cvService: CvService,
  ) {}

  async buildExportPayload(userId: string): Promise<Record<string, unknown>> {
    const client = this.supabase.getClient();
    const { data: profile } = await client
      .from('profiles')
      .select(
        'id, role, display_name, company_name, first_name, last_name, phone_e164, bio, location, sector, skills, notification_preferences, marketing_processing_consent, public_profile_enabled, public_show_phone, public_show_address, public_allow_platform_contact, public_show_in_company_search, billing_details, created_at, deleted_at, is_deleted',
      )
      .eq('id', userId)
      .maybeSingle();

    const { data: consents } = await client
      .from('consent_events')
      .select('consent_type, granted, source, recorded_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(500);

    const { data: alerts } = await client
      .from('job_email_alerts')
      .select(
        'id, name, is_active, frequency, newsletter, criteria_hash, created_at, updated_at, last_dispatch_at',
      )
      .eq('user_id', userId);

    const { data: applications } = await client
      .from('applications')
      .select('id, job_id, status, created_at, updated_at')
      .eq('individual_id', userId)
      .eq('is_deleted', false)
      .limit(500);

    const { data: chatRooms } = await client
      .from('chat_rooms')
      .select('id, company_id, individual_id, created_at')
      .or(`company_id.eq.${userId},individual_id.eq.${userId}`)
      .limit(200);

    const cvList = await this.cvService.listMyCvs(userId);
    const cvExports: unknown[] = [];
    for (const item of cvList) {
      const agg = await this.cvService.getAggregateByCvId(item.id, userId);
      if (agg) {
        cvExports.push(agg);
      }
    }

    const billing =
      profile && typeof (profile as { billing_details?: unknown }).billing_details === 'object'
        ? (profile as { billing_details: Record<string, unknown> }).billing_details
        : {};
    const safeBilling = { ...billing };
    for (const key of ['card_number', 'cvv', 'pan']) {
      if (key in safeBilling) {
        delete safeBilling[key];
      }
    }

    const prefs = (profile as { notification_preferences?: unknown } | null)
      ?.notification_preferences;

    return {
      exported_at: new Date().toISOString(),
      profile: profile
        ? {
            ...(profile as object),
            billing_details: safeBilling,
            notification_preferences: serializeNotificationPreferencesForClient(prefs),
          }
        : null,
      consent_events: consents ?? [],
      job_email_alerts: alerts ?? [],
      applications: applications ?? [],
      chat_rooms: (chatRooms ?? []).map((r) => ({
        id: (r as { id: string }).id,
        company_id: (r as { company_id?: string }).company_id ?? null,
        individual_id: (r as { individual_id?: string }).individual_id ?? null,
        created_at: (r as { created_at?: string }).created_at ?? null,
      })),
      cvs: cvExports,
    };
  }

  async buildExportZip(userId: string): Promise<Buffer> {
    const payload = await this.buildExportPayload(userId);
    const json = JSON.stringify(payload, null, 2);
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const stream = new PassThrough();
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
      archive.on('error', reject);
      archive.pipe(stream);
      archive.append(json, { name: 'data.json' });
      archive.append(README_TEXT, { name: 'README.txt' });
      void archive.finalize();
    });
  }
}
