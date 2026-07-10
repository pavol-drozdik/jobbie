import { buildAuthStyleEmailLayout } from './auth-style-email.template';
import { escapeHtml } from './transactional-email.template';

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
  const f =
    "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
  return `<tr>
<td style="padding:10px 0;font-family:${f};font-size:14px;line-height:1.4;color:rgba(0,0,0,0.55);vertical-align:top;">${escapeHtml(label)}</td>
<td style="padding:10px 0;font-family:${f};font-size:14px;line-height:1.4;text-align:right;font-weight:600;color:#1a1a1a;vertical-align:top;">${escapeHtml(value)}</td>
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

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0;background-color:#fafcfb;border:1px solid rgba(0,0,0,0.06);border-radius:18px;">
<tr>
<td style="padding:16px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${rows.join('\n')}
</table>
</td>
</tr>
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
  const nameGreeting = params.snapshot.name
    ? `, ${escapeHtml(params.snapshot.name)}`
    : '';

  return buildAuthStyleEmailLayout({
    appOrigin: params.appOrigin,
    preheader: `Žiadosť o odstúpenie od zmluvy prijatá ${params.snapshot.submittedAtLabel}`,
    titleHtml:
      'Potvrdenie <span style="color:#22c55e;">žiadosti</span>',
    leadHtml: `Dobrý deň${nameGreeting}, potvrdzujeme prijatie vašej žiadosti o <strong style="font-weight:600;color:#1a1a1a;">odstúpenie od zmluvy</strong>. Zaznamenali sme ju a spracujeme v súlade s obchodnými podmienkami. O ďalšom postupe vás budeme informovať na uvedenú e-mailovú adresu.`,
    bodyHtml: `<p style="margin:0 0 12px 0;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;font-weight:700;line-height:1.4;color:#1a1a1a;">Súhrn vašej žiadosti</p>
${buildWithdrawalDetailsTable(params.snapshot)}`,
    footerNoteHtml: `Ak ste žiadosť neodoslali vy, kontaktujte nás na <a href="mailto:podpora@jobbie.sk" style="color:#22c55e;font-weight:600;text-decoration:none;">podpora@jobbie.sk</a>. <a href="${escapeHtml(params.termsUrl)}" style="color:#22c55e;text-decoration:none;">Obchodné podmienky</a>.`,
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
      timeZone: 'Europe/Bratislava',
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
