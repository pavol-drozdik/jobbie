import {
  buildContractWithdrawalUserConfirmationHtml,
  buildContractWithdrawalUserConfirmationSubject,
  formatContractWithdrawalPurchaseDate,
  formatContractWithdrawalSubmittedAt,
} from './contract-withdrawal-email.template';
import { EMAIL_BRAND } from './transactional-email.template';

describe('contract-withdrawal-email.template', () => {
  it('buildContractWithdrawalUserConfirmationHtml renders branded layout with form summary', () => {
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
    expect(html).toContain(EMAIL_BRAND.green);
    expect(html).toContain('Ján Novák');
    expect(html).toContain('INV-123');
    expect(html).toContain('Chcem vrátiť nevyužité kredity');
    expect(html).toContain('9. 7. 2026, 20:15:30');
    expect(html).toContain('/vseobecne-podmienky');
  });

  it('formatContractWithdrawalPurchaseDate formats ISO date for sk-SK', () => {
    expect(formatContractWithdrawalPurchaseDate('2026-07-01')).toMatch(/2026/);
  });

  it('formatContractWithdrawalSubmittedAt includes time', () => {
    const formatted = formatContractWithdrawalSubmittedAt(
      new Date('2026-07-09T18:15:30.000Z'),
    );
    expect(formatted).toMatch(/2026/);
  });

  it('buildContractWithdrawalUserConfirmationSubject is stable', () => {
    expect(buildContractWithdrawalUserConfirmationSubject()).toBe(
      'Potvrdenie prijatia žiadosti o odstúpenie od zmluvy',
    );
  });
});
