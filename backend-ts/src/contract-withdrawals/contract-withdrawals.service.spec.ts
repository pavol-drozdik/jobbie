import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { SupabaseService } from '../supabase/supabase.service';
import { ContractWithdrawalsService } from './contract-withdrawals.service';
import type { ContractWithdrawalDto } from './contract-withdrawal.dto';

describe('ContractWithdrawalsService', () => {
  const dto: ContractWithdrawalDto = {
    name: 'Ján Novák',
    email: 'user@example.com',
    product: 'credits',
    invoice_number: 'INV-123',
    purchase_date: '2026-07-01',
    reason: 'other',
    reason_other: 'Chcem vrátiť nevyužité kredity',
    withdrawal_ack: true,
  };

  function buildService(opts: {
    smtpConfigured: boolean;
    sendOk: boolean;
    insertOk?: boolean;
  }): {
    svc: ContractWithdrawalsService;
    sendHtmlEmail: jest.Mock;
  } {
    const sendHtmlEmail = jest.fn().mockResolvedValue(opts.sendOk);
    const email = {
      isConfigured: jest.fn().mockReturnValue(opts.smtpConfigured),
      sendHtmlEmail,
    } as unknown as EmailService;
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'CONTRACT_WITHDRAWAL_TO') return 'podpora@jobbie.sk';
        if (key === 'PUBLIC_APP_URL') return 'https://jobbie.sk';
        return undefined;
      }),
    } as unknown as ConfigService;
    const audit = {
      recordAuditEvent: jest.fn().mockResolvedValue(undefined),
    } as unknown as AuditService;

    const insertOk = opts.insertOk !== false;
    const single = jest.fn().mockResolvedValue(
      insertOk
        ? { data: { id: 'withdrawal-uuid-1' }, error: null }
        : { data: null, error: { message: 'insert failed' } },
    );
    const select = jest.fn().mockReturnValue({ single });
    const insert = jest.fn().mockReturnValue({ select });
    const from = jest.fn().mockReturnValue({ insert });
    const supabase = {
      getClient: jest.fn().mockReturnValue({ from }),
    } as unknown as SupabaseService;

    return {
      svc: new ContractWithdrawalsService(config, email, audit, supabase),
      sendHtmlEmail,
    };
  }

  it('returns ok when row is inserted and emails send', async () => {
    const { svc, sendHtmlEmail } = buildService({
      smtpConfigured: true,
      sendOk: true,
    });
    await expect(svc.submit(dto)).resolves.toEqual({ ok: true });
    expect(sendHtmlEmail).toHaveBeenCalledTimes(2);
    expect(sendHtmlEmail.mock.calls[0]![0].to).toBe('podpora@jobbie.sk');
    expect(sendHtmlEmail.mock.calls[1]![0].to).toBe('user@example.com');
    expect(sendHtmlEmail.mock.calls[1]![0].html).toContain('<!DOCTYPE html>');
    expect(sendHtmlEmail.mock.calls[1]![0].html).toContain('INV-123');
  });

  it('throws when SMTP is not configured', async () => {
    const { svc } = buildService({ smtpConfigured: false, sendOk: false });
    await expect(svc.submit(dto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when insert fails', async () => {
    const { svc, sendHtmlEmail } = buildService({
      smtpConfigured: true,
      sendOk: true,
      insertOk: false,
    });
    await expect(svc.submit(dto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(sendHtmlEmail).not.toHaveBeenCalled();
  });

  it('throws when sendHtmlEmail fails', async () => {
    const { svc } = buildService({ smtpConfigured: true, sendOk: false });
    await expect(svc.submit(dto)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
