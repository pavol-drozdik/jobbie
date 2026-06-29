import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import StripeSdk from 'stripe';
import { EmailService } from '../email/email.service';
import {
  billingInvoicePdfFilename,
  buildBillingInvoiceEmailHtml,
  buildBillingInvoiceEmailSubject,
  formatInvoiceEmailAmount,
  formatInvoiceEmailPaidAt,
} from '../email/billing-invoice-email.template';
import { SupabaseService } from '../supabase/supabase.service';
import { getBillingInvoiceSupplier } from './stripe-invoice-sk';
import { STRIPE_API_VERSION, type Invoice, type StripeClient } from './stripe-types';

@Injectable()
export class BillingInvoiceEmailService {
  private readonly logger = new Logger(BillingInvoiceEmailService.name);
  private stripe: StripeClient | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly supabaseService: SupabaseService,
    private readonly email: EmailService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new StripeSdk(key, {
        apiVersion: STRIPE_API_VERSION,
        timeout: 30_000,
        maxNetworkRetries: 2,
      });
    }
  }

  private isEnabled(): boolean {
    if (!this.email.isConfigured()) {
      return false;
    }
    const raw = this.config
      .get<string>('BILLING_INVOICE_EMAIL_ENABLED')
      ?.trim()
      .toLowerCase();
    if (raw === 'false' || raw === '0' || raw === 'no') {
      return false;
    }
    return true;
  }

  private getStripe(): StripeClient | null {
    return this.stripe;
  }

  /**
   * Idempotent: sends paid faktúra email with PDF attachment once per Stripe invoice.
   * Non-blocking — failures are logged; claim row is released on SMTP/PDF errors.
   */
  async sendPaidInvoiceEmailIfNeeded(
    invoiceId: string,
  ): Promise<{ sent: boolean }> {
    const trimmedId = invoiceId?.trim();
    if (!trimmedId?.startsWith('in_')) {
      return { sent: false };
    }
    if (!this.isEnabled()) {
      this.logger.warn(
        `Billing invoice email skipped for ${trimmedId} (SMTP disabled or BILLING_INVOICE_EMAIL_ENABLED=false)`,
      );
      return { sent: false };
    }
    const stripe = this.getStripe();
    if (!stripe) {
      this.logger.warn(
        `Billing invoice email skipped for ${trimmedId} (Stripe not configured)`,
      );
      return { sent: false };
    }

    let invoice: Invoice;
    try {
      invoice = await stripe.invoices.retrieve(trimmedId, {
        expand: ['customer'],
      });
    } catch (err) {
      this.logger.warn(
        `Could not retrieve invoice ${trimmedId} for email: ${String(err)}`,
      );
      return { sent: false };
    }

    if (invoice.status !== 'paid') {
      return { sent: false };
    }

    const pdfUrl = invoice.invoice_pdf?.trim();
    if (!pdfUrl) {
      this.logger.warn(
        `Billing invoice email skipped for ${trimmedId} (no invoice_pdf)`,
      );
      return { sent: false };
    }

    const recipient = await this.resolveRecipientEmail(invoice);
    if (!recipient) {
      this.logger.warn(
        `Billing invoice email skipped for ${trimmedId} (no customer email)`,
      );
      return { sent: false };
    }

    const claimed = await this.claimDispatch(trimmedId, recipient);
    if (!claimed) {
      return { sent: false };
    }

    try {
      const pdfRes = await fetch(pdfUrl);
      if (!pdfRes.ok) {
        throw new Error(`PDF fetch HTTP ${pdfRes.status}`);
      }
      const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
      const supplier = getBillingInvoiceSupplier(this.config);
      const appOrigin =
        this.config.get<string>('PUBLIC_APP_URL')?.trim() ||
        'https://jobbie.sk';
      const invoiceNumber = invoice.number?.trim() || trimmedId;
      const paidAtUnix =
        invoice.status_transitions?.paid_at ??
        invoice.status_transitions?.finalized_at ??
        invoice.created ??
        Math.floor(Date.now() / 1000);
      const totalCents = invoice.amount_paid ?? invoice.total ?? 0;
      const currency = invoice.currency ?? 'eur';
      const html = buildBillingInvoiceEmailHtml({
        appOrigin,
        supplierName: supplier.name,
        invoiceNumber,
        amountFormatted: formatInvoiceEmailAmount(totalCents, currency),
        paidAtFormatted: formatInvoiceEmailPaidAt(paidAtUnix),
        invoiceDetailUrl: `${appOrigin.replace(/\/$/, '')}/nastavenia/fakturacia/${encodeURIComponent(trimmedId)}`,
      });
      const subject = buildBillingInvoiceEmailSubject(
        supplier.name,
        invoiceNumber,
      );
      const sent = await this.email.sendHtmlEmail({
        to: recipient,
        subject,
        html,
        attachments: [
          {
            filename: billingInvoicePdfFilename(invoice.number),
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      if (!sent) {
        throw new Error('SMTP sendHtmlEmail returned false');
      }
      this.logger.log(
        `Billing invoice email sent for ${trimmedId} to ${recipient}`,
      );
      return { sent: true };
    } catch (err) {
      await this.releaseDispatch(trimmedId);
      this.logger.warn(
        `Billing invoice email failed for ${trimmedId}: ${String(err)}`,
      );
      return { sent: false };
    }
  }

  private async resolveRecipientEmail(invoice: Invoice): Promise<string | null> {
    const fromInvoice = invoice.customer_email?.trim();
    if (fromInvoice) {
      return fromInvoice;
    }
    const customerRef = invoice.customer;
    if (customerRef && typeof customerRef === 'object' && 'email' in customerRef) {
      const email = (customerRef as { email?: string | null }).email?.trim();
      if (email) {
        return email;
      }
    }
    const customerId =
      typeof customerRef === 'string'
        ? customerRef
        : customerRef && typeof customerRef === 'object' && 'id' in customerRef
          ? String((customerRef as { id: string }).id)
          : null;
    if (!customerId || !this.stripe) {
      return null;
    }
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer && !('deleted' in customer && customer.deleted)) {
        return customer.email?.trim() || null;
      }
    } catch (err) {
      this.logger.warn(
        `Could not load customer ${customerId} for invoice email: ${String(err)}`,
      );
    }
    return null;
  }

  private async claimDispatch(
    stripeInvoiceId: string,
    recipientEmail: string,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('billing_invoice_email_dispatches')
      .insert({
        stripe_invoice_id: stripeInvoiceId,
        recipient_email: recipientEmail,
      })
      .select('stripe_invoice_id')
      .maybeSingle();
    if (error) {
      if (error.code === '23505') {
        return false;
      }
      this.logger.warn(
        `billing_invoice_email_dispatches insert failed for ${stripeInvoiceId}: ${error.message}`,
      );
      return false;
    }
    return Boolean(data);
  }

  private async releaseDispatch(stripeInvoiceId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase
      .from('billing_invoice_email_dispatches')
      .delete()
      .eq('stripe_invoice_id', stripeInvoiceId);
    if (error) {
      this.logger.warn(
        `billing_invoice_email_dispatches release failed for ${stripeInvoiceId}: ${error.message}`,
      );
    }
  }
}
