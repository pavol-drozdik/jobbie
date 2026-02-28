import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwksAuthGuard } from '../auth/jwks-auth.guard';
import { CurrentUserDecorator } from '../auth/current-user.decorator';
import { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import { PlanResponseDto, MySubscriptionResponseDto } from './plans.dto';

@Controller('plans')
@UseGuards(JwksAuthGuard)
export class PlansController {
  constructor(private supabase: SupabaseService) {}

  @Get()
  async list(): Promise<PlanResponseDto[]> {
    const { data } = await this.supabase
      .getClient()
      .from('subscription_plans')
      .select(
        'id,slug,name_sk,price_monthly_cents,max_active_jobs,sort_order',
      )
      .order('sort_order');
    return (data ?? []) as PlanResponseDto[];
  }

  @Get('me')
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
