import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  ContractWithdrawalItemDto,
  ContractWithdrawalListDto,
  ContractWithdrawalStatus,
} from './admin-contract-withdrawals.dto';

const LIST_COLUMNS =
  'id, status, name, email, product, invoice_number, purchase_date, reason, reason_other, submitted_at, status_updated_at, status_updated_by';

@Injectable()
export class AdminContractWithdrawalsService {
  private readonly logger = new Logger(AdminContractWithdrawalsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async list(opts: {
    status?: string;
    q?: string;
    from?: string;
    to?: string;
    limit: number;
    cursor?: string;
  }): Promise<ContractWithdrawalListDto> {
    const client = this.supabase.getClient();
    let q = client
      .from('contract_withdrawals')
      .select(LIST_COLUMNS)
      .order('submitted_at', { ascending: false })
      .limit(opts.limit + 1);

    if (opts.status?.trim()) {
      q = q.eq('status', opts.status.trim());
    }
    if (opts.from?.trim()) {
      q = q.gte('submitted_at', opts.from.trim());
    }
    if (opts.to?.trim()) {
      q = q.lte('submitted_at', opts.to.trim());
    }
    const search = opts.q?.trim();
    if (search) {
      const pattern = `%${search.replace(/[%_]/g, '')}%`;
      q = q.or(`email.ilike.${pattern},invoice_number.ilike.${pattern}`);
    }
    if (opts.cursor?.trim()) {
      q = q.lt('submitted_at', opts.cursor.trim());
    }

    const { data, error } = await q;
    if (error) {
      this.logger.warn(`contract_withdrawals list failed: ${error.message}`);
      if (
        /contract_withdrawals/i.test(error.message) &&
        /does not exist|schema cache/i.test(error.message)
      ) {
        throw new InternalServerErrorException(
          'Tabuľka contract_withdrawals neexistuje. Spustite migráciu supabase/migrations/20260716120000_contract_withdrawals.sql.',
        );
      }
      throw new InternalServerErrorException(
        `Contract withdrawals: ${error.message}`,
      );
    }

    const rows = (data ?? []) as ContractWithdrawalItemDto[];
    const hasMore = rows.length > opts.limit;
    const items = hasMore ? rows.slice(0, opts.limit) : rows;
    const next_cursor =
      hasMore && items.length > 0
        ? items[items.length - 1]!.submitted_at
        : null;

    return { items, next_cursor };
  }

  async updateStatus(
    user: CurrentUser,
    id: string,
    status: ContractWithdrawalStatus,
  ): Promise<ContractWithdrawalItemDto> {
    const client = this.supabase.getClient();
    const now = new Date().toISOString();

    const { data, error } = await client
      .from('contract_withdrawals')
      .update({
        status,
        status_updated_at: now,
        status_updated_by: user.id,
      })
      .eq('id', id)
      .select(LIST_COLUMNS)
      .maybeSingle();

    if (error) {
      this.logger.warn(
        `contract_withdrawals update failed (${id}): ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Contract withdrawal update: ${error.message}`,
      );
    }
    if (!data) {
      throw new NotFoundException('Žiadosť neexistuje.');
    }

    void this.audit.recordAuditEvent({
      actorUserId: user.id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'contract.withdrawal.status_updated',
      subjectType: 'contract_withdrawal',
      subjectId: id,
      payload: { status },
    });

    return data as ContractWithdrawalItemDto;
  }
}
