import {
  buildTransactionalEmailLayout,
  escapeHtml,
} from './transactional-email.template';

export type ContractWithdrawalEmailSnapshot = {
  name: string;
  email: string;
  productLabel: string;
  invoiceNumber: string;
  purchaseDateLabel: string;
  reasonLabel: string | null;
  reasonOther: string | null;
  submittedAtLabel: string;
};

function buildDetailRow(label: string, value: string): string {
  return `<tr>
<td style="padding:8px 0;font-size:14px;color:#3d5444;vertical-align:top;">${escapeHtml(label)}</td>
<td style="padding:8px 0;font-size:14px;text-align:right;font-weight:600;vertical-align:top;">${escapeHtml(value)}</td>
</tr>`;
}

function buildWithdrawalDetailsTable(snapshot: ContractWithdrawalEmailSnapshot): string {
  const reasonValue =
    snapshot.reasonLabel == null
      ? 'Neuvedený'
      : snapshot.reasonOther
        ? `${snapshot.reasonLabel} — ${snapshot.reasonOther}`
        : snapshot.reasonLabel;

  const rows = [
    buildDetailRow('Meno a priezvisko', snapshot.name),
    buildDetailRow('E-mail', snapshot.email),
    buildDetailRow('Produkt', snapshot.productLabel),
    buildDetailRow('Číslo faktúry', snapshot.invoiceNumber),
    buildDetailRow('Dátum nákupu', snapshot.purchaseDateLabel),
    buildDetailRow('Dôvod odstúpenia', reasonValue),
    buildDetailRow('Dátum a čas odoslania', snapshot.submittedAtLabel),
  ];

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 4px 0;width:100%;max-width:480px;">
${rows.join('\n')}
</table>`;
}

export function buildContractWithdrawalUserConfirmationSubject(): string {
  return 'Potvrdenie prijatia žiadosti o odstúpenie od zmluvy';
}

export function buildContractWithdrawalUserConfirmationHtml(params: {
  appOrigin: string;
  snapshot: ContractWithdrawalEmailSnapshot;
  termsUrl: string;
}): string {
  const bodyHtml = `
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">Dobrý deň${params.snapshot.name ? `, ${escapeHtml(params.snapshot.name)}` : ''},</p>
<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">potvrdzujeme prijatie vašej žiadosti o <strong>odstúpenie od zmluvy</strong>. Zaznamenali sme ju a spracujeme v súlade s obchodnými podmienkami. O ďalšom postupe vás budeme informovať na uvedenú e-mailovú adresu.</p>
<p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;font-weight:700;">Súhrn vašej žiadosti</p>
${buildWithdrawalDetailsTable(params.snapshot)}
<p style="margin:16px 0 0 0;font-size:14px;line-height:1.5;color:#3d5444;">Ak ste žiadosť neodoslali vy, kontaktujte nás na <a href="mailto:podpora@jobbie.sk" style="color:#22c55e;font-weight:600;text-decoration:none;">podpora@jobbie.sk</a>.</p>`.trim();

  return buildTransactionalEmailLayout({
    appOrigin: params.appOrigin,
    bodyHtml,
    preheader: `Žiadosť o odstúpenie od zmluvy prijatá ${params.snapshot.submittedAtLabel}`,
    footerLinksHtml: `<a href="${escapeHtml(params.termsUrl)}" style="color:#22c55e;text-decoration:none;">Obchodné podmienky</a>`,
  });
}

export function formatContractWithdrawalPurchaseDate(isoDate: string): string {
  const trimmed = isoDate.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return trimmed;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) {
    return trimmed;
  }
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).format(new Date(year, month - 1, day));
  } catch {
    return trimmed;
  }
}

export function formatContractWithdrawalSubmittedAt(date: Date): string {
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}
