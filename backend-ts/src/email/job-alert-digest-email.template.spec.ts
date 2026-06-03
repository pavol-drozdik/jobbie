import { buildJobAlertDigestEmailHtml } from './job-alert-digest-email.template';
import { EMAIL_BRAND } from './transactional-email.template';

const BASE = {
  alertName: 'Stavba',
  listUrl: 'https://jobbie.test/pracovne-ponuky?category=stavba',
  manageAlertsUrl: 'https://jobbie.test/ponuky-na-email',
  pauseUrl: 'https://jobbie.test/api/public/job-alerts/pause?token=t',
  unsubscribeUrl:
    'https://jobbie.test/unsubscribe/u?category=job_email_alerts',
  appOrigin: 'https://jobbie.test',
};

describe('buildJobAlertDigestEmailHtml', () => {
  it('returns branded full HTML document with job cards', () => {
    const html = buildJobAlertDigestEmailHtml({
      ...BASE,
      jobs: [
        {
          id: 'j1',
          title: 'Murár <test>',
          companyLabel: 'Firma A',
          locationLine: 'Bratislava',
          payLine: '1 200 €',
          jobUrl: 'https://jobbie.test/app/jobs/j1',
        },
        {
          id: 'j2',
          title: 'Elektrikár',
          companyLabel: 'Firma B',
          locationLine: 'Košice',
          payLine: '—',
          jobUrl: 'https://jobbie.test/app/jobs/j2',
        },
      ],
    });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('lang="sk"');
    expect(html).toContain(EMAIL_BRAND.pageBg);
    expect(html).toContain(EMAIL_BRAND.green);
    expect(html).toContain(EMAIL_BRAND.soft);
    expect(html).toContain('border-radius:20px');
    expect(html).toContain('JOBBIE');
    expect(html).toContain('Murár &lt;test&gt;');
    expect(html).not.toContain('Murár <test>');
    expect(html).toContain('/app/jobs/j1');
    expect(html).toContain('/app/jobs/j2');
    expect(html).toContain('Všetky zodpovedajúce ponuky');
    expect(html).toContain('Pozastaviť toto upozornenie');
    expect(html).toContain('Vypnúť e-maily s ponukami');
    expect(html).toContain('Spravovať upozornenia');
    expect(html).toContain('pause?token=t');
    expect(html).toContain('href="https://jobbie.test/ponuky-na-email"');
    expect(html).toContain('role="presentation"');
  });
});
