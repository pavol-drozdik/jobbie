import {
  buildTransactionalEmailLayout,
  escapeHtml,
} from './transactional-email.template';

export type BillingInvoiceEmailTemplateParams = {
  appOrigin: string;
  supplierName: string;
  invoiceNumber: string;
  amountFormatted: string;
  paidAtFormatted: string;
  invoiceDetailUrl: string;
};

export function buildBillingInvoiceEmailSubject(
  supplierName: string,
  invoiceNumber: string,
): string {
  const supplier = supplierName.trim() || 'JOBBIE';
  const number = invoiceNumber.trim();
  return number
    ? `Vaša faktúra ${supplier} [č. ${number}]`
    : `Vaša faktúra ${supplier}`;
}

export function buildBillingInvoiceEmailHtml(
  params: BillingInvoiceEmailTemplateParams,
): string {
  const supplier = escapeHtml(params.supplierName.trim() || 'JOBBIE');
  const number = escapeHtml(params.invoiceNumber.trim() || '—');
  const amount = escapeHtml(params.amountFormatted);
  const paidAt = escapeHtml(params.paidAtFormatted);
  const bodyHtml = `
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">Dobrý deň,</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">v prílohe nájdete faktúru od spoločnosti <strong>${supplier}</strong>.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px 0;width:100%;max-width:400px;">
<tr><td style="padding:8px 0;font-size:14px;color:#3d5444;">Číslo faktúry</td><td style="padding:8px 0;font-size:14px;text-align:right;font-weight:600;">${number}</td></tr>
<tr><td style="padding:8px 0;font-size:14px;color:#3d5444;">Zaplatená suma</td><td style="padding:8px 0;font-size:14px;text-align:right;font-weight:600;">${amount}</td></tr>
<tr><td style="padding:8px 0;font-size:14px;color:#3d5444;">Dátum platby</td><td style="padding:8px 0;font-size:14px;text-align:right;font-weight:600;">${paidAt}</td></tr>
</table>
<p style="margin:0;font-size:14px;line-height:1.5;color:#3d5444;">Faktúru si môžete kedykoľvek stiahnuť aj v nastaveniach účtu.</p>`.trim();

  return buildTransactionalEmailLayout({
    appOrigin: params.appOrigin,
    bodyHtml,
    ctaUrl: params.invoiceDetailUrl,
    ctaLabel: 'Zobraziť faktúru',
    preheader: `Faktúra ${params.invoiceNumber.trim() || ''} — ${params.amountFormatted}`,
  });
}

export function formatInvoiceEmailAmount(
  totalCents: number,
  currency: string,
): string {
  const value = (totalCents / 100).toFixed(2);
  if (currency.toUpperCase() === 'EUR') {
    return `${value} €`;
  }
  return `${value} ${currency.toUpperCase()}`;
}

export function formatInvoiceEmailPaidAt(unixSeconds: number): string {
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(unixSeconds * 1000));
  } catch {
    return String(unixSeconds);
  }
}

export function billingInvoicePdfFilename(invoiceNumber: string | null): string {
  const safe = (invoiceNumber?.trim() || 'faktura')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 80);
  return `faktura-${safe}.pdf`;
}
