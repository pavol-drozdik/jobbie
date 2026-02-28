import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { JobOfferResponseDto } from './jobs.dto';

@Injectable()
export class JobsService {
  constructor(private supabase: SupabaseService) {}

  getMaxActiveJobs(userId: string): Promise<number> {
    return (async () => {
      const { data: subData } = await this.supabase
        .getClient()
        .from('user_subscriptions')
        .select('plan_id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1);
      const sub = Array.isArray(subData) && subData.length > 0 ? subData[0] : null;
      if (!sub) return 1;
      const { data: planData } = await this.supabase
        .getClient()
        .from('subscription_plans')
        .select('max_active_jobs')
        .eq('id', (sub as { plan_id: string }).plan_id)
        .single();
      const max = (planData as { max_active_jobs?: number } | null)?.max_active_jobs;
      return typeof max === 'number' ? max : 1;
    })();
  }
}
