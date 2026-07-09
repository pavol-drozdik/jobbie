import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { resolvePublicAppOrigin } from '../common/public-urls.util';
import {
  buildContractWithdrawalUserConfirmationHtml,
  buildContractWithdrawalUserConfirmationSubject,
  formatContractWithdrawalPurchaseDate,
  formatContractWithdrawalSubmittedAt,
} from '../email/contract-withdrawal-email.template';
import { EmailService } from '../email/email.service';
import { escapeHtml } from '../email/transactional-email.template';
import { SupabaseService } from '../supabase/supabase.service';
import { ContractWithdrawalDto } from './contract-withdrawal.dto';

const PRODUCT_LABELS: Record<string, string> = {
  subscription: 'Predplatné',
  credits: 'Kredity',
};

const REASON_LABELS: Record<string, string> = {
  changed_mind: 'Rozmyslel/a som si nákup',
  no_longer_needed: 'Službu už nepotrebujem',
  other: 'Iné',
};

@Injectable()
export class ContractWithdrawalsService {
  private readonly logger = new Logger(ContractWithdrawalsService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    private readonly supabase: SupabaseService,
  ) {}

  async submit(dto: ContractWithdrawalDto): Promise<{ ok: true }> {
    if (!this.email.isConfigured()) {
      this.logger.warn('SMTP not configured; contract withdrawal rejected');
      throw new ServiceUnavailableException(
        'Formulár je dočasne nedostupný. Skúste neskôr alebo napíšte na podpora@jobbie.sk.',
      );
    }

    const to =
      this.config.get<string>('CONTRACT_WITHDRAWAL_TO')?.trim() ||
      'podpora@jobbie.sk';

    const name = dto.name.trim();
    const emailNorm = dto.email.trim().toLowerCase();
    const invoiceNumber = dto.invoice_number.trim();
    const purchaseDate = dto.purchase_date.trim();
    const productLabel = PRODUCT_LABELS[dto.product] ?? dto.product;
    const reasonLabel = dto.reason
      ? (REASON_LABELS[dto.reason] ?? dto.reason)
      : null;
    const reasonOther = dto.reason_other?.trim() ?? '';
    const submittedAt = new Date();
    const submittedAtIso = submittedAt.toISOString();
    const submittedAtLabel = formatContractWithdrawalSubmittedAt(submittedAt);
    const purchaseDateLabel = formatContractWithdrawalPurchaseDate(purchaseDate);
    const appOrigin = resolvePublicAppOrigin(this.config);

    const { data: inserted, error: insertError } = await this.supabase
      .getClient()
      .from('contract_withdrawals')
      .insert({
        status: 'pending',
        name: name.slice(0, 200),
        email: emailNorm,
        product: dto.product,
        invoice_number: invoiceNumber.slice(0, 80),
        purchase_date: purchaseDate,
        reason: dto.reason ?? null,
        reason_other: reasonOther ? reasonOther.slice(0, 500) : null,
        submitted_at: submittedAtIso,
      })
      .select('id')
      .single();

    if (insertError || !inserted?.id) {
      this.logger.warn(
        `contract_withdrawals insert failed: ${insertError?.message ?? 'no row'}`,
      );
      throw new ServiceUnavailableException(
        'Nepodarilo sa uložiť žiadosť. Skúste neskôr alebo napíšte na podpora@jobbie.sk.',
      );
    }

    const withdrawalId = inserted.id as string;

    const supportHtml = `
      <h2>Odstúpenie od zmluvy</h2>
      <p><strong>ID žiadosti:</strong> ${escapeHtml(withdrawalId)}</p>
      <p><strong>Meno:</strong> ${escapeHtml(name)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(emailNorm)}</p>
      <p><strong>Produkt:</strong> ${escapeHtml(productLabel)}</p>
      <p><strong>Číslo faktúry:</strong> ${escapeHtml(invoiceNumber)}</p>
      <p><strong>Dátum nákupu:</strong> ${escapeHtml(purchaseDateLabel)}</p>
      ${
        reasonLabel
          ? `<p><strong>Dôvod odstúpenia:</strong> ${escapeHtml(reasonLabel)}${
              dto.reason === 'other' && reasonOther
                ? ` — ${escapeHtml(reasonOther)}`
                : ''
            }</p>`
          : '<p><strong>Dôvod odstúpenia:</strong> neuvedený</p>'
      }
      <p><strong>Dátum a čas odoslania:</strong> ${escapeHtml(submittedAtLabel)}</p>
      <p><strong>Potvrdenie odstúpenia:</strong> áno</p>
    `.trim();

    const supportSent = await this.email.sendHtmlEmail({
      to,
      subject: `[JOBBIE] Odstúpenie od zmluvy — ${invoiceNumber}`,
      html: supportHtml,
    });

    if (!supportSent) {
      this.logger.warn(
        `Contract withdrawal email not sent (to=${to}, invoice=${invoiceNumber})`,
      );
      throw new ServiceUnavailableException(
        'Nepodarilo sa odoslať žiadosť. Skúste neskôr alebo napíšte na podpora@jobbie.sk.',
      );
    }

    const userHtml = buildContractWithdrawalUserConfirmationHtml({
      appOrigin,
      termsUrl: `${appOrigin}/vseobecne-podmienky`,
      snapshot: {
        name,
        email: emailNorm,
        productLabel,
        invoiceNumber,
        purchaseDateLabel,
        reasonLabel,
        reasonOther: reasonOther || null,
        submittedAtLabel,
      },
    });

    const userSent = await this.email.sendHtmlEmail({
      to: emailNorm,
      subject: buildContractWithdrawalUserConfirmationSubject(),
      html: userHtml,
    });

    if (!userSent) {
      this.logger.warn(
        `Contract withdrawal confirmation not sent (to=${emailNorm}, invoice=${invoiceNumber})`,
      );
      throw new ServiceUnavailableException(
        'Nepodarilo sa odoslať potvrdenie e-mailom. Skúste neskôr alebo napíšte na podpora@jobbie.sk.',
      );
    }

    void this.audit.recordAuditEvent({
      actorUserId: null,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'contract.withdrawal.received',
      subjectType: 'contract_withdrawal',
      subjectId: withdrawalId,
      payload: {
        product: dto.product,
        ...(dto.reason ? { reason: dto.reason } : {}),
      },
    });

    return { ok: true };
  }
}
