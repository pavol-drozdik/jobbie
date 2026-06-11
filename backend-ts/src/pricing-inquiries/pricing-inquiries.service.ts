import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { escapeHtml } from '../email/transactional-email.template';
import { PricingInquiryDto } from './pricing-inquiry.dto';

const SERVICE_LABELS: Record<string, string> = {
  homepage_banner: 'Banner na domovskej stránke',
  job_list_banner: 'Banner v zozname pracovných ponúk',
  job_list_mini_banner: 'Mini banner',
  top_employers_logo: 'Logo v sekcii TOP zamestnávatelia',
  pr_article: 'PR článok',
  mailing: 'Mailing',
  other: 'Iné',
};

@Injectable()
export class PricingInquiriesService {
  private readonly logger = new Logger(PricingInquiriesService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  async submit(dto: PricingInquiryDto): Promise<{ ok: true }> {
    if (!this.email.isConfigured()) {
      this.logger.warn('SMTP not configured; pricing inquiry rejected');
      throw new ServiceUnavailableException(
        'Kontaktný formulár je dočasne nedostupný. Skúste neskôr alebo napíšte na ahoj@jobbie.sk.',
      );
    }
    const to =
      this.config.get<string>('PRICING_INQUIRY_TO')?.trim() ||
      'ahoj@jobbie.sk';
    const emailNorm = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const company = dto.company.trim();
    const phone = dto.phone?.trim() ?? '';
    const message = dto.message.trim();
    const serviceLabel =
      SERVICE_LABELS[dto.service_id] ?? dto.service_id;

    const html = `
      <h2>Dopyt z cenníka — doplnkové služby</h2>
      <p><strong>Služba:</strong> ${escapeHtml(serviceLabel)}</p>
      <p><strong>Meno:</strong> ${escapeHtml(name)}</p>
      <p><strong>Spoločnosť:</strong> ${escapeHtml(company)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(emailNorm)}</p>
      ${phone ? `<p><strong>Telefón:</strong> ${escapeHtml(phone)}</p>` : ''}
      <p><strong>Správa:</strong></p>
      <pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>
    `.trim();

    const sent = await this.email.sendHtmlEmail({
      to,
      subject: `[JOBBIE Cenník] ${serviceLabel} — ${company}`,
      html,
    });
    if (!sent) {
      this.logger.warn(
        `Pricing inquiry email not sent (to=${to}, service=${dto.service_id})`,
      );
      throw new ServiceUnavailableException(
        'Nepodarilo sa odoslať dopyt. Skúste neskôr alebo napíšte na ahoj@jobbie.sk.',
      );
    }

    void this.audit.recordAuditEvent({
      actorUserId: null,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'pricing.inquiry.received',
      subjectType: 'pricing_inquiry',
      subjectId: dto.service_id,
      payload: { service_id: dto.service_id },
    });

    return { ok: true };
  }
}
