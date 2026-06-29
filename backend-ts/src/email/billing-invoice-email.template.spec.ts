import {
  buildBillingInvoiceEmailHtml,
  buildBillingInvoiceEmailSubject,
  formatInvoiceEmailAmount,
} from './billing-invoice-email.template';
import { EMAIL_BRAND } from './transactional-email.template';

describe('billing-invoice-email.template', () => {
  it('buildBillingInvoiceEmailSubject includes supplier and number', () => {
    expect(buildBillingInvoiceEmailSubject('CoCreate s. r. o.', '1678-1276')).toBe(
      'Vaša faktúra CoCreate s. r. o. [č. 1678-1276]',
    );
  });

  it('buildBillingInvoiceEmailHtml renders branded layout with CTA', () => {
    const html = buildBillingInvoiceEmailHtml({
      appOrigin: 'https://jobbie.sk',
      supplierName: 'CoCreate s. r. o.',
      invoiceNumber: '1678-1276',
      amountFormatted: '0,50 €',
      paidAtFormatted: '28. 6. 2026, 22:02:29',
      invoiceDetailUrl: 'https://jobbie.sk/nastavenia/fakturacia/in_abc',
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain(EMAIL_BRAND.green);
    expect(html).toContain('1678-1276');
    expect(html).toContain('0,50 €');
    expect(html).toContain('/nastavenia/fakturacia/in_abc');
    expect(html).toContain('Zobraziť faktúru');
  });

  it('formatInvoiceEmailAmount formats EUR', () => {
    expect(formatInvoiceEmailAmount(50, 'eur')).toBe('0.50 €');
  });
});
