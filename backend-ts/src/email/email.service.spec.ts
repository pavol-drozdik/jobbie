import { EmailService } from './email.service';

function mockConfig(values: Record<string, string | undefined>): {
  get: (key: string) => string | undefined;
} {
  return {
    get: (key: string) => values[key],
  };
}

describe('EmailService', () => {
  it('isConfigured is false without SMTP_HOST', () => {
    const svc = new EmailService(
      mockConfig({ SMTP_FROM: 'Jobbie <noreply@example.com>' }) as never,
    );
    expect(svc.isConfigured()).toBe(false);
  });

  it('isConfigured is false without SMTP_FROM', () => {
    const svc = new EmailService(mockConfig({ SMTP_HOST: 'smtp.example.com' }) as never);
    expect(svc.isConfigured()).toBe(false);
  });

  it('isConfigured is true when host and from are set', () => {
    const svc = new EmailService(
      mockConfig({
        SMTP_HOST: 'smtp.example.com',
        SMTP_FROM: 'Jobbie <noreply@example.com>',
      }) as never,
    );
    expect(svc.isConfigured()).toBe(true);
  });

  it('sendHtmlEmail skips when SMTP is not configured', async () => {
    const svc = new EmailService(mockConfig({}) as never);
    await expect(
      svc.sendHtmlEmail({ to: 'a@b.c', subject: 's', html: '<p>x</p>' }),
    ).resolves.toBe(false);
  });
});
