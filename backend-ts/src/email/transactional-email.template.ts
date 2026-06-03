/**
 * JOBBIE transactional email brand tokens (mirror app-pwa `marketing.*` / main.css).
 */
export const EMAIL_BRAND = {
  pageBg: '#F6FAF8',
  headerBg: '#f2faf4',
  surface: '#ffffff',
  soft: '#fafcfb',
  green: '#22c55e',
  greenDark: '#1e8a47',
  ink: '#0e1c12',
  inkMuted: '#3d5444',
  inkLight: '#8a9e8f',
  border: 'rgba(0,0,0,0.06)',
  fontFamily: "'DM Sans', Inter, system-ui, -apple-system, sans-serif",
  maxWidth: 600,
  cardRadius: '20px',
  pillRadius: '9999px',
} as const;

export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export type TransactionalEmailLayoutParams = {
  appOrigin: string;
  /** Main HTML inside the content card (already escaped where needed). */
  bodyHtml: string;
  /** Optional primary CTA below body. */
  ctaUrl?: string;
  ctaLabel?: string;
  /** Footer links HTML (escaped hrefs; text may contain &lt;a&gt;). */
  footerLinksHtml?: string;
  /** Optional preheader text (hidden in clients that support it). */
  preheader?: string;
};

function buildPrimaryCtaHtml(ctaUrl: string, ctaLabel: string): string {
  const href = escapeHtml(ctaUrl);
  const label = escapeHtml(ctaLabel);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;">
<tr>
<td align="center" style="border-radius:${EMAIL_BRAND.pillRadius};background:${EMAIL_BRAND.green};">
<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-family:${EMAIL_BRAND.fontFamily};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:${EMAIL_BRAND.pillRadius};">${label}</a>
</td>
</tr>
</table>`;
}

/**
 * Full HTML document shell for product transactional emails.
 */
export function buildTransactionalEmailLayout(
  params: TransactionalEmailLayoutParams,
): string {
  const origin = params.appOrigin.replace(/\/$/, '');
  const homeUrl = escapeHtml(origin);
  const preheader = params.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(params.preheader)}</div>`
    : '';
  const ctaBlock =
    params.ctaUrl && params.ctaLabel
      ? buildPrimaryCtaHtml(params.ctaUrl, params.ctaLabel)
      : '';
  const footerBlock = params.footerLinksHtml
    ? `<div style="margin:20px 0 0 0;font-family:${EMAIL_BRAND.fontFamily};font-size:12px;line-height:1.5;color:${EMAIL_BRAND.inkLight};">${params.footerLinksHtml}</div>`
    : '';
  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>JOBBIE</title>
</head>
<body style="margin:0;padding:0;background:${EMAIL_BRAND.pageBg};font-family:${EMAIL_BRAND.fontFamily};color:${EMAIL_BRAND.ink};">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_BRAND.pageBg};">
<tr>
<td align="center" style="padding:24px 16px;">
<table role="presentation" width="${EMAIL_BRAND.maxWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width:${EMAIL_BRAND.maxWidth}px;width:100%;">
<tr>
<td style="background:${EMAIL_BRAND.headerBg};border-radius:${EMAIL_BRAND.cardRadius} ${EMAIL_BRAND.cardRadius} 0 0;padding:20px 24px;text-align:center;">
<a href="${homeUrl}" target="_blank" rel="noopener noreferrer" style="font-family:${EMAIL_BRAND.fontFamily};font-size:22px;font-weight:900;letter-spacing:-0.02em;color:${EMAIL_BRAND.ink};text-decoration:none;">JOBBIE</a>
</td>
</tr>
<tr>
<td style="background:${EMAIL_BRAND.surface};border-radius:0 0 ${EMAIL_BRAND.cardRadius} ${EMAIL_BRAND.cardRadius};padding:28px 24px 24px 24px;border:1px solid ${EMAIL_BRAND.border};border-top:none;">
<div style="font-family:${EMAIL_BRAND.fontFamily};font-size:15px;line-height:1.55;color:${EMAIL_BRAND.ink};">
${params.bodyHtml}
</div>
${ctaBlock}
${footerBlock}
</td>
</tr>
<tr>
<td style="padding:16px 8px 0 8px;text-align:center;">
<p style="margin:0;font-family:${EMAIL_BRAND.fontFamily};font-size:11px;color:${EMAIL_BRAND.inkLight};">© JOBBIE</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}
