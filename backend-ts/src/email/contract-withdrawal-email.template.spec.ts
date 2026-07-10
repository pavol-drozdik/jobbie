import {
  buildContractWithdrawalUserConfirmationHtml,
  buildContractWithdrawalUserConfirmationSubject,
  formatContractWithdrawalPurchaseDate,
  formatContractWithdrawalSubmittedAt,
} from './contract-withdrawal-email.template';

describe('contract-withdrawal-email.template', () => {
  it('buildContractWithdrawalUserConfirmationHtml uses auth-style Supabase layout', () => {
    const html = buildContractWithdrawalUserConfirmationHtml({
      appOrigin: 'https://jobbie.sk',
      termsUrl: 'https://jobbie.sk/vseobecne-podmienky',
      snapshot: {
        name: 'Ján Novák',
        email: 'jan@example.com',
        productLabel: 'Kredity',
        invoiceNumber: 'INV-123',
        purchaseDateLabel: '1. 7. 2026',
        reasonLabel: 'Iné',
        reasonOther: 'Chcem vrátiť nevyužité kredity',
        submittedAtLabel: '9. 7. 2026, 20:15:30',
      },
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('linear-gradient(155deg,#15803d 0%,#22c55e 100%)');
    expect(html).toContain('https://jobbie.sk/jobbielogowhite.svg');
    expect(html).toContain('Potvrdenie <span style="color:#22c55e;">žiadosti</span>');
    expect(html).toContain('Ján Novák');
    expect(html).toContain('INV-123');
    expect(html).toContain('Chcem vrátiť nevyužité kredity');
    expect(html).toContain('9. 7. 2026, 20:15:30');
    expect(html).toContain('/vseobecne-podmienky');
  });

  it('formatContractWithdrawalPurchaseDate formats ISO date for sk-SK', () => {
    expect(formatContractWithdrawalPurchaseDate('2026-07-01')).toMatch(/2026/);
  });

  it('formatContractWithdrawalSubmittedAt uses Europe/Bratislava wall clock', () => {
    const formatted = formatContractWithdrawalSubmittedAt(
      new Date('2026-07-09T18:15:30.000Z'),
    );
    expect(formatted).toMatch(/2026/);
    expect(formatted).toMatch(/20:15:30/);
  });

  it('buildContractWithdrawalUserConfirmationSubject is stable', () => {
    expect(buildContractWithdrawalUserConfirmationSubject()).toBe(
      'Potvrdenie prijatia žiadosti o odstúpenie od zmluvy',
    );
  });
});
