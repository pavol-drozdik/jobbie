import { BillingInvoiceEmailService } from './billing-invoice-email.service';
import { EmailService } from '../email/email.service';
import { SupabaseService } from '../supabase/supabase.service';

function mockConfig(values: Record<string, string | undefined>) {
  return {
    get: (key: string) => values[key],
  };
}

describe('BillingInvoiceEmailService', () => {
  const invoiceId = 'in_test123';
  const pdfUrl = 'https://pay.stripe.com/invoice/acct_test/pdf';
  const recipient = 'buyer@jobbie.sk';

  function createService(opts: {
    smtp?: boolean;
    enabled?: boolean;
    stripeKey?: string;
    claimInsert?: { data: unknown; error: { code?: string; message?: string } | null };
    claimDelete?: { error: { message?: string } | null };
    invoice?: Record<string, unknown>;
    sendOk?: boolean;
    fetchOk?: boolean;
  }) {
    const email = {
      isConfigured: () => opts.smtp !== false,
      sendHtmlEmail: jest.fn().mockResolvedValue(opts.sendOk !== false),
    } as unknown as EmailService;

    const insertMock = jest.fn().mockReturnValue({
      select: () => ({
        maybeSingle: async () => opts.claimInsert ?? { data: { stripe_invoice_id: invoiceId }, error: null },
      }),
    });
    const deleteMock = jest.fn().mockReturnValue({
      eq: async () => opts.claimDelete ?? { error: null },
    });

    const supabase = {
      getClient: () => ({
        from: (table: string) => {
          if (table === 'billing_invoice_email_dispatches') {
            return {
              insert: insertMock,
              delete: deleteMock,
            };
          }
          throw new Error(`unexpected table ${table}`);
        },
      }),
    } as unknown as SupabaseService;

    const invoicesRetrieve = jest.fn().mockResolvedValue(
      opts.invoice ?? {
        id: invoiceId,
        status: 'paid',
        invoice_pdf: pdfUrl,
        customer_email: recipient,
        number: '1678-1276',
        amount_paid: 50,
        currency: 'eur',
        status_transitions: { paid_at: 1_700_000_000 },
      },
    );

    const svc = new BillingInvoiceEmailService(
      mockConfig({
        STRIPE_SECRET_KEY: opts.stripeKey ?? 'sk_test_x',
        SMTP_HOST: 'smtp.example.com',
        SMTP_FROM: 'Jobbie <noreply@jobbie.sk>',
        PUBLIC_APP_URL: 'https://jobbie.sk',
        BILLING_INVOICE_EMAIL_ENABLED:
          opts.enabled === false ? 'false' : undefined,
      }) as never,
      supabase,
      email,
    );

    (svc as unknown as { stripe: { invoices: { retrieve: jest.Mock } } }).stripe =
      {
        invoices: { retrieve: invoicesRetrieve },
      };

    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: opts.fetchOk !== false,
      status: 200,
      arrayBuffer: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]).buffer,
    }) as unknown as typeof fetch;

    return {
      svc,
      email,
      insertMock,
      deleteMock,
      restore: () => {
        global.fetch = originalFetch;
      },
    };
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends email with PDF when claim succeeds', async () => {
    const { svc, email, restore } = createService({});
    const result = await svc.sendPaidInvoiceEmailIfNeeded(invoiceId);
    restore();
    expect(result.sent).toBe(true);
    expect(email.sendHtmlEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: recipient,
        subject: expect.stringContaining('1678-1276'),
        attachments: expect.arrayContaining([
          expect.objectContaining({ filename: expect.stringContaining('.pdf') }),
        ]),
      }),
    );
  });

  it('skips when dispatch already claimed', async () => {
    const { svc, email, restore } = createService({
      claimInsert: { data: null, error: { code: '23505', message: 'dup' } },
    });
    const result = await svc.sendPaidInvoiceEmailIfNeeded(invoiceId);
    restore();
    expect(result.sent).toBe(false);
    expect(email.sendHtmlEmail).not.toHaveBeenCalled();
  });

  it('releases claim when SMTP fails', async () => {
    const { svc, deleteMock, restore } = createService({ sendOk: false });
    const result = await svc.sendPaidInvoiceEmailIfNeeded(invoiceId);
    restore();
    expect(result.sent).toBe(false);
    expect(deleteMock).toHaveBeenCalled();
  });

  it('skips when invoice not paid', async () => {
    const { svc, email, restore } = createService({
      invoice: {
        id: invoiceId,
        status: 'open',
        invoice_pdf: pdfUrl,
        customer_email: recipient,
      },
    });
    const result = await svc.sendPaidInvoiceEmailIfNeeded(invoiceId);
    restore();
    expect(result.sent).toBe(false);
    expect(email.sendHtmlEmail).not.toHaveBeenCalled();
  });

  it('skips when BILLING_INVOICE_EMAIL_ENABLED=false', async () => {
    const { svc, email, restore } = createService({ enabled: false });
    const result = await svc.sendPaidInvoiceEmailIfNeeded(invoiceId);
    restore();
    expect(result.sent).toBe(false);
    expect(email.sendHtmlEmail).not.toHaveBeenCalled();
  });
});
