import {

  BadRequestException,

  Injectable,

  ServiceUnavailableException,

} from '@nestjs/common';

import { randomBytes } from 'crypto';

import { SupabaseService } from '../supabase/supabase.service';

import { AuditService } from '../audit/audit.service';

import {

  AdminCreatePromoCampaignDto,

  AdminGeneratePromoCodesDto,

  AdminSimulatePromoCampaignDto,

  AdminUpdatePromoCampaignDto,

} from './admin-promo-campaign.dto';

import {

  draftDtoToSimulateCampaign,

  resolveDiscountFields,

  simulatePromoEligibility,

} from './admin-promo-campaign.simulate';

import { deleteStripeCouponIfConfigured } from './admin-promo-stripe.util';



type CampaignRow = Record<string, unknown> & {

  id: string;

  code: string;

  redemption_count: number;

  reward_type: string;

  code_mode?: string;

  pool_available?: number;

  pool_redeemed?: number;

};



type RedemptionListItem = {

  id: string;

  user_id: string;

  user_label: string;

  user_role: string | null;

  context: string;

  status: string;

  credits_granted: number | null;

  percent_applied: number | null;

  amount_applied_cents: number | null;

  target_slug: string | null;

  created_at: string;

  completed_at: string | null;

  pool_code: string | null;

};



@Injectable()

export class AdminPromoCampaignService {

  constructor(

    private readonly supabase: SupabaseService,

    private readonly audit: AuditService,

  ) {}



  private normalizeCode(code: string): string {

    return code.trim().toUpperCase();

  }



