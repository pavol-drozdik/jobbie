import { escapeHtml } from './transactional-email.template';

/** Visual tokens aligned with `supabase/email-templates/*.html`. */
export const AUTH_EMAIL_BRAND = {
  pageBg: '#f2faf4',
  cardWidth: 520,
  cardRadius: '24px',
  cardShadow: '0 8px 40px rgba(0,0,0,0.13)',
  headerGradient: 'linear-gradient(155deg,#15803d 0%,#22c55e 100%)',
  green: '#22c55e',
  ink: '#1a1a1a',
  inkMuted: 'rgba(0,0,0,0.55)',
  inkLight: 'rgba(0,0,0,0.4)',
  soft: '#fafcfb',
  border: 'rgba(0,0,0,0.06)',
  fontFamily:
    "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  pillRadius: '9999px',
} as const;

export type AuthStyleEmailLayoutParams = {
  appOrigin: string;
  /** Hidden inbox preview line */
  preheader?: string;
  /** Inner HTML for `<h1>` (may include green accent `<span>`). */
  titleHtml: string;
  /** Lead paragraph below title (HTML, escaped by caller). */
  leadHtml?: string;
  /** Main body HTML inside white card. */
  bodyHtml: string;
  /** Small muted note above copyright. */
  footerNoteHtml?: string;
  ctaUrl?: string;
  ctaLabel?: string;
};

function buildCtaBlock(ctaUrl: string, ctaLabel: string): string {
  const href = escapeHtml(ctaUrl);
  const label = escapeHtml(ctaLabel);
  const f = AUTH_EMAIL_BRAND.fontFamily;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0 0;">
<tr>
<td align="center" height="56" style="border-radius:${AUTH_EMAIL_BRAND.pillRadius};background-color:${AUTH_EMAIL_BRAND.green};height:56px;">
<a href="${href}" target="_blank" rel="noopener noreferrer" style="display:block;width:100%;height:56px;line-height:56px;font-family:${f};font-size:18px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;border-radius:${AUTH_EMAIL_BRAND.pillRadius};">${label}</a>
</td>
</tr>
</table>`;
}

/**
 * Auth / login-card email shell (Supabase `email-templates` parity).
 */
export function buildAuthStyleEmailLayout(
  params: AuthStyleEmailLayoutParams,
): string {
  const origin = params.appOrigin.replace(/\/$/, '');
  const homeUrl = escapeHtml(origin);
  const logoUrl = `${homeUrl}/jobbielogowhite.svg`;
  const f = AUTH_EMAIL_BRAND.fontFamily;
  const preheader = params.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(params.preheader)}</div>`
    : '';
  const leadBlock = params.leadHtml
    ? `<p style="margin:0 0 32px 0;font-family:${f};font-size:17px;font-weight:400;line-height:1.5;color:${AUTH_EMAIL_BRAND.inkMuted};">${params.leadHtml}</p>`
    : '';
  const ctaBlock =
    params.ctaUrl && params.ctaLabel
      ? buildCtaBlock(params.ctaUrl, params.ctaLabel)
      : '';
  const footerNote = params.footerNoteHtml
    ? `<p style="margin:28px 0 0 0;font-family:${f};font-size:13px;line-height:1.5;color:${AUTH_EMAIL_BRAND.inkLight};">${params.footerNoteHtml}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>JOBBIE</title>
<!--[if mso]><style type="text/css">body,table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${AUTH_EMAIL_BRAND.pageBg};font-family:${f};color:${AUTH_EMAIL_BRAND.ink};-webkit-font-smoothing:antialiased;">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${AUTH_EMAIL_BRAND.pageBg};">
<tr>
<td align="center" style="padding:40px 20px;">
<table role="presentation" width="${AUTH_EMAIL_BRAND.cardWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width:${AUTH_EMAIL_BRAND.cardWidth}px;width:100%;border-radius:${AUTH_EMAIL_BRAND.cardRadius};overflow:hidden;box-shadow:${AUTH_EMAIL_BRAND.cardShadow};">
<tr>
<td style="background:#22c55e;background-image:${AUTH_EMAIL_BRAND.headerGradient};padding:32px 36px 28px 36px;">
<a href="${homeUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
<img src="${logoUrl}" width="132" height="39" alt="JOBBIE" style="display:block;border:0;outline:none;height:auto;max-width:132px;" />
</a>
</td>
</tr>
<tr>
<td style="background-color:#ffffff;padding:40px 36px 44px 36px;">
<h1 style="margin:0 0 8px 0;font-family:${f};font-size:32px;font-weight:800;line-height:1.1;color:#000000;">${params.titleHtml}</h1>
${leadBlock}
${params.bodyHtml}
${ctaBlock}
${footerNote}
</td>
</tr>
</table>
<p style="margin:20px 0 0 0;font-family:${f};font-size:12px;color:#8e8e8e;text-align:center;">© JOBBIE</p>
</td>
</tr>
</table>
</body>
</html>`;
}
