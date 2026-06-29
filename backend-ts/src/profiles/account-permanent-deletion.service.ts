import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { NewsletterService } from '../newsletter/newsletter.service';
import { StripeService } from '../payments/stripe.service';
import { SearchIndexingService } from '../search/search-indexing.service';
import { SupabaseService } from '../supabase/supabase.service';
import { JwtVerifyService } from '../auth/jwt-verify.service';
import { AccountClosureListingsService } from './account-closure-listings.service';

const CLOSED_EMPLOYER_JOB_LABEL = 'Zverejňovateľ odstránil účet';

export type PermanentAccountDeletionAudit = {
  actorUserId: string;
  eventType: 'account.deleted' | 'admin.user.account_deleted';
};

/**
 * GDPR erasure: cancel billing, hide listings, then hard-delete auth.users
 * (profiles + user-owned rows cascade). Distinct from admin suspend/ban enforcement.
 */
@Injectable()
export class AccountPermanentDeletionService {
  private readonly logger = new Logger(AccountPermanentDeletionService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly stripeService: StripeService,
    private readonly accountClosureListings: AccountClosureListingsService,
    private readonly searchIndexing: SearchIndexingService,
    private readonly newsletter: NewsletterService,
    private readonly audit: AuditService,
    private readonly jwtVerify: JwtVerifyService,
  ) {}

  async permanentlyDeleteAccount(
    userId: string,
    auditMeta: PermanentAccountDeletionAudit,
  ): Promise<{ deleted: boolean }> {
    await this.stripeService.cancelStripeSubscriptionBeforeAccountDeletion(
      userId,
    );
    const client = this.supabase.getClient();
    await this.accountClosureListings.deactivateForClosedAccount(
      userId,
      CLOSED_EMPLOYER_JOB_LABEL,
    );
    await this.searchIndexing.removeProfileById(userId);

    const deletedAt = new Date().toISOString();
    await client
      .from('job_email_alerts')
      .update({ is_active: false })
      .eq('user_id', userId);

    const { data: ownedCvs } = await client
      .from('cvs')
      .select('id')
      .eq('user_id', userId);
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

    const { data: authBeforeDelete } = await client.auth.admin.getUserById(userId);
    const emailNorm = authBeforeDelete?.user?.email?.trim().toLowerCase();
    if (emailNorm) {
      await client
        .from('subscribers')
        .update({ consent: false })
        .eq('email', emailNorm);
    }

    await client
      .from('api_user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('revoked_at', null);

    if (emailNorm) {
      await this.newsletter.withdrawMarketingForUser(userId);
    }

    await this.audit.recordAuditEvent({
      actorUserId: auditMeta.actorUserId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: auditMeta.eventType,
      subjectType: 'profile',
      subjectId: userId,
      payload: { deleted_at: deletedAt, permanent: true },
    });

    const { error: deleteErr } = await client.auth.admin.deleteUser(userId);
    if (deleteErr) {
      this.logger.error(
        `auth.admin.deleteUser failed for ${userId}: ${deleteErr.message}`,
      );
      throw new InternalServerErrorException(
        'Nepodarilo sa dokončiť odstránenie účtu.',
      );
    }

    this.jwtVerify.invalidateProfileCache(userId);
    return { deleted: true };
  }
}
