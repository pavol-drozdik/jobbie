import {
  buildTransactionalEmailLayout,
  EMAIL_BRAND,
  escapeHtml,
} from './transactional-email.template';

export type JobAlertDigestJobLine = {
  id: string;
  title: string;
  companyLabel: string;
  locationLine: string;
  payLine: string;
  jobUrl: string;
};

export type JobAlertDigestEmailParams = {
  alertName: string;
  jobs: JobAlertDigestJobLine[];
  listUrl: string;
  manageAlertsUrl: string;
  pauseUrl: string;
  unsubscribeUrl: string;
  appOrigin: string;
};

function buildJobCardHtml(job: JobAlertDigestJobLine): string {
  const title = escapeHtml(job.title);
  const meta = escapeHtml(
    [job.companyLabel, job.locationLine, job.payLine].join(' · '),
  );
  const jobHref = escapeHtml(job.jobUrl);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px 0;">
<tr>
<td style="background:${EMAIL_BRAND.soft};border:1px solid ${EMAIL_BRAND.border};border-radius:${EMAIL_BRAND.cardRadius};padding:16px 18px;">
<p style="margin:0 0 6px 0;font-family:${EMAIL_BRAND.fontFamily};font-size:17px;font-weight:800;line-height:1.3;color:${EMAIL_BRAND.ink};">${title}</p>
<p style="margin:0 0 12px 0;font-family:${EMAIL_BRAND.fontFamily};font-size:14px;line-height:1.45;color:${EMAIL_BRAND.inkMuted};">${meta}</p>
<a href="${jobHref}" target="_blank" rel="noopener noreferrer" style="font-family:${EMAIL_BRAND.fontFamily};font-size:14px;font-weight:700;color:${EMAIL_BRAND.greenDark};text-decoration:underline;">Zobraziť ponuku</a>
</td>
</tr>
</table>`;
}

function buildFooterActionButton(
  href: string,
  label: string,
  variant: 'outline' | 'primary',
): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  if (variant === 'primary') {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
<tr>
<td align="center" style="border-radius:${EMAIL_BRAND.pillRadius};background:${EMAIL_BRAND.green};">
<a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:block;padding:12px 20px;font-family:${EMAIL_BRAND.fontFamily};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;border-radius:${EMAIL_BRAND.pillRadius};">${safeLabel}</a>
</td>
</tr>
</table>`;
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px 0;">
<tr>
<td align="center" style="border-radius:${EMAIL_BRAND.pillRadius};background:${EMAIL_BRAND.soft};border:1px solid ${EMAIL_BRAND.green};">
<a href="${safeHref}" target="_blank" rel="noopener noreferrer" style="display:block;padding:12px 20px;font-family:${EMAIL_BRAND.fontFamily};font-size:14px;font-weight:700;color:${EMAIL_BRAND.greenDark};text-decoration:none;text-align:center;border-radius:${EMAIL_BRAND.pillRadius};">${safeLabel}</a>
</td>
</tr>
</table>`;
}

function buildFooterLinksHtml(params: JobAlertDigestEmailParams): string {
  const intro = `<p style="margin:0 0 12px 0;font-family:${EMAIL_BRAND.fontFamily};font-size:12px;line-height:1.5;color:${EMAIL_BRAND.inkLight};">JOBBIE — upozornenia spravujte v aplikácii.</p>`;
  const pauseBtn = buildFooterActionButton(
    params.pauseUrl,
    'Pozastaviť toto upozornenie',
    'outline',
  );
  const unsubBtn = buildFooterActionButton(
    params.unsubscribeUrl,
    'Vypnúť e-maily s ponukami',
    'primary',
  );
  const manageBtn = buildFooterActionButton(
    params.manageAlertsUrl,
    'Spravovať upozornenia',
    'outline',
  );
  return `${intro}${pauseBtn}${unsubBtn}${manageBtn}`;
}

/**
 * Branded HTML digest for job email alerts (ponuky na e-mail).
 */
export function buildJobAlertDigestEmailHtml(
  params: JobAlertDigestEmailParams,
): string {
  const alertName = escapeHtml(params.alertName.trim());
  const intro = `<p style="margin:0 0 8px 0;font-family:${EMAIL_BRAND.fontFamily};font-size:15px;line-height:1.55;color:${EMAIL_BRAND.ink};">Dobrý deň,</p>
<p style="margin:0 0 20px 0;font-family:${EMAIL_BRAND.fontFamily};font-size:15px;line-height:1.55;color:${EMAIL_BRAND.ink};">Nové pracovné ponuky podľa vášho upozornenia <strong>${alertName}</strong>.</p>`;
  const cards = params.jobs.map((j) => buildJobCardHtml(j)).join('');
  const bodyHtml = `${intro}${cards}`;
  const count = params.jobs.length;
  const preheader =
    count === 1
      ? `1 nová ponuka: ${params.jobs[0]?.title ?? ''}`
      : `${count} nových ponúk podľa ${params.alertName}`;
  return buildTransactionalEmailLayout({
    appOrigin: params.appOrigin,
    bodyHtml,
    ctaUrl: params.listUrl,
    ctaLabel: 'Všetky zodpovedajúce ponuky',
    footerLinksHtml: buildFooterLinksHtml(params),
    preheader,
  });
}
