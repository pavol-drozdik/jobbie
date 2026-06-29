import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';

const DELETED_ACCOUNT_DISPLAY_NAME = 'Zmazaný účet';
const CLOSED_EMPLOYER_JOB_LABEL = 'Zamestnávateľ — účet ukončený';
const CLOSE_CONFIRM_PHRASE = 'ZMAZAT UCET';

@Injectable()
export class AdminAccountCloseService {
  private readonly logger = new Logger(AdminAccountCloseService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async closeAccount(
    targetUserId: string,
    adminUserId: string,
    confirmPhrase: string,
  ): Promise<{ closed: boolean }> {
    if (confirmPhrase.trim() !== CLOSE_CONFIRM_PHRASE) {
      throw new BadRequestException(
        `Potvrďte frázou "${CLOSE_CONFIRM_PHRASE}".`,
      );
    }

    const client = this.supabase.getClient();
    const { data: profile } = await client
      .from('profiles')
      .select('id, is_deleted, account_status')
      .eq('id', targetUserId)
      .maybeSingle();
    if (!profile) {
      throw new BadRequestException('User not found');
    }
    if ((profile as { is_deleted?: boolean }).is_deleted === true) {
      throw new BadRequestException('Account already closed');
    }

    await client
      .from('job_offers')
      .update({
        is_active: false,
        employer_name: CLOSED_EMPLOYER_JOB_LABEL,
        employer_email: null,
      })
      .eq('company_id', targetUserId)
      .eq('is_deleted', false);

    const now = new Date().toISOString();
    const { error: adsErr } = await client
      .from('company_ads')
      .update({ status: 'archived', updated_at: now })
      .eq('owner_id', targetUserId)
      .eq('status', 'active');
    if (adsErr) {
      this.logger.warn(
        `company_ads archive on account closure: ${adsErr.message}`,
      );
    }

    const deletedAt = new Date().toISOString();
    await client
      .from('job_email_alerts')
      .update({ is_active: false })
      .eq('user_id', targetUserId);

    const { data: ownedCvs } = await client
      .from('cvs')
      .select('id')
      .eq('user_id', targetUserId);
    const cvIds = (ownedCvs ?? []).map((r) => String((r as { id: string }).id));
    if (cvIds.length > 0) {
      await client
        .from('cvs')
        .update({ visible_to_employers: false })
        .in('id', cvIds);
      await client
        .from('cv_personal_info')
        .update({
          email: null,
          phone: null,
          linkedin_url: null,
          address_street: null,
          birth_date: null,
          gender: null,
        })
        .in('cv_id', cvIds);
    }

    const { data: authBefore } = await client.auth.admin.getUserById(targetUserId);
    const emailNorm = authBefore?.user?.email?.trim().toLowerCase();
    if (emailNorm) {
      await client
        .from('subscribers')
        .update({ consent: false })
        .eq('email', emailNorm);
    }

    const { error: scrubErr } = await client
      .from('profiles')
      .update({
        is_deleted: true,
        deleted_at: deletedAt,
        account_status: 'closed',
        display_name: DELETED_ACCOUNT_DISPLAY_NAME,
        company_name: null,
        first_name: null,
        last_name: null,
        phone_e164: null,
        phone_verified_at: null,
        bio: null,
        education: null,
        skills: null,
        job_interests: null,
        location: null,
        description: null,
        sector: null,
        experience: null,
        registration_number: null,
        website: null,
        avatar_url: null,
        logo_url: null,
        tax_id: null,
        vat_id: null,
        registered_office: null,
        notification_preferences: {
          new_applications: false,
          messages: false,
          reviews: false,
        },
        chat_identity_public_key: null,
        chat_identity_key_updated_at: null,
        public_show_account_email: false,
        public_profile_enabled: false,
        public_show_phone: false,
        public_show_address: false,
        public_allow_platform_contact: false,
        public_show_in_company_search: false,
        marketing_processing_consent: false,
        billing_details: {},
      })
      .eq('id', targetUserId);

    if (scrubErr) {
      this.logger.error(`Profile scrub failed: ${scrubErr.message}`);
      throw new InternalServerErrorException('Account closure failed');
    }

    await client
      .from('api_user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', targetUserId)
      .is('revoked_at', null);

    const deadEmail = `deleted+${targetUserId}@noreply.jobbie.invalid`;
    const { error: authErr } = await client.auth.admin.updateUserById(
      targetUserId,
      {
        email: deadEmail,
        password: randomBytes(32).toString('hex'),
        ban_duration: '876000h',
      },
    );
    if (authErr) {
      this.logger.error(`Auth ban failed: ${authErr.message}`);
      throw new InternalServerErrorException('Account closure failed');
    }

    const { error: identityErr } = await client.rpc(
      'unlink_auth_identities_for_closed_account',
      { p_user_id: targetUserId },
    );
    if (identityErr) {
      this.logger.error(`unlink_auth_identities failed: ${identityErr.message}`);
      throw new InternalServerErrorException('Account closure failed');
    }

    void this.audit.recordAuditEvent({
      actorUserId: adminUserId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'admin.user.account_closed',
      subjectType: 'profile',
      subjectId: targetUserId,
      payload: { deleted_at: deletedAt },
    });

    return { closed: true };
  }
}
