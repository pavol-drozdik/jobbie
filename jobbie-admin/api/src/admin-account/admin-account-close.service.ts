import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';

const CLOSED_EMPLOYER_JOB_LABEL = 'Zamestnávateľ — účet ukončený';
const CLOSE_CONFIRM_PHRASE = 'ZMAZAT UCET';

@Injectable()
export class AdminAccountCloseService {
  private readonly logger = new Logger(AdminAccountCloseService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Permanent GDPR erasure — not admin suspend/ban (see suspend endpoint). */
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
      .select('id')
      .eq('id', targetUserId)
      .maybeSingle();
    if (!profile) {
      throw new BadRequestException('User not found');
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
        `company_ads archive on account deletion: ${adsErr.message}`,
      );
    }

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

    await client
      .from('api_user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', targetUserId)
      .is('revoked_at', null);

    const deletedAt = new Date().toISOString();
    await this.audit.recordAuditEvent({
      actorUserId: adminUserId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'admin.user.account_deleted',
      subjectType: 'profile',
      subjectId: targetUserId,
      payload: { deleted_at: deletedAt, permanent: true },
    });

    const { error: deleteErr } = await client.auth.admin.deleteUser(targetUserId);
    if (deleteErr) {
      this.logger.error(`auth.admin.deleteUser failed: ${deleteErr.message}`);
      throw new InternalServerErrorException('Account deletion failed');
    }

    return { closed: true };
  }
}
