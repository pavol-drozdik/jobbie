import { ListingTopPromotionService } from './listing-top-promotion.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreditsService } from './credits.service';
import { SubscriptionLimitsService } from './subscription-limits.service';

describe('ListingTopPromotionService', () => {
  function buildService(activeJobIds: string[] = []): ListingTopPromotionService {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: activeJobIds.map((job_id) => ({ job_id })),
        error: null,
      }),
    };
    const supabase = {
      getClient: () => ({
        from: jest.fn().mockReturnValue(chain),
      }),
    } as unknown as SupabaseService;
    const credits = {
      spendForPlanTier: jest.fn(),
      reverseSpendByRef: jest.fn(),
    } as unknown as CreditsService;
    const limits = {
      getPlanLimits: jest.fn().mockResolvedValue({ planSlug: 'zadarmo' }),
    } as unknown as SubscriptionLimitsService;
    return new ListingTopPromotionService(supabase, credits, limits);
  }

  describe('applyJobTopCategoryIfRequested', () => {
    it('skips when wantTop is false', async () => {
      const service = buildService();
      const spy = jest.spyOn(service, 'applyJobTopCategory');
      const result = await service.applyJobTopCategoryIfRequested(
        'user-1',
        'job-1',
        false,
        'test',
      );
      expect(result).toEqual({ applied: false, creditsSpent: 0 });
      expect(spy).not.toHaveBeenCalled();
    });

    it('skips when an active top promotion already exists', async () => {
      const service = buildService(['job-1']);
      const spy = jest.spyOn(service, 'applyJobTopCategory');
      const result = await service.applyJobTopCategoryIfRequested(
        'user-1',
        'job-1',
        true,
        'test',
      );
      expect(result).toEqual({ applied: false, creditsSpent: 0 });
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('topCategoryPromoteRefId', () => {
    it('includes period key for idempotent spend per purchase', () => {
      const service = buildService();
      expect(service.topCategoryPromoteRefId('job-1', '2026-06-02T12:34')).toBe(
        'job-1:top_category:2026-06-02T12:34',
      );
    });
  });
});
