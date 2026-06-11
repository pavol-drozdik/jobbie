import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { PricingInquiriesService } from './pricing-inquiries.service';
import type { PricingInquiryDto } from './pricing-inquiry.dto';

describe('PricingInquiriesService', () => {
  const dto: PricingInquiryDto = {
    email: 'user@example.com',
    name: 'User',
    company: 'Co',
    service_id: 'homepage_banner',
    message: 'Hello',
    consent: true,
  };

  function buildService(opts: {
    smtpConfigured: boolean;
    sendOk: boolean;
  }): PricingInquiriesService {
    const email = {
      isConfigured: jest.fn().mockReturnValue(opts.smtpConfigured),
      sendHtmlEmail: jest.fn().mockResolvedValue(opts.sendOk),
    } as unknown as EmailService;
    const config = {
      get: jest.fn((key: string) =>
        key === 'PRICING_INQUIRY_TO' ? 'ahoj@jobbie.sk' : undefined,
      ),
    } as unknown as ConfigService;
    const audit = {
      recordAuditEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;
    return new PricingInquiriesService(config, email, audit);
  }

  it('returns ok when email sends', async () => {
    const svc = buildService({ smtpConfigured: true, sendOk: true });
    await expect(svc.submit(dto)).resolves.toEqual({ ok: true });
  });

  it('throws when SMTP is not configured', async () => {
    const svc = buildService({ smtpConfigured: false, sendOk: false });
    await expect(svc.submit(dto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when sendHtmlEmail fails', async () => {
    const svc = buildService({ smtpConfigured: true, sendOk: false });
    await expect(svc.submit(dto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
