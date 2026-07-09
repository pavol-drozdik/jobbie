import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  assertBillingPurchaseAccess,
  type BillingPurchaseProfileRow,
} from './billing-purchase-eligibility';

@Injectable()
export class BillingPurchaseAuthorizationService {
  constructor(private readonly supabase: SupabaseService) {}

  async assertBillingPurchaseAccessForUser(userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('customer_role, provider_role, is_deleted')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      throw new ForbiddenException('Profil sa nenašiel.');
    }
    assertBillingPurchaseAccess(data as BillingPurchaseProfileRow | null);
  }
}