  async getCatalogOptions() {

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

      credit_packs: packsRes.data ?? [],

      subscription_plans: plansRes.data ?? [],

    };

  }



  async listCampaigns(includeArchived = false): Promise<{ items: CampaignRow[] }> {

    let query = this.supabase

      .getClient()

      .from('promo_campaigns')

      .select('*')

      .order('created_at', { ascending: false });

    if (!includeArchived) {

      query = query.is('archived_at', null);

    }

    const { data, error } = await query;

    if (error) throw new ServiceUnavailableException(error.message);

    const items = (data ?? []) as CampaignRow[];

    const poolIds = items

      .filter((c) => String(c.code_mode ?? 'shared') === 'unique_pool')

      .map((c) => c.id);

    const poolStats = new Map<string, { available: number; redeemed: number }>();

    if (poolIds.length > 0) {

      const { data: codeRows, error: codeErr } = await this.supabase

        .getClient()

        .from('promo_campaign_codes')

        .select('campaign_id, status')

        .in('campaign_id', poolIds);

      if (codeErr) throw new ServiceUnavailableException(codeErr.message);

      for (const row of codeRows ?? []) {

        const cid = String((row as { campaign_id: string }).campaign_id);

        const cur = poolStats.get(cid) ?? { available: 0, redeemed: 0 };

        const status = String((row as { status: string }).status);

        if (status === 'available') cur.available++;

        else if (status === 'redeemed') cur.redeemed++;

        poolStats.set(cid, cur);

      }

    }

    const enriched = items.map((c) => {

      if (String(c.code_mode ?? 'shared') !== 'unique_pool') return c;

      const stats = poolStats.get(c.id);

      return {

        ...c,

        pool_available: stats?.available ?? 0,

        pool_redeemed: stats?.redeemed ?? 0,

      };

    });

    return { items: enriched };

  }



  async listRedemptions(

    campaignId: string,

    options?: { limit?: number; cursor?: string },

  ): Promise<{ items: RedemptionListItem[]; next_cursor: string | null }> {

    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);

    let query = this.supabase

      .getClient()

      .from('promo_campaign_redemptions')

      .select(

        'id, user_id, context, status, credits_granted, percent_applied, amount_applied_cents, target_slug, created_at, completed_at, pool_code:promo_campaign_codes!pool_code_id(code), profiles!inner(role, display_name, company_name)',

      )

      .eq('campaign_id', campaignId)

      .order('created_at', { ascending: false })

      .limit(limit + 1);

    if (options?.cursor) {

      query = query.lt('created_at', options.cursor);

    }

    const { data, error } = await query;

    if (error) throw new ServiceUnavailableException(error.message);

    const rows = (data ?? []) as Array<Record<string, unknown>>;

    const hasMore = rows.length > limit;

    const page = hasMore ? rows.slice(0, limit) : rows;

    const items: RedemptionListItem[] = page.map((row) => {

      const profile = row.profiles as {

        role?: string;

        display_name?: string | null;

        company_name?: string | null;

      } | null;

      const userLabel =

        profile?.company_name?.trim() ||

        profile?.display_name?.trim() ||

        String(row.user_id).slice(0, 8);

      return {

        id: String(row.id),

        user_id: String(row.user_id),

        user_label: userLabel,

        user_role: profile?.role ?? null,

        context: String(row.context),

        status: String(row.status),

        credits_granted:

          row.credits_granted == null ? null : Number(row.credits_granted),

        percent_applied:

          row.percent_applied == null ? null : Number(row.percent_applied),

        amount_applied_cents:

          row.amount_applied_cents == null

            ? null

            : Number(row.amount_applied_cents),

        target_slug: (row.target_slug as string | null) ?? null,

        created_at: String(row.created_at),

        completed_at: (row.completed_at as string | null) ?? null,

        pool_code:

          (row.pool_code as { code?: string } | null)?.code?.trim() || null,

      };

    });

    const nextCursor =

      hasMore && page.length > 0

        ? String(page[page.length - 1].created_at)

        : null;

    return { items, next_cursor: nextCursor };

  }



  async createCampaign(

    adminUserId: string,

    dto: AdminCreatePromoCampaignDto,

  ): Promise<CampaignRow> {

    this.assertRewardShape(dto);

    const discount = resolveDiscountFields(

      dto as unknown as Record<string, unknown>,

      dto.reward_type,

    );

    const row = {

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

      require_no_published_offer: dto.require_no_published_offer ?? false,

      code_mode: dto.code_mode ?? 'shared',

    };

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

    const campaign = data as CampaignRow;

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

  ): Promise<CampaignRow> {

    const { data: existing, error: readErr } = await this.supabase

      .getClient()

      .from('promo_campaigns')

      .select('redemption_count, reward_type, stripe_coupon_id')

      .eq('id', campaignId)

      .maybeSingle();

    if (readErr) throw new ServiceUnavailableException(readErr.message);

    if (!existing) throw new BadRequestException('Campaign not found.');

    const redemptionCount =

      (existing as { redemption_count?: number }).redemption_count ?? 0;

    if (

      dto.max_redemptions != null &&

      dto.max_redemptions < redemptionCount

    ) {

      throw new BadRequestException(

        'max_redemptions cannot be below current redemption_count.',

      );

    }

    const rewardType =

      dto.reward_type ??

      ((existing as { reward_type?: string }).reward_type as

        | AdminCreatePromoCampaignDto['reward_type']

        | undefined);

    this.assertRewardShape({

      reward_type: rewardType,

      reward_credits: dto.reward_credits ?? undefined,

      reward_percent: dto.reward_percent ?? undefined,

      reward_amount_cents: dto.reward_amount_cents ?? undefined,

      discount_kind: dto.discount_kind ?? undefined,

      subscription_discount_duration: dto.subscription_discount_duration ?? undefined,

      subscription_discount_duration_months:

        dto.subscription_discount_duration_months ?? undefined,

      require_first_publish: dto.require_first_publish,

      require_promo_code: dto.require_promo_code,

      require_no_prior_subscription: dto.require_no_prior_subscription,

      require_no_published_offer: dto.require_no_published_offer,

    });

    const patch: Record<string, unknown> = { ...dto };

    if (dto.code) patch.code = this.normalizeCode(dto.code);

    if (dto.archived === true) {

      const couponId = (existing as { stripe_coupon_id?: string | null })

        .stripe_coupon_id;

      void deleteStripeCouponIfConfigured(couponId);

      patch.stripe_coupon_id = null;

      patch.archived_at = new Date().toISOString();

      patch.enabled = false;

      delete patch.archived;

    } else if (dto.archived === false) {

      patch.archived_at = null;

      delete patch.archived;

    }

    if (rewardType && (dto.discount_kind != null || dto.reward_percent != null || dto.reward_amount_cents != null)) {

      const discount = resolveDiscountFields(patch, rewardType);

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

    const campaign = data as CampaignRow;

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



  async simulate(dto: AdminSimulatePromoCampaignDto): Promise<{

    valid: boolean;

    reasons: string[];

  }> {

    if (!dto.campaign && !dto.campaign_id) {

      throw new BadRequestException('campaign or campaign_id is required.');

    }

    if (!dto.scenario) {

      throw new BadRequestException('scenario is required.');

    }



    let redemptionCount = 0;

    let base: Record<string, unknown>;



    if (dto.campaign_id) {

      const { data, error } = await this.supabase

        .getClient()

        .from('promo_campaigns')

        .select('*')

        .eq('id', dto.campaign_id)

        .maybeSingle();

      if (error) throw new ServiceUnavailableException(error.message);

      if (!data) throw new BadRequestException('Campaign not found.');

      const row = data as Record<string, unknown>;

      redemptionCount = Number(row.redemption_count ?? 0);

      base = { ...row, ...(dto.campaign ?? {}) };

    } else {

      base = { ...(dto.campaign as unknown as Record<string, unknown>) };

    }



    const campaign = draftDtoToSimulateCampaign(base, redemptionCount);

    return simulatePromoEligibility(campaign, {

      context: dto.scenario.context,

      code: dto.scenario.code,

      account_age_hours: dto.scenario.account_age_hours,

      has_published: dto.scenario.has_published,

      pack_slug: dto.scenario.pack_slug,

      plan_slug: dto.scenario.plan_slug,

      already_redeemed: dto.scenario.already_redeemed,

      profile_role: dto.scenario.profile_role,

      has_prior_subscription: dto.scenario.has_prior_subscription,

      pool_code_available: dto.scenario.pool_code_available,

    });

  }



  async generatePoolCodes(

    adminUserId: string,

    campaignId: string,

    dto: AdminGeneratePromoCodesDto,

  ): Promise<{ created: number; total_available: number }> {

    const client = this.supabase.getClient();

    const { data: campaign, error: readErr } = await client

      .from('promo_campaigns')

      .select('id, code_mode, max_redemptions')

      .eq('id', campaignId)

      .maybeSingle();

    if (readErr) throw new ServiceUnavailableException(readErr.message);

    if (!campaign) throw new BadRequestException('Campaign not found.');

    if ((campaign as { code_mode?: string }).code_mode !== 'unique_pool') {

      throw new BadRequestException('Campaign is not in unique_pool code mode.');

    }



    const prefix = dto.prefix

      ? this.normalizeCode(dto.prefix).replace(/[^A-Z0-9]/g, '').slice(0, 12)

      : '';

    const suffixLen = Math.max(6, 10 - prefix.length);

    const createdCodes: string[] = [];

    for (let i = 0; i < dto.count; i++) {

      let inserted = false;

      for (let attempt = 0; attempt < 8 && !inserted; attempt++) {

        const code = `${prefix}${this.randomPoolSuffix(suffixLen)}`;

        const { error } = await client.from('promo_campaign_codes').insert({

          campaign_id: campaignId,

          code,

        });

        if (!error) {

          createdCodes.push(code);

          inserted = true;

        } else if (error.code !== '23505') {

          throw new ServiceUnavailableException(error.message);

        }

      }

      if (!inserted) {

        throw new ServiceUnavailableException('Could not generate unique pool code.');

      }

    }



    const { count: availableCount, error: countErr } = await client

      .from('promo_campaign_codes')

      .select('id', { count: 'exact', head: true })

      .eq('campaign_id', campaignId)

      .eq('status', 'available');

    if (countErr) throw new ServiceUnavailableException(countErr.message);

    const totalAvailable = availableCount ?? createdCodes.length;

    const maxRedemptions = (campaign as { max_redemptions?: number | null })

      .max_redemptions;

    if (maxRedemptions == null || maxRedemptions < totalAvailable) {

      await client

        .from('promo_campaigns')

        .update({ max_redemptions: totalAvailable })

        .eq('id', campaignId);

    }



    void this.audit.recordAuditEvent({

      actorUserId: adminUserId,

      actorIp: null,

      actorUserAgent: null,

      sessionId: null,

      deviceId: null,

      eventType: 'admin.promo_campaign.pool_codes_generated',

      subjectType: 'promo_campaign',

      subjectId: campaignId,

      payload: { count: createdCodes.length, total_available: totalAvailable },

    });



    return { created: createdCodes.length, total_available: totalAvailable };

  }



  async listPoolCodes(

    campaignId: string,

    options?: { status?: string; limit?: number; cursor?: string },

  ): Promise<{

    items: Array<{

      id: string;

      code: string;

      status: string;

      redeemed_at: string | null;

      created_at: string;

    }>;

    next_cursor: string | null;

    counts: { available: number; redeemed: number; disabled: number };

  }> {

    const client = this.supabase.getClient();

    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);



    const [availableRes, redeemedRes, disabledRes] = await Promise.all([

      client

        .from('promo_campaign_codes')

        .select('id', { count: 'exact', head: true })

        .eq('campaign_id', campaignId)

        .eq('status', 'available'),

      client

        .from('promo_campaign_codes')

        .select('id', { count: 'exact', head: true })

        .eq('campaign_id', campaignId)

        .eq('status', 'redeemed'),

      client

        .from('promo_campaign_codes')

        .select('id', { count: 'exact', head: true })

        .eq('campaign_id', campaignId)

        .eq('status', 'disabled'),

    ]);



    let query = client

      .from('promo_campaign_codes')

      .select('id, code, status, redeemed_at, created_at')

      .eq('campaign_id', campaignId)

      .order('created_at', { ascending: false })

      .limit(limit + 1);

    if (options?.status) {

      query = query.eq('status', options.status);

    }

    if (options?.cursor) {

      query = query.lt('created_at', options.cursor);

    }

    const { data, error } = await query;

    if (error) throw new ServiceUnavailableException(error.message);

    const rows = (data ?? []) as Array<Record<string, unknown>>;

    const hasMore = rows.length > limit;

    const page = hasMore ? rows.slice(0, limit) : rows;

    const items = page.map((row) => ({

      id: String(row.id),

      code: String(row.code),

      status: String(row.status),

      redeemed_at: (row.redeemed_at as string | null) ?? null,

      created_at: String(row.created_at),

    }));

    const nextCursor =

      hasMore && page.length > 0

        ? String(page[page.length - 1].created_at)

        : null;



    return {

      items,

      next_cursor: nextCursor,

      counts: {

        available: availableRes.count ?? 0,

        redeemed: redeemedRes.count ?? 0,

        disabled: disabledRes.count ?? 0,

      },

    };

  }



  async exportPoolCodesCsv(adminUserId: string, campaignId: string): Promise<string> {

    const client = this.supabase.getClient();

    const { data, error } = await client

      .from('promo_campaign_codes')

      .select('code, status, redeemed_at')

      .eq('campaign_id', campaignId)

      .order('created_at', { ascending: true });

    if (error) throw new ServiceUnavailableException(error.message);

    const rows = (data ?? []) as Array<{

      code: string;

      status: string;

      redeemed_at: string | null;

    }>;

    const escape = (value: string) => {

      if (value.includes(',') || value.includes('"') || value.includes('\n')) {

        return `"${value.replace(/"/g, '""')}"`;

      }

      return value;

    };

    const lines = [

      'code,status,redeemed_at',

      ...rows.map((row) =>

        [row.code, row.status, row.redeemed_at ?? '']

          .map((v) => escape(String(v)))

          .join(','),

      ),

    ];

    void this.audit.recordAuditEvent({

      actorUserId: adminUserId,

      actorIp: null,

      actorUserAgent: null,

      sessionId: null,

      deviceId: null,

      eventType: 'admin.promo_campaign.pool_codes_exported',

      subjectType: 'promo_campaign',

      subjectId: campaignId,

      payload: { row_count: rows.length },

    });

    return lines.join('\n');

  }



  async patchPoolCode(

    adminUserId: string,

    campaignId: string,

    codeId: string,

    status: 'disabled' | 'available',

  ): Promise<{ ok: true }> {

    const client = this.supabase.getClient();

    const { data: campaign, error: campErr } = await client

      .from('promo_campaigns')

      .select('id, code_mode')

      .eq('id', campaignId)

      .maybeSingle();

    if (campErr) throw new ServiceUnavailableException(campErr.message);

    if (!campaign) throw new BadRequestException('Campaign not found.');

    if (String(campaign.code_mode) !== 'unique_pool') {

      throw new BadRequestException('Campaign is not a unique code pool.');

    }

    const { data: codeRow, error: codeErr } = await client

      .from('promo_campaign_codes')

      .select('id, status, code')

      .eq('id', codeId)

      .eq('campaign_id', campaignId)

      .maybeSingle();

    if (codeErr) throw new ServiceUnavailableException(codeErr.message);

    if (!codeRow) throw new BadRequestException('Pool code not found.');

    const currentStatus = String(codeRow.status);

    if (currentStatus === 'redeemed') {

      throw new BadRequestException('Cannot change status of a redeemed pool code.');

    }

    if (currentStatus !== 'available' && currentStatus !== 'disabled') {

      throw new BadRequestException('Pool code status cannot be changed.');

    }

    if (currentStatus === status) {

      return { ok: true };

    }

    const { error: updateErr } = await client

      .from('promo_campaign_codes')

      .update({ status })

      .eq('id', codeId)

      .eq('campaign_id', campaignId);

    if (updateErr) throw new ServiceUnavailableException(updateErr.message);

    void this.audit.recordAuditEvent({

      actorUserId: adminUserId,

      actorIp: null,

      actorUserAgent: null,

      sessionId: null,

      deviceId: null,

      eventType: 'admin.promo_campaign.pool_code_status_changed',

      subjectType: 'promo_campaign_code',

      subjectId: codeId,

      payload: {

        campaign_id: campaignId,

        code: codeRow.code,

        from_status: currentStatus,

        to_status: status,

      },

    });

    return { ok: true };

  }



  private randomPoolSuffix(length: number): string {

    const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    const bytes = randomBytes(length);

    let out = '';

    for (let i = 0; i < length; i++) {

      out += charset[bytes[i]! % charset.length];

    }

    return out;

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

    if (dto.require_promo_code === false) {

      throw new BadRequestException('require_promo_code must be true.');

    }

    if (type !== 'free_credits' && dto.require_first_publish === true) {

      throw new BadRequestException(

        'require_first_publish applies only to free_credits campaigns.',

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

}

