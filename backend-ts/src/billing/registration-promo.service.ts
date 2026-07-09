import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreditsService } from './credits.service';

const NEW_ACCOUNT_HOURS = 48;
const PROMO_METADATA_KEY = 'registration_promo_code';

type ClaimResult =
  | { ok: true; campaignId: string; creditsAmount: number; redemptionId: string }
  | { ok: false; reason: string };

type CampaignRow = {
  id: string;
  code: string;
  credits_amount: number;
  max_redemptions: number;
  redemption_count: number;
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

@Injectable()
export class RegistrationPromoService {
  private readonly logger = new Logger(RegistrationPromoService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly credits: CreditsService,
    private readonly audit: AuditService,
  ) {}

  async getPublicStatus(): Promise<{ active: boolean }> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from('registration_promo_campaigns')
      .select('enabled, max_redemptions, redemption_count, starts_at, ends_at')
      .eq('enabled', true)
      .limit(20);

    if (error) {
      this.logger.warn(`getPublicStatus: ${error.message}`);
      return { active: false };
    }

    const active = (data ?? []).some((row) => {
      const r = row as CampaignRow;
      if (!r.enabled) return false;
      if (r.redemption_count >= r.max_redemptions) return false;
      if (r.starts_at && r.starts_at > now) return false;
      if (r.ends_at && r.ends_at <= now) return false;
      return true;
    });

    return { active };
  }

  async validateCode(code: string): Promise<{ valid: boolean }> {
    const normalized = code.trim();
    if (!normalized) {
      return { valid: false };
    }

    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from('registration_promo_campaigns')
      .select('enabled, max_redemptions, redemption_count, starts_at, ends_at, code')
      .eq('enabled', true);

    if (error) {
      this.logger.warn(`validateCode: ${error.message}`);
      return { valid: false };
    }

    const match = (data ?? []).find(
      (row) =>
        String((row as CampaignRow).code ?? '').toUpperCase() ===
        normalized.toUpperCase(),
    ) as CampaignRow | undefined;

    if (!match) {
      return { valid: false };
    }
    if (match.redemption_count >= match.max_redemptions) {
      return { valid: false };
    }
    if (match.starts_at && match.starts_at > now) {
      return { valid: false };
    }
    if (match.ends_at && match.ends_at <= now) {
      return { valid: false };
    }

    return { valid: true };
  }

  async redeem(
    userId: string,
    codeFromBody?: string | null,
    useMetadataFallback = false,
  ): Promise<{
    ok: boolean;
    credits_granted?: number;
    reason?: string;
  }> {
    const code =
      codeFromBody?.trim() ||
      (useMetadataFallback
        ? await this.readPromoCodeFromUserMetadata(userId)
        : null);
    if (!code) {
      return { ok: false, reason: 'no_code' };
    }

    const refId = await this.resolveExistingGrantRef(userId);
    if (refId) {
      const amount = await this.readGrantedAmountFromLedger(userId, refId);
      if (amount != null) {
        return { ok: true, credits_granted: amount };
      }
    }

    const claim = await this.claimRedemption(userId, code);
    if (!claim.ok) {
      return { ok: false, reason: claim.reason };
    }

    const grantRef = `${claim.campaignId}:${userId}`;
    if (await this.ledgerHasRegistrationPromoGrant(userId, grantRef)) {
      return { ok: true, credits_granted: claim.creditsAmount };
    }

    await this.audit.recordAuditEvent({
      actorUserId: userId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'credits.registration_promo',
      subjectType: 'registration_promo_campaign',
      subjectId: claim.campaignId,
      payload: {
        credits: claim.creditsAmount,
        redemption_id: claim.redemptionId,
      },
    });

    await this.credits.grant(userId, claim.creditsAmount, {
      reason: 'registration_promo',
      source: 'free_grant',
      refType: 'registration_promo',
      refId: grantRef,
    });

    await this.clearPromoCodeFromUserMetadata(userId);

    return { ok: true, credits_granted: claim.creditsAmount };
  }

  async listCampaigns(): Promise<CampaignRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('registration_promo_campaigns')
      .select(
        'id, code, credits_amount, max_redemptions, redemption_count, enabled, starts_at, ends_at',
      )
      .order('created_at', { ascending: true });

    if (error) {
      throw new ServiceUnavailableException(error.message);
    }
    return (data ?? []) as CampaignRow[];
  }

  async updateCampaign(
    campaignId: string,
    patch: {
      enabled?: boolean;
      credits_amount?: number;
      max_redemptions?: number;
      starts_at?: string | null;
      ends_at?: string | null;
    },
  ): Promise<CampaignRow> {
    if (
      patch.credits_amount != null &&
      (!Number.isInteger(patch.credits_amount) ||
        patch.credits_amount < 1 ||
        patch.credits_amount > 500)
    ) {
      throw new BadRequestException('credits_amount must be 1–500.');
    }
    if (
      patch.max_redemptions != null &&
      (!Number.isInteger(patch.max_redemptions) || patch.max_redemptions < 1)
    ) {
      throw new BadRequestException('max_redemptions must be a positive integer.');
    }

    const { data: existing, error: readErr } = await this.supabase
      .getClient()
      .from('registration_promo_campaigns')
      .select('redemption_count')
      .eq('id', campaignId)
      .maybeSingle();

    if (readErr) {
      throw new ServiceUnavailableException(readErr.message);
    }
    if (!existing) {
      throw new BadRequestException('Campaign not found.');
    }

    const redemptionCount =
      (existing as { redemption_count?: number }).redemption_count ?? 0;
    if (
      patch.max_redemptions != null &&
      patch.max_redemptions < redemptionCount
    ) {
      throw new BadRequestException(
        'max_redemptions cannot be below current redemption_count.',
      );
    }

    const { data, error } = await this.supabase
      .getClient()
      .from('registration_promo_campaigns')
      .update(patch)
      .eq('id', campaignId)
      .select(
        'id, code, credits_amount, max_redemptions, redemption_count, enabled, starts_at, ends_at',
      )
      .single();

    if (error) {
      throw new ServiceUnavailableException(error.message);
    }

    return data as CampaignRow;
  }

  private async claimRedemption(
    userId: string,
    code: string,
  ): Promise<ClaimResult> {
    const { data, error } = await this.supabase.getClient().rpc(
      'claim_registration_promo_redemption',
      {
        p_user_id: userId,
        p_code: code,
        p_new_account_hours: NEW_ACCOUNT_HOURS,
      },
    );

    if (error) {
      this.logger.warn(`claim_registration_promo_redemption: ${error.message}`);
      throw new ServiceUnavailableException(error.message);
    }

    const payload = (data ?? {}) as {
      ok?: boolean;
      reason?: string;
      campaign_id?: string;
      credits_amount?: number;
      redemption_id?: string;
    };

    if (!payload.ok) {
      return { ok: false, reason: payload.reason ?? 'invalid' };
    }

    const campaignId = payload.campaign_id ?? '';
    const creditsAmount = payload.credits_amount ?? 0;
    const redemptionId = payload.redemption_id ?? '';
    if (!campaignId || creditsAmount < 1 || !redemptionId) {
      throw new ServiceUnavailableException('Invalid claim response.');
    }

    return {
      ok: true,
      campaignId,
      creditsAmount,
      redemptionId,
    };
  }

  private async ledgerHasRegistrationPromoGrant(
    userId: string,
    refId: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .getClient()
      .from('credit_ledger')
      .select('id')
      .eq('user_id', userId)
      .eq('ref_type', 'registration_promo')
      .eq('ref_id', refId)
      .maybeSingle();
    return Boolean(data);
  }

  private async resolveExistingGrantRef(userId: string): Promise<string | null> {
    const { data } = await this.supabase
      .getClient()
      .from('registration_promo_redemptions')
      .select('campaign_id')
      .eq('user_id', userId)
      .maybeSingle();

    const campaignId = (data as { campaign_id?: string } | null)?.campaign_id;
    if (!campaignId) {
      return null;
    }
    return `${campaignId}:${userId}`;
  }

  private async readGrantedAmountFromLedger(
    userId: string,
    refId: string,
  ): Promise<number | null> {
    const { data } = await this.supabase
      .getClient()
      .from('credit_ledger')
      .select('delta')
      .eq('user_id', userId)
      .eq('ref_type', 'registration_promo')
      .eq('ref_id', refId)
      .maybeSingle();

    const delta = (data as { delta?: number } | null)?.delta;
    return typeof delta === 'number' && delta > 0 ? delta : null;
  }

  private async readPromoCodeFromUserMetadata(
    userId: string,
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .getClient()
      .auth.admin.getUserById(userId);

    if (error || !data.user) {
      return null;
    }

    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const raw = meta[PROMO_METADATA_KEY];
    if (typeof raw !== 'string') {
      return null;
    }
    const trimmed = raw.trim();
    return trimmed || null;
  }

  private async clearPromoCodeFromUserMetadata(userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .auth.admin.getUserById(userId);

    if (error || !data.user) {
      return;
    }

    const meta = { ...(data.user.user_metadata ?? {}) } as Record<string, unknown>;
    if (!(PROMO_METADATA_KEY in meta)) {
      return;
    }
    delete meta[PROMO_METADATA_KEY];

    await this.supabase.getClient().auth.admin.updateUserById(userId, {
      user_metadata: meta,
    });
  }
}
