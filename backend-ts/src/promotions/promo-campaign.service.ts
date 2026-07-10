import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import StripeSdk from 'stripe';
import { AuditService } from '../audit/audit.service';
import { CreditsService } from '../billing/credits.service';
import { SubscriptionTrialService } from '../billing/subscription-trial.service';
import { STRIPE_API_VERSION, type StripeClient } from '../payments/stripe-types';
import { SupabaseService } from '../supabase/supabase.service';
import {
  AdminCreatePromoCampaignDto,
  AdminUpdatePromoCampaignDto,
} from './promo-campaign.dto';
import { PromoStripeCouponService } from './promo-stripe-coupon.service';
import {
  PROMO_METADATA_KEY,
  type PromoCampaignRow,
  type PromoPoolCodeRow,
  type PromoRedemptionContext,
  type PromoRedemptionRow,
  type PromoRewardType,
} from './promo-campaign.types';

export type PromoEligibilityReason =
  | 'invalid_code'
  | 'inactive'
  | 'exhausted'
  | 'account_too_old'
  | 'first_publish_required'
  | 'promo_code_required'
  | 'wrong_reward_type'
  | 'pack_not_eligible'
  | 'plan_not_eligible'
  | 'already_redeemed'
  | 'wrong_profile_role'
  | 'prior_subscription'
  | 'pool_code_invalid'
  | 'pool_code_exhausted'
  | 'prior_published_offer';

/** Reasons safe to return from public POST /promotions/validate (no cap leakage). */
export const PUBLIC_SAFE_VALIDATE_REASONS: ReadonlySet<PromoEligibilityReason> =
  new Set([
    'invalid_code',
    'pool_code_invalid',
    'pool_code_exhausted',
    'promo_code_required',
    'wrong_reward_type',
    'pack_not_eligible',
    'plan_not_eligible',
    'account_too_old',
    'first_publish_required',
    'already_redeemed',
    'wrong_profile_role',
    'prior_subscription',
    'prior_published_offer',
    'inactive',
  ]);

export type PromoCodeResolution = {
  campaign: PromoCampaignRow;
  poolCode: PromoPoolCodeRow | null;
};

export type PromoPreview = {
  original_cents: number;
  discounted_cents: number;
  percent_off?: number;
  amount_off_cents?: number;
  duration_label?: string;
};

@Injectable()
export class PromoCampaignService {
  private readonly logger = new Logger(PromoCampaignService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly credits: CreditsService,
    private readonly audit: AuditService,
    private readonly stripeCoupons: PromoStripeCouponService,
    private readonly subscriptionTrial: SubscriptionTrialService,
    private readonly config: ConfigService,
  ) {}

  private getStripeClient(): StripeClient | null {
    const key = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (!key) return null;
    return new StripeSdk(key, { apiVersion: STRIPE_API_VERSION }) as StripeClient;
  }

  normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  async listCampaigns(): Promise<PromoCampaignRow[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('promo_campaigns')
      .select('*')
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error) throw new ServiceUnavailableException(error.message);
    return (data ?? []) as PromoCampaignRow[];
  }

  async getCatalogOptions(): Promise<{
    credit_packs: Array<{ slug: string; name_sk: string; credits: number }>;
    subscription_plans: Array<{ slug: string; name_sk: string }>;
  }> {
    const client = this.supabase.getClient();
    const [packsRes, plansRes] = await Promise.all([
      client
        .from('credit_packs')
        .select('slug, name_sk, credits')
        .eq('active', true)
        .neq('slug', 'agentura')
        .order('sort_order'),
      client
        .from('subscription_plans')
        .select('slug, name_sk')
        .eq('active', true)
        .order('sort_order'),
    ]);
    return {
      credit_packs: (packsRes.data ?? []) as Array<{
        slug: string;
        name_sk: string;
        credits: number;
      }>,
      subscription_plans: (plansRes.data ?? []) as Array<{
        slug: string;
        name_sk: string;
      }>,
    };
  }

  async createCampaign(
    adminUserId: string,
    dto: AdminCreatePromoCampaignDto,
  ): Promise<PromoCampaignRow> {
    this.assertRewardShape(dto);
    const row = this.buildInsertRow(dto);
    const { data, error } = await this.supabase
      .getClient()
      .from('promo_campaigns')
      .insert(row)
      .select('*')
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new BadRequestException('Promo kód už existuje.');
      }
      throw new ServiceUnavailableException(error.message);
    }
    let campaign = data as PromoCampaignRow;
    if (campaign.reward_type === 'subscription_discount') {
      const couponId = await this.stripeCoupons.syncCouponForCampaign(campaign);
      if (couponId) {
        const { data: updated } = await this.supabase
          .getClient()
          .from('promo_campaigns')
          .update({ stripe_coupon_id: couponId })
          .eq('id', campaign.id)
          .select('*')
          .single();
        campaign = (updated ?? campaign) as PromoCampaignRow;
      }
    }
    void this.audit.recordAuditEvent({
      actorUserId: adminUserId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'admin.promo_campaign.created',
      subjectType: 'promo_campaign',
      subjectId: campaign.id,
      payload: { code: campaign.code, reward_type: campaign.reward_type },
    });
    return campaign;
  }

  async updateCampaign(
    adminUserId: string,
    campaignId: string,
    dto: AdminUpdatePromoCampaignDto,
  ): Promise<PromoCampaignRow> {
    const existing = await this.getCampaignById(campaignId);
    if (
      dto.max_redemptions != null &&
      dto.max_redemptions < existing.redemption_count
    ) {
      throw new BadRequestException(
        'max_redemptions cannot be below current redemption_count.',
      );
    }
    const patch: Record<string, unknown> = { ...dto };
    if (dto.code) patch.code = this.normalizeCode(dto.code);
    if (dto.archived === true) {
      patch.archived_at = new Date().toISOString();
      patch.enabled = false;
      delete patch.archived;
    } else if (dto.archived === false) {
      patch.archived_at = null;
      delete patch.archived;
    }
    const rewardType =
      dto.reward_type ?? existing.reward_type;
    if (
      rewardType &&
      (dto.discount_kind != null ||
        dto.reward_percent != null ||
        dto.reward_amount_cents != null)
    ) {
      const discount = this.resolveDiscountFields(
        { ...dto, reward_type: rewardType } as AdminCreatePromoCampaignDto,
        rewardType,
      );
      patch.discount_kind = discount.discount_kind;
      patch.reward_percent = discount.reward_percent;
      patch.reward_amount_cents = discount.reward_amount_cents;
    }
    if (
      dto.subscription_discount_duration &&
      dto.subscription_discount_duration !== 'repeating'
    ) {
      patch.subscription_discount_duration_months = null;
    }
    const { data, error } = await this.supabase
      .getClient()
      .from('promo_campaigns')
      .update(patch)
      .eq('id', campaignId)
      .select('*')
      .single();
    if (error) throw new ServiceUnavailableException(error.message);
    let campaign = data as PromoCampaignRow;
    if (campaign.reward_type === 'subscription_discount') {
      const couponId = await this.stripeCoupons.syncCouponForCampaign(campaign);
      if (couponId && couponId !== campaign.stripe_coupon_id) {
        const { data: updated } = await this.supabase
          .getClient()
          .from('promo_campaigns')
          .update({ stripe_coupon_id: couponId })
          .eq('id', campaign.id)
          .select('*')
          .single();
        campaign = (updated ?? campaign) as PromoCampaignRow;
      }
    }
    void this.audit.recordAuditEvent({
      actorUserId: adminUserId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'admin.promo_campaign.updated',
      subjectType: 'promo_campaign',
      subjectId: campaignId,
      payload: { patch: dto },
    });
    return campaign;
  }

  async getListPriceCents(input: {
    context: 'credit_checkout' | 'subscription_checkout';
    packSlug?: string;
    planSlug?: string;
  }): Promise<number | undefined> {
    if (input.context === 'credit_checkout' && input.packSlug) {
      const { data } = await this.supabase
        .getClient()
        .from('credit_packs')
        .select('unit_amount')
        .eq('slug', input.packSlug)
        .maybeSingle();
      return (data as { unit_amount?: number } | null)?.unit_amount;
    }
    if (input.context === 'subscription_checkout' && input.planSlug) {
      const { data } = await this.supabase
        .getClient()
        .from('subscription_plans')
        .select('price_monthly_cents')
        .eq('slug', input.planSlug)
        .maybeSingle();
      return (data as { price_monthly_cents?: number } | null)?.price_monthly_cents;
    }
    return undefined;
  }

  async getPublicActive(): Promise<{
    active: boolean;
    registration: boolean;
    credit_checkout: boolean;
    subscription_checkout: boolean;
    registration_pool_mode?: boolean;
  }> {
    const campaigns = await this.listCampaigns();
    const now = Date.now();
    const live = campaigns.filter((c) => this.isScheduleAndCapacityOk(c, now));
    const redeemable = await this.filterRedeemableCampaigns(live);
    const registrationCampaigns = redeemable.filter((c) =>
      this.isRegistrationPromoCampaign(c),
    );
    return {
      active: redeemable.length > 0,
      registration: registrationCampaigns.length > 0,
      credit_checkout: redeemable.some(
        (c) => c.reward_type === 'credit_pack_discount',
      ),
      subscription_checkout: redeemable.some(
        (c) => c.reward_type === 'subscription_discount',
      ),
      registration_pool_mode: registrationCampaigns.some(
        (c) => c.code_mode === 'unique_pool',
      ),
    };
  }

  static filterPublicValidateReasons(
    reasons: PromoEligibilityReason[],
  ): PromoEligibilityReason[] {
    return [...new Set(reasons)].filter((r) =>
      PUBLIC_SAFE_VALIDATE_REASONS.has(r),
    );
  }

  async releasePromoRedemption(
    redemptionId: string,
  ): Promise<{ ok: boolean; reason?: string }> {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('release_promo_campaign_redemption', {
        p_redemption_id: redemptionId,
      });
    if (error) {
      this.logger.warn(`releasePromoRedemption RPC failed: ${error.message}`);
      return { ok: false, reason: 'release_failed' };
    }
    const result = data as { ok?: boolean; reason?: string };
    return { ok: result?.ok === true, reason: result?.reason };
  }

  async releasePromoRedemptionByPaymentIntent(
    paymentIntentId: string,
  ): Promise<void> {
    const redemption = await this.getRedemptionByPaymentIntent(paymentIntentId);
    if (!redemption || redemption.status !== 'pending') return;
    const result = await this.releasePromoRedemption(redemption.id);
    if (result.ok) {
      this.logger.log(
        `Released pending promo redemption ${redemption.id} for PI ${paymentIntentId}`,
      );
    }
  }

  async releaseStalePendingRedemptions(
    maxAgeHours?: number,
  ): Promise<number> {
    const hours =
      maxAgeHours ??
      (Number(this.config.get<string>('PROMO_PENDING_MAX_AGE_HOURS')) || 24);
    const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from('promo_campaign_redemptions')
      .select('id')
      .eq('status', 'pending')
      .lt('created_at', cutoff)
      .limit(200);
    if (error) {
      this.logger.warn(`releaseStalePendingRedemptions: ${error.message}`);
      return 0;
    }
    let released = 0;
    for (const row of (data ?? []) as { id: string }[]) {
      const result = await this.releasePromoRedemption(row.id);
      if (result.ok) released += 1;
    }
    if (released > 0) {
      this.logger.log(`Released ${released} stale pending promo redemption(s).`);
    }
    return released;
  }

  private async filterRedeemableCampaigns(
    campaigns: PromoCampaignRow[],
  ): Promise<PromoCampaignRow[]> {
    const poolCampaignIds = campaigns
      .filter((c) => c.code_mode === 'unique_pool')
      .map((c) => c.id);
    if (poolCampaignIds.length === 0) return campaigns;

    const { data, error } = await this.supabase
      .getClient()
      .from('promo_campaign_codes')
      .select('campaign_id')
      .in('campaign_id', poolCampaignIds)
      .eq('status', 'available');
    if (error) {
      this.logger.warn(`filterRedeemableCampaigns: ${error.message}`);
      return campaigns.filter((c) => c.code_mode !== 'unique_pool');
    }
    const withAvailable = new Set(
      ((data ?? []) as { campaign_id: string }[]).map((r) => r.campaign_id),
    );
    return campaigns.filter(
      (c) => c.code_mode !== 'unique_pool' || withAvailable.has(c.id),
    );
  }

  private isRegistrationPromoCampaign(campaign: PromoCampaignRow): boolean {
    return (
      campaign.reward_type === 'free_credits' && campaign.require_promo_code
    );
  }

  async findByCode(code: string): Promise<PromoCampaignRow | null> {
    const normalized = this.normalizeCode(code);
    const { data } = await this.supabase
      .getClient()
      .from('promo_campaigns')
      .select('*')
      .eq('code', normalized)
      .eq('code_mode', 'shared')
      .is('archived_at', null)
      .maybeSingle();
    if (!data) return null;
    return data as PromoCampaignRow;
  }

  async resolveCodeEntry(code: string): Promise<PromoCodeResolution | null> {
    const normalized = this.normalizeCode(code);
    if (!normalized) return null;

    const { data: poolRow } = await this.supabase
      .getClient()
      .from('promo_campaign_codes')
      .select('*, promo_campaigns(*)')
      .eq('code', normalized)
      .maybeSingle();

    if (poolRow) {
      const row = poolRow as PromoPoolCodeRow & {
        promo_campaigns?: PromoCampaignRow | null;
      };
      const campaign = row.promo_campaigns;
      if (campaign && !campaign.archived_at) {
        return {
          campaign,
          poolCode: {
            id: row.id,
            campaign_id: row.campaign_id,
            code: row.code,
            status: row.status,
            redeemed_by_user_id: row.redeemed_by_user_id,
            redemption_id: row.redemption_id,
            created_at: row.created_at,
            redeemed_at: row.redeemed_at,
          },
        };
      }
    }

    const { data: poolCampaign } = await this.supabase
      .getClient()
      .from('promo_campaigns')
      .select('*')
      .eq('code', normalized)
      .eq('code_mode', 'unique_pool')
      .is('archived_at', null)
      .maybeSingle();
    if (poolCampaign) {
      return {
        campaign: poolCampaign as PromoCampaignRow,
        poolCode: null,
      };
    }

    const campaign = await this.findByCode(normalized);
    if (!campaign) return null;
    return { campaign, poolCode: null };
  }

  async validateForUser(
    userId: string | null,
    input: {
      code?: string;
      context: PromoRedemptionContext;
      packSlug?: string;
      planSlug?: string;
      originalCents?: number;
    },
  ): Promise<{
    valid: boolean;
    reasons: PromoEligibilityReason[];
    preview?: PromoPreview;
    campaign?: PromoCampaignRow;
  }> {
    const reasons: PromoEligibilityReason[] = [];
    const code = input.code?.trim();
    const resolution = code ? await this.resolveCodeEntry(code) : null;
    if (code && !resolution) {
      return { valid: false, reasons: ['invalid_code'] };
    }
    const campaigns = resolution
      ? [resolution.campaign]
      : await this.listCampaigns();

    for (const campaign of campaigns) {
      if (!code && campaign.require_promo_code) continue;
      const campaignReasons = await this.collectEligibilityIssues(
        campaign,
        userId,
        input.context,
        code,
        resolution?.poolCode ?? null,
        input.packSlug,
        input.planSlug,
      );
      if (campaignReasons.length === 0) {
        let preview: PromoPreview | undefined;
        if (
          input.originalCents != null &&
          campaign.reward_type === 'credit_pack_discount'
        ) {
          preview = this.buildPreviewForCampaign(
            input.originalCents,
            campaign,
          );
        } else if (
          input.originalCents != null &&
          campaign.reward_type === 'subscription_discount' &&
          input.context === 'subscription_checkout'
        ) {
          preview = this.buildSubscriptionPreview(
            input.originalCents,
            campaign,
          );
        }
        return { valid: true, reasons: [], preview, campaign };
      }
      reasons.push(...campaignReasons);
    }
    return { valid: false, reasons: [...new Set(reasons)] };
  }

  async prepareCheckoutPromo(
    userId: string,
    context: 'credit_checkout' | 'subscription_checkout',
    code: string | undefined,
    target: { packSlug?: string; planSlug?: string; originalCents?: number },
  ): Promise<{
    campaign: PromoCampaignRow;
    redemptionId: string;
    discountedCents?: number;
    stripeCouponId?: string | null;
  }> {
    const validation = await this.validateForUser(userId, {
      code,
      context,
      packSlug: target.packSlug,
      planSlug: target.planSlug,
      originalCents: target.originalCents,
    });
    if (!validation.valid || !validation.campaign) {
      throw new BadRequestException(
        this.formatEligibilityMessage(validation.reasons),
      );
    }
    const campaign = validation.campaign;
    const resolution = code ? await this.resolveCodeEntry(code) : null;
    const claim = await this.claimRedemption(
      userId,
      campaign.id,
      context,
      resolution?.poolCode?.id,
    );
    if (!claim.ok) {
      throw new BadRequestException(this.formatClaimReason(claim.reason));
    }
    const result: {
      campaign: PromoCampaignRow;
      redemptionId: string;
      discountedCents?: number;
      stripeCouponId?: string | null;
    } = {
      campaign,
      redemptionId: claim.redemptionId,
    };
    if (
      context === 'credit_checkout' &&
      target.originalCents != null &&
      campaign.reward_type === 'credit_pack_discount'
    ) {
      result.discountedCents = this.buildPreviewForCampaign(
        target.originalCents,
        campaign,
      ).discounted_cents;
    }
    if (context === 'subscription_checkout') {
      let couponId = campaign.stripe_coupon_id;
      if (!couponId) {
        couponId = await this.stripeCoupons.syncCouponForCampaign(campaign);
        if (couponId) {
          await this.supabase
            .getClient()
            .from('promo_campaigns')
            .update({ stripe_coupon_id: couponId })
            .eq('id', campaign.id);
        }
      }
      result.stripeCouponId = couponId;
    }
    return result;
  }

  async redeemFreeCredits(
    userId: string,
    context: 'signup' | 'first_publish',
    code?: string | null,
    useMetadataFallback = false,
  ): Promise<{ ok: boolean; credits_granted?: number; reason?: string }> {
    const resolvedCode =
      code?.trim() ||
      (useMetadataFallback
        ? await this.readPromoCodeFromUserMetadata(userId)
        : null);
    if (!resolvedCode) {
      return { ok: false, reason: 'no_code' };
    }
    const existing = await this.findCompletedRedemptionForUserByCode(
      userId,
      resolvedCode,
    );
    if (existing?.credits_granted) {
      return { ok: true, credits_granted: existing.credits_granted };
    }
    const validation = await this.validateForUser(userId, {
      code: resolvedCode,
      context,
    });
    if (!validation.valid || !validation.campaign) {
      return { ok: false, reason: validation.reasons[0] ?? 'invalid' };
    }
    if (validation.campaign.reward_type !== 'free_credits') {
      return { ok: false, reason: 'wrong_reward_type' };
    }
    const claim = await this.claimRedemption(
      userId,
      validation.campaign.id,
      context,
      (await this.resolveCodeEntry(resolvedCode))?.poolCode?.id,
    );
    if (!claim.ok) {
      return { ok: false, reason: claim.reason };
    }
    const amount = validation.campaign.reward_credits ?? 0;
    const refId = `${validation.campaign.id}:${userId}`;
    if (!(await this.ledgerHasPromoGrant(userId, refId))) {
      await this.credits.grant(userId, amount, {
        reason: 'promo_campaign',
        source: 'free_grant',
        refType: 'promo_campaign',
        refId,
      });
      void this.audit.recordAuditEvent({
        actorUserId: userId,
        actorIp: null,
        actorUserAgent: null,
        sessionId: null,
        deviceId: null,
        eventType: 'credits.promo_campaign',
        subjectType: 'promo_campaign',
        subjectId: validation.campaign.id,
        payload: { credits: amount, context },
      });
    }
    await this.completeRedemption(claim.redemptionId, {
      credits_granted: amount,
    });
    await this.clearPromoCodeFromUserMetadata(userId);
    return { ok: true, credits_granted: amount };
  }

  async tryAutoGrantOnFirstPublish(userId: string): Promise<void> {
    const campaigns = await this.listCampaigns();
    for (const campaign of campaigns) {
      if (
        !campaign.enabled ||
        campaign.reward_type !== 'free_credits' ||
        !campaign.require_first_publish
      ) {
        continue;
      }
      const code = campaign.require_promo_code
        ? await this.readPromoCodeFromUserMetadata(userId)
        : campaign.code;
      if (campaign.require_promo_code && !code?.trim()) {
        continue;
      }
      const result = await this.redeemFreeCredits(
        userId,
        'first_publish',
        code ?? undefined,
        !code,
      );
      if (result.ok) {
        this.logger.log(
          `First-publish promo granted ${result.credits_granted} to ${userId}`,
        );
      }
    }
  }

  async completeRedemption(
    redemptionId: string,
    patch: {
      credits_granted?: number;
      percent_applied?: number;
      target_slug?: string;
      payment_intent_id?: string;
      stripe_subscription_id?: string;
    },
  ): Promise<void> {
    await this.supabase
      .getClient()
      .from('promo_campaign_redemptions')
      .update({
        ...patch,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', redemptionId);
  }

  async attachPaymentIntentToRedemption(
    redemptionId: string,
    paymentIntentId: string,
    patch?: {
      percent_applied?: number;
      target_slug?: string;
    },
  ): Promise<void> {
    await this.supabase
      .getClient()
      .from('promo_campaign_redemptions')
      .update({
        payment_intent_id: paymentIntentId,
        ...patch,
      })
      .eq('id', redemptionId);
  }

  async getRedemptionByPaymentIntent(
    paymentIntentId: string,
  ): Promise<PromoRedemptionRow | null> {
    const { data } = await this.supabase
      .getClient()
      .from('promo_campaign_redemptions')
      .select('*')
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();
    return (data as PromoRedemptionRow | null) ?? null;
  }

  async validateDiscountedCreditPayment(
    paymentIntentId: string,
    userId: string,
    expectedCredits: number,
    amountCents: number,
    listPriceCents: number,
  ): Promise<boolean> {
    const redemption = await this.getRedemptionByPaymentIntent(paymentIntentId);
    if (!redemption || redemption.user_id !== userId) return false;
    const campaign = await this.getCampaignById(redemption.campaign_id);
    if (campaign.reward_type !== 'credit_pack_discount') {
      return false;
    }
    const expectedDiscounted = this.buildPreviewForCampaign(
      listPriceCents,
      campaign,
    ).discounted_cents;
    return amountCents === expectedDiscounted;
  }

  private buildPreviewForCampaign(
    originalCents: number,
    campaign: PromoCampaignRow,
  ): PromoPreview {
    const kind = campaign.discount_kind ?? 'percent';
    if (kind === 'amount_off' && campaign.reward_amount_cents) {
      const discounted = Math.max(0, originalCents - campaign.reward_amount_cents);
      return {
        original_cents: originalCents,
        discounted_cents: discounted,
        amount_off_cents: campaign.reward_amount_cents,
      };
    }
    const percent = campaign.reward_percent ?? 0;
    return this.buildPreview(originalCents, percent);
  }

  private buildSubscriptionPreview(
    originalCents: number,
    campaign: PromoCampaignRow,
  ): PromoPreview {
    const base = this.buildPreviewForCampaign(originalCents, campaign);
    const duration = campaign.subscription_discount_duration ?? 'once';
    let durationLabel = 'len prvá platba';
    if (duration === 'forever') {
      durationLabel = 'všetky platby';
    } else if (duration === 'repeating') {
      durationLabel = `${campaign.subscription_discount_duration_months ?? 1} mesiacov`;
    }
    return { ...base, duration_label: durationLabel };
  }

  private buildPreview(originalCents: number, percent: number): PromoPreview {
    const discounted = Math.max(
      0,
      Math.round(originalCents * (100 - percent) / 100),
    );
    return {
      original_cents: originalCents,
      discounted_cents: discounted,
      percent_off: percent,
    };
  }

  private async claimRedemption(
    userId: string,
    campaignId: string,
    context: PromoRedemptionContext,
    poolCodeId?: string | null,
  ): Promise<
    | { ok: true; redemptionId: string }
    | { ok: false; reason: string }
  > {
    const { data, error } = await this.supabase.getClient().rpc(
      'claim_promo_campaign_redemption',
      {
        p_user_id: userId,
        p_campaign_id: campaignId,
        p_context: context,
        p_pool_code_id: poolCodeId ?? null,
      },
    );
    if (error) {
      this.logger.warn(`claim_promo_campaign_redemption: ${error.message}`);
      throw new ServiceUnavailableException(error.message);
    }
    const payload = (data ?? {}) as {
      ok?: boolean;
      reason?: string;
      redemption_id?: string;
    };
    if (!payload.ok) {
      return { ok: false, reason: payload.reason ?? 'invalid' };
    }
    if (!payload.redemption_id) {
      throw new ServiceUnavailableException('Invalid claim response.');
    }
    return { ok: true, redemptionId: payload.redemption_id };
  }

  private async collectEligibilityIssues(
    campaign: PromoCampaignRow,
    userId: string | null,
    context: PromoRedemptionContext,
    code: string | undefined,
    poolCode: PromoPoolCodeRow | null,
    packSlug?: string,
    planSlug?: string,
  ): Promise<PromoEligibilityReason[]> {
    const reasons: PromoEligibilityReason[] = [];
    const now = Date.now();
    const codeMode = campaign.code_mode ?? 'shared';
    if (!this.isScheduleAndCapacityOk(campaign, now)) {
      reasons.push(
        campaign.max_redemptions != null &&
        campaign.redemption_count >= campaign.max_redemptions
          ? 'exhausted'
          : 'inactive',
      );
    }
    if (codeMode === 'unique_pool' && campaign.require_promo_code) {
      if (!code?.trim()) {
        reasons.push('promo_code_required');
      } else if (!poolCode || poolCode.campaign_id !== campaign.id) {
        reasons.push('pool_code_invalid');
      } else if (poolCode.status !== 'available') {
        reasons.push('pool_code_exhausted');
      }
    } else if (campaign.require_promo_code) {
      if (!code?.trim()) {
        reasons.push('promo_code_required');
      } else if (this.normalizeCode(code) !== this.normalizeCode(campaign.code)) {
        reasons.push('invalid_code');
      }
    } else if (code?.trim()) {
      if (codeMode === 'unique_pool') {
        if (!poolCode || poolCode.campaign_id !== campaign.id) {
          reasons.push('pool_code_invalid');
        } else if (poolCode.status !== 'available') {
          reasons.push('pool_code_exhausted');
        }
      } else if (this.normalizeCode(code) !== this.normalizeCode(campaign.code)) {
        reasons.push('invalid_code');
      }
    }
    if (context === 'signup' || context === 'first_publish') {
      if (campaign.reward_type !== 'free_credits') {
        reasons.push('wrong_reward_type');
      }
    }
    if (context === 'credit_checkout') {
      if (campaign.reward_type !== 'credit_pack_discount') {
        reasons.push('wrong_reward_type');
      } else if (
        packSlug &&
        !campaign.reward_all_credit_packs &&
        !campaign.reward_credit_pack_slugs.includes(packSlug)
      ) {
        reasons.push('pack_not_eligible');
      }
    }
    if (context === 'subscription_checkout') {
      if (campaign.reward_type !== 'subscription_discount') {
        reasons.push('wrong_reward_type');
      } else if (
        planSlug &&
        !campaign.reward_all_subscription_plans &&
        !campaign.reward_subscription_plan_slugs.includes(planSlug)
      ) {
        reasons.push('plan_not_eligible');
      }
    }
    if (!userId) return reasons;
    if (await this.hasUserRedeemedCampaign(userId, campaign.id)) {
      reasons.push('already_redeemed');
    }
    if (campaign.require_new_account) {
      const createdAt = await this.getProfileCreatedAt(userId);
      if (!createdAt) {
        reasons.push('account_too_old');
      } else {
        const ageMs = Date.now() - new Date(createdAt).getTime();
        if (ageMs > campaign.new_account_max_hours * 3600 * 1000) {
          reasons.push('account_too_old');
        }
      }
    }
    if (campaign.require_first_publish) {
      if (!(await this.hasPublishedOffer(userId))) {
        reasons.push('first_publish_required');
      }
    }
    if (userId && campaign.eligible_profile_role !== 'both') {
      const role = await this.getProfileRole(userId);
      if (!role || role !== campaign.eligible_profile_role) {
        reasons.push('wrong_profile_role');
      }
    }
    if (
      userId &&
      campaign.require_no_prior_subscription &&
      context === 'subscription_checkout'
    ) {
      const hasPrior = await this.subscriptionTrial.hasPriorPaidSubscription(
        userId,
        this.getStripeClient(),
      );
      if (hasPrior) {
        reasons.push('prior_subscription');
      }
    }
    if (
      userId &&
      campaign.require_no_published_offer &&
      (context === 'credit_checkout' || context === 'subscription_checkout')
    ) {
      if (await this.hasPublishedOffer(userId)) {
        reasons.push('prior_published_offer');
      }
    }
    return reasons;
  }

  private async getProfileRole(
    userId: string,
  ): Promise<'company' | 'individual' | null> {
    const { data } = await this.supabase
      .getClient()
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    const role = (data as { role?: string } | null)?.role;
    return role === 'company' || role === 'individual' ? role : null;
  }

  private isScheduleAndCapacityOk(campaign: PromoCampaignRow, nowMs: number): boolean {
    if (campaign.archived_at) return false;
    if (!campaign.enabled) return false;
    if (campaign.starts_at && new Date(campaign.starts_at).getTime() > nowMs) {
      return false;
    }
    if (campaign.ends_at && new Date(campaign.ends_at).getTime() <= nowMs) {
      return false;
    }
    if (
      campaign.max_redemptions != null &&
      campaign.redemption_count >= campaign.max_redemptions
    ) {
      return false;
    }
    return true;
  }

  private async hasPublishedOffer(userId: string): Promise<boolean> {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();
    const [{ count: jobCount }, { count: adCount }] = await Promise.all([
      client
        .from('job_offers')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', userId)
        .eq('is_draft', false)
        .eq('is_deleted', false),
      client
        .from('company_ads')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .neq('status', 'draft'),
    ]);
    return (jobCount ?? 0) + (adCount ?? 0) > 0;
  }

  private async hasUserRedeemedCampaign(
    userId: string,
    campaignId: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .getClient()
      .from('promo_campaign_redemptions')
      .select('id')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .in('status', ['pending', 'completed'])
      .maybeSingle();
    return Boolean(data);
  }

  private async findCompletedRedemptionForUserByCode(
    userId: string,
    code: string,
  ): Promise<PromoRedemptionRow | null> {
    const resolution = await this.resolveCodeEntry(code);
    if (!resolution) return null;
    const { data } = await this.supabase
      .getClient()
      .from('promo_campaign_redemptions')
      .select('*')
      .eq('user_id', userId)
      .eq('campaign_id', resolution.campaign.id)
      .eq('status', 'completed')
      .maybeSingle();
    return (data as PromoRedemptionRow | null) ?? null;
  }

  private async getProfileCreatedAt(userId: string): Promise<string | null> {
    const { data } = await this.supabase
      .getClient()
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .maybeSingle();
    return (data as { created_at?: string } | null)?.created_at ?? null;
  }

  private async getCampaignById(id: string): Promise<PromoCampaignRow> {
    const { data, error } = await this.supabase
      .getClient()
      .from('promo_campaigns')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) {
      throw new BadRequestException('Campaign not found.');
    }
    return data as PromoCampaignRow;
  }

  private async ledgerHasPromoGrant(
    userId: string,
    refId: string,
  ): Promise<boolean> {
    const { data } = await this.supabase
      .getClient()
      .from('credit_ledger')
      .select('id')
      .eq('user_id', userId)
      .eq('ref_type', 'promo_campaign')
      .eq('ref_id', refId)
      .maybeSingle();
    return Boolean(data);
  }

  private async readPromoCodeFromUserMetadata(
    userId: string,
  ): Promise<string | null> {
    const { data, error } = await this.supabase
      .getClient()
      .auth.admin.getUserById(userId);
    if (error || !data.user) return null;
    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const legacy = meta.registration_promo_code;
    const current = meta[PROMO_METADATA_KEY];
    const raw =
      (typeof current === 'string' ? current : null) ??
      (typeof legacy === 'string' ? legacy : null);
    return raw?.trim() || null;
  }

  private async clearPromoCodeFromUserMetadata(userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .auth.admin.getUserById(userId);
    if (error || !data.user) return;
    const meta = { ...(data.user.user_metadata ?? {}) } as Record<
      string,
      unknown
    >;
    let changed = false;
    if (PROMO_METADATA_KEY in meta) {
      delete meta[PROMO_METADATA_KEY];
      changed = true;
    }
    if ('registration_promo_code' in meta) {
      delete meta.registration_promo_code;
      changed = true;
    }
    if (!changed) return;
    await this.supabase.getClient().auth.admin.updateUserById(userId, {
      user_metadata: meta,
    });
  }

  private assertRewardShape(
    dto: AdminCreatePromoCampaignDto | AdminUpdatePromoCampaignDto,
  ): void {
    const type = dto.reward_type;
    if (!type) return;
    if (type === 'free_credits' && !dto.reward_credits) {
      throw new BadRequestException('reward_credits is required.');
    }
    if (type !== 'free_credits') {
      const kind = dto.discount_kind ?? 'percent';
      if (kind === 'percent' && !dto.reward_percent) {
        throw new BadRequestException('reward_percent is required.');
      }
      if (kind === 'amount_off' && !dto.reward_amount_cents) {
        throw new BadRequestException('reward_amount_cents is required.');
      }
    }
    if (type === 'subscription_discount' && !dto.subscription_discount_duration) {
      throw new BadRequestException('subscription_discount_duration is required.');
    }
    if (
      dto.subscription_discount_duration === 'repeating' &&
      !dto.subscription_discount_duration_months
    ) {
      throw new BadRequestException(
        'subscription_discount_duration_months is required for repeating duration.',
      );
    }
    if (dto.require_no_prior_subscription && type !== 'subscription_discount') {
      throw new BadRequestException(
        'require_no_prior_subscription applies only to subscription_discount campaigns.',
      );
    }
    if (dto.require_no_published_offer && type === 'free_credits') {
      throw new BadRequestException(
        'require_no_published_offer applies only to checkout discount campaigns.',
      );
    }
  }

  private resolveDiscountFields(
    dto: AdminCreatePromoCampaignDto | AdminUpdatePromoCampaignDto,
    rewardType: PromoRewardType,
  ): {
    discount_kind: 'percent' | 'amount_off' | null;
    reward_percent: number | null;
    reward_amount_cents: number | null;
  } {
    if (rewardType === 'free_credits') {
      return {
        discount_kind: null,
        reward_percent: null,
        reward_amount_cents: null,
      };
    }
    const kind = dto.discount_kind ?? 'percent';
    if (kind === 'amount_off') {
      return {
        discount_kind: 'amount_off',
        reward_percent: null,
        reward_amount_cents: dto.reward_amount_cents ?? null,
      };
    }
    return {
      discount_kind: 'percent',
      reward_percent: dto.reward_percent ?? null,
      reward_amount_cents: null,
    };
  }

  private buildInsertRow(dto: AdminCreatePromoCampaignDto): Record<string, unknown> {
    const discount = this.resolveDiscountFields(dto, dto.reward_type);
    return {
      code: this.normalizeCode(dto.code),
      name: dto.name.trim(),
      enabled: dto.enabled ?? false,
      max_redemptions: dto.max_redemptions ?? null,
      starts_at: dto.starts_at ?? null,
      ends_at: dto.ends_at ?? null,
      reward_type: dto.reward_type,
      reward_credits: dto.reward_type === 'free_credits' ? dto.reward_credits : null,
      reward_percent: discount.reward_percent,
      discount_kind: discount.discount_kind,
      reward_amount_cents: discount.reward_amount_cents,
      reward_all_credit_packs: dto.reward_all_credit_packs ?? true,
      reward_credit_pack_slugs: dto.reward_credit_pack_slugs ?? [],
      reward_all_subscription_plans: dto.reward_all_subscription_plans ?? true,
      reward_subscription_plan_slugs: dto.reward_subscription_plan_slugs ?? [],
      subscription_discount_duration:
        dto.reward_type === 'subscription_discount'
          ? dto.subscription_discount_duration
          : null,
      subscription_discount_duration_months:
        dto.reward_type === 'subscription_discount' &&
        dto.subscription_discount_duration === 'repeating'
          ? dto.subscription_discount_duration_months
          : null,
      require_new_account: dto.require_new_account ?? false,
      new_account_max_hours: dto.new_account_max_hours ?? 48,
      require_first_publish: dto.require_first_publish ?? false,
      require_promo_code: dto.require_promo_code ?? true,
      eligible_profile_role: dto.eligible_profile_role ?? 'both',
      require_no_prior_subscription: dto.require_no_prior_subscription ?? false,
      require_no_published_offer:
        dto.reward_type !== 'free_credits'
          ? dto.require_no_published_offer ?? false
          : false,
      code_mode: dto.code_mode ?? 'shared',
    };
  }

  private formatEligibilityMessage(reasons: PromoEligibilityReason[]): string {
    if (reasons.includes('invalid_code')) return 'Neplatný promo kód.';
    if (reasons.includes('pool_code_invalid')) return 'Neplatný promo kód z poolu.';
    if (reasons.includes('pool_code_exhausted')) return 'Promo kód už bol použitý.';
    if (reasons.includes('exhausted')) return 'Promo kód je vyčerpaný.';
    if (reasons.includes('inactive')) return 'Promo kód nie je aktívny.';
    if (reasons.includes('wrong_profile_role')) {
      return 'Promo kód nie je určený pre váš typ účtu.';
    }
    if (reasons.includes('prior_subscription')) {
      return 'Promo kód platí len pre prvé predplatné.';
    }
    if (reasons.includes('prior_published_offer')) {
      return 'Promo kód platí len pre účty bez zverejnenej ponuky alebo inzerátu.';
    }
    if (reasons.includes('account_too_old')) {
      return 'Promo kód platí len pre nové účty.';
    }
    if (reasons.includes('first_publish_required')) {
      return 'Najprv publikujte prvú ponuku alebo inzerát.';
    }
    if (reasons.includes('already_redeemed')) {
      return 'Promo kód ste už použili.';
    }
    return 'Promo kód nie je možné uplatniť.';
  }

  private formatClaimReason(reason: string): string {
    return this.formatEligibilityMessage([reason as PromoEligibilityReason]);
  }
}
