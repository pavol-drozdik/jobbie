import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreditsService } from './credits.service';
import { SubscriptionLimitsService } from './subscription-limits.service';
import { getPlanTierCreditCost } from './plan-tier-credit-costs';

const TOP_CATEGORY_KIND = 'top_category';
const TOP_LISTING_DAYS = 7;

@Injectable()
export class ListingTopPromotionService {
  private readonly logger = new Logger(ListingTopPromotionService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly credits: CreditsService,
    private readonly limits: SubscriptionLimitsService,
  ) {}

  async getActiveTopJobIds(jobIds: string[]): Promise<Set<string>> {
    return this.loadActiveTopIds('job_promotions', 'job_id', jobIds);
  }

  async getActiveTopCompanyAdIds(adIds: string[]): Promise<Set<string>> {
    return this.loadActiveTopIds(
      'company_ad_promotions',
      'company_ad_id',
      adIds,
    );
  }

  private async loadActiveTopIds(
    table: 'job_promotions' | 'company_ad_promotions',
    idColumn: 'job_id' | 'company_ad_id',
    ids: string[],
  ): Promise<Set<string>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) {
      return new Set();
    }
    const nowIso = new Date().toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from(table)
      .select(idColumn)
      .eq('kind', TOP_CATEGORY_KIND)
      .gt('ends_at', nowIso)
      .in(idColumn, unique);
    if (error) {
      this.logger.warn(
        `loadActiveTopIds failed (${table}): ${error.message ?? 'unknown'}`,
      );
      return new Set();
    }
    return new Set(
      (data ?? []).map((row) => String((row as Record<string, string>)[idColumn])),
    );
  }

  async resolveTopListingCreditCost(userId: string): Promise<number> {
    const { planSlug } = await this.limits.getPlanLimits(userId);
    return getPlanTierCreditCost(planSlug, 'topOfCategory7Days');
  }

  topCategoryPromoteRefId(
    subjectId: string,
    periodKey: string,
  ): string {
    return `${subjectId}:${TOP_CATEGORY_KIND}:${periodKey}`;
  }

  private topPromotePeriodKey(): string {
    return new Date().toISOString().slice(0, 16);
  }

  async applyJobTopCategoryIfRequested(
    userId: string,
    jobId: string,
    wantTop: boolean | undefined,
    reason: string,
  ): Promise<{ applied: boolean; creditsSpent: number }> {
    if (!wantTop) {
      return { applied: false, creditsSpent: 0 };
    }
    const active = await this.getActiveTopJobIds([jobId]);
    if (active.has(jobId)) {
      return { applied: false, creditsSpent: 0 };
    }
    const creditsSpent = await this.applyJobTopCategory(userId, jobId, reason);
    return { applied: true, creditsSpent };
  }

  async applyCompanyAdTopCategoryIfRequested(
    userId: string,
    companyAdId: string,
    wantTop: boolean | undefined,
    reason: string,
  ): Promise<{ applied: boolean; creditsSpent: number }> {
    if (!wantTop) {
      return { applied: false, creditsSpent: 0 };
    }
    const active = await this.getActiveTopCompanyAdIds([companyAdId]);
    if (active.has(companyAdId)) {
      return { applied: false, creditsSpent: 0 };
    }
    const creditsSpent = await this.applyCompanyAdTopCategory(
      userId,
      companyAdId,
      reason,
    );
    return { applied: true, creditsSpent };
  }

  async applyJobTopCategory(
    userId: string,
    jobId: string,
    reason: string,
  ): Promise<number> {
    const refId = this.topCategoryPromoteRefId(jobId, this.topPromotePeriodKey());
    const amount = await this.resolveTopListingCreditCost(userId);
    await this.credits.spendForPlanTier(userId, 'topOfCategory7Days', {
      reason,
      refType: 'job_offer',
      refId,
      subjectType: 'job_offer',
      subjectId: jobId,
    });
    const endsAt = this.topListingEndsAtIso();
    const { error: promoErr } = await this.supabase
      .getClient()
      .from('job_promotions')
      .insert({
        job_id: jobId,
        owner_id: userId,
        kind: TOP_CATEGORY_KIND,
        ends_at: endsAt,
        credits_spent: amount,
      });
    if (promoErr) {
      await this.credits.reverseSpendByRef(
        userId,
        'job_offer',
        refId,
        'job_top_promote_rollback',
      );
      throw new ForbiddenException(
        promoErr.message?.trim() ||
          'Topovanie sa nepodarilo aktivovať.',
      );
    }
    const { error: patchErr } = await this.supabase
      .getClient()
      .from('job_offers')
      .update({ is_featured: true })
      .eq('id', jobId)
      .eq('company_id', userId);
    if (patchErr) {
      await this.credits.reverseSpendByRef(
        userId,
        'job_offer',
        refId,
        'job_top_promote_rollback',
      );
      throw new ForbiddenException('Topovanie sa nepodarilo aktivovať.');
    }
    return amount;
  }

  async applyCompanyAdTopCategory(
    userId: string,
    companyAdId: string,
    reason: string,
  ): Promise<number> {
    const refId = this.topCategoryPromoteRefId(
      companyAdId,
      this.topPromotePeriodKey(),
    );
    const amount = await this.resolveTopListingCreditCost(userId);
    await this.credits.spendForPlanTier(userId, 'topOfCategory7Days', {
      reason,
      refType: 'company_ad',
      refId,
      subjectType: 'company_ad',
      subjectId: companyAdId,
    });
    const endsAt = this.topListingEndsAtIso();
    const { error: promoErr } = await this.supabase
      .getClient()
      .from('company_ad_promotions')
      .insert({
        company_ad_id: companyAdId,
        owner_id: userId,
        kind: TOP_CATEGORY_KIND,
        ends_at: endsAt,
        credits_spent: amount,
      });
    if (promoErr) {
      await this.credits.reverseSpendByRef(
        userId,
        'company_ad',
        refId,
        'company_ad_top_promote_rollback',
      );
      throw new ForbiddenException(
        promoErr.message?.trim() ||
          'Topovanie sa nepodarilo aktivovať.',
      );
    }
    return amount;
  }

  private topListingEndsAtIso(): string {
    const ends = new Date();
    ends.setUTCDate(ends.getUTCDate() + TOP_LISTING_DAYS);
    return ends.toISOString();
  }
}
