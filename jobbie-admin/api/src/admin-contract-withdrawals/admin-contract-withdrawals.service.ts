import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { csvEscape } from '../audit/admin-audit.dto';
import type { CurrentUser } from '../auth/auth.types';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  ContractWithdrawalItemDto,
  ContractWithdrawalListDto,
  ContractWithdrawalStatus,
} from './admin-contract-withdrawals.dto';

const LIST_COLUMNS =
  'id, status, name, email, product, invoice_number, purchase_date, reason, reason_other, submitted_at, status_updated_at, status_updated_by';

const EXPORT_MAX_ROWS = 100_000;

const CSV_HEADER =
  'id,status,name,email,product,invoice_number,purchase_date,reason,reason_other,submitted_at,status_updated_at,status_updated_by\n';

type ListFilterOpts = {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
};

@Injectable()
export class AdminContractWithdrawalsService {
  private readonly logger = new Logger(AdminContractWithdrawalsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  // Supabase filter builder types are awkward to thread through helpers.
  private applyListFilters(query: any, opts: ListFilterOpts): any {
    let q = query;
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
    return q;
  }

  private handleListError(error: { message: string }): never {
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

  async list(opts: ListFilterOpts & {
    limit: number;
    cursor?: string;
  }): Promise<ContractWithdrawalListDto> {
    const client = this.supabase.getClient();
    let q = this.applyListFilters(
      client
        .from('contract_withdrawals')
        .select(LIST_COLUMNS)
        .order('submitted_at', { ascending: false })
        .limit(opts.limit + 1),
      opts,
    );

    if (opts.cursor?.trim()) {
      q = q.lt('submitted_at', opts.cursor.trim());
    }

    const { data, error } = await q;
    if (error) {
      this.handleListError(error);
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

  async exportRows(
    opts: ListFilterOpts,
    format: 'csv' | 'json',
  ): Promise<{ body: string; contentType: string; filename: string }> {
    const client = this.supabase.getClient();
    const q = this.applyListFilters(
      client
        .from('contract_withdrawals')
        .select(LIST_COLUMNS)
        .order('submitted_at', { ascending: true })
        .limit(EXPORT_MAX_ROWS),
      opts,
    );

    const { data, error } = await q;
    if (error) {
      this.handleListError(error);
    }

    const rows = (data ?? []) as ContractWithdrawalItemDto[];
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === 'csv') {
      const lines = rows.map((row) =>
        [
          row.id,
          row.status,
          row.name,
          row.email,
          row.product,
          row.invoice_number,
          row.purchase_date,
          row.reason,
          row.reason_other,
          row.submitted_at,
          row.status_updated_at,
          row.status_updated_by,
        ]
          .map(csvEscape)
          .join(','),
      );
      return {
        body: CSV_HEADER + lines.join('\n'),
        contentType: 'text/csv; charset=utf-8',
        filename: `jobbie-contract-withdrawals-${stamp}.csv`,
      };
    }

    return {
      body: JSON.stringify(rows, null, 2),
      contentType: 'application/json; charset=utf-8',
      filename: `jobbie-contract-withdrawals-${stamp}.json`,
    };
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
