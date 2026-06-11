import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type ProfileActivityRole = 'customer' | 'worker' | 'provider';

type ProfileActivityRow = {
  customer_role?: boolean;
  worker_role?: boolean;
  provider_role?: boolean;
  is_deleted?: boolean;
};

const MESSAGES: Record<ProfileActivityRole, string> = {
  customer:
    'Táto funkcia vyžaduje zapnutú rolu „Potrebujem pomoc s prácou“ v profile.',
  worker:
    'Táto funkcia vyžaduje zapnutú rolu „Hľadám malé práce“ v profile.',
  provider:
    'Táto funkcia vyžaduje zapnutú rolu „Chcem aby ma klienti našli“ v profile.',
};

export function assertProfileActivityFromRow(
  row: ProfileActivityRow | null,
  activity: ProfileActivityRole,
  message = MESSAGES[activity],
): void {
  if (!row) {
    throw new ForbiddenException('Profil sa nenašiel.');
  }
  if (row.is_deleted) {
    throw new ForbiddenException('Profil nie je dostupný.');
  }
  const ok =
    activity === 'customer'
      ? Boolean(row.customer_role)
      : activity === 'worker'
        ? Boolean(row.worker_role)
        : Boolean(row.provider_role);
  if (!ok) {
    throw new ForbiddenException(message);
  }
}

@Injectable()
export class ProfileActivityAuthorizationService {
  constructor(private readonly supabase: SupabaseService) {}

  async assertActivityRole(
    userId: string,
    activity: ProfileActivityRole,
    message?: string,
  ): Promise<void> {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('customer_role, worker_role, provider_role, is_deleted')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      throw new ForbiddenException('Profil sa nenašiel.');
    }
    assertProfileActivityFromRow(
      data as ProfileActivityRow | null,
      activity,
      message,
    );
  }
}
