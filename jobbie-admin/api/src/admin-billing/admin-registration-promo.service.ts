import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AuditService } from '../audit/audit.service';

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
export class AdminRegistrationPromoService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async listCampaigns(): Promise<{ items: CampaignRow[] }> {
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

    return { items: (data ?? []) as CampaignRow[] };
  }

  async updateCampaign(
    adminUserId: string,
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
      .select('redemption_count, code')
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

    void this.audit.recordAuditEvent({
      actorUserId: adminUserId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'admin.registration_promo.updated',
      subjectType: 'registration_promo_campaign',
      subjectId: campaignId,
      payload: {
        code: (existing as { code?: string }).code ?? null,
        patch,
      },
    });

    return data as CampaignRow;
  }
}
