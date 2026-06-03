import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { CatalogCacheService } from '../redis/catalog-cache.service';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { PlanResponseDto, MySubscriptionResponseDto } from './plans.dto';
import { Public } from '../auth/public.decorator';
import {
  PUBLIC_SUBSCRIPTION_PLAN_SLUGS,
  filterPublicSubscriptionPlans,
} from '../billing/public-pricing-catalog';

@Controller('plans')
export class PlansController {
  constructor(
    private supabase: SupabaseService,
    private readonly catalogCache: CatalogCacheService,
  ) {}

  /** Public: pricing table can load before the client session is ready. */
  @Get()
  @Public()
  @Header('Cache-Control', 'public, max-age=300')
  async list(): Promise<PlanResponseDto[]> {
    return this.catalogCache.getOrSet('catalog:plans-list:v4', async () => {
      const { data, error } = await this.supabase
        .getClient()
        .from('subscription_plans')
        .select(
          'id,slug,name_sk,price_monthly_cents,max_active_jobs,monthly_credits,max_cv_unlocks_monthly,max_cv_contacts_monthly,max_cv_pdf_downloads_monthly,sort_order,active',
        )
        .in('slug', [...PUBLIC_SUBSCRIPTION_PLAN_SLUGS])
        .order('sort_order');
      const rows = (data ?? []) as Array<PlanResponseDto & { active?: boolean }>;
      const activeOnly = error
        ? rows
        : rows.filter((row) => row.active !== false);
      return filterPublicSubscriptionPlans(activeOnly);
    }, 900);
  }

  @Get('me')
  @UseGuards(JwksAuthGuard)
  async getMySubscription(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<MySubscriptionResponseDto | null> {
    const { data: subData } = await this.supabase
      .getClient()
      .from('user_subscriptions')
      .select('plan_id,status,current_period_end')
      .eq('user_id', user.id)
      .limit(1);
    const sub = Array.isArray(subData) && subData.length > 0 ? subData[0] : null;
    if (!sub) return null;
    const { data: planData } = await this.supabase
      .getClient()
      .from('subscription_plans')
      .select('name_sk')
      .eq('id', (sub as { plan_id: string }).plan_id)
      .single();
    const name_sk =
      (planData as { name_sk?: string } | null)?.name_sk ?? '';
    return {
      plan_id: (sub as { plan_id: string }).plan_id,
      plan_name_sk: name_sk,
      status: (sub as { status: string }).status,
      current_period_end: (sub as { current_period_end?: string }).current_period_end ?? null,
    };
  }
}
