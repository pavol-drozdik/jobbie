import type { ConfigService } from '@nestjs/config';
import {
  SK_INVOICE_CREDIT_NOTE,
  SK_INVOICE_SUBSCRIPTION_NOTE,
  buildInvoiceCustomFieldsSk,
  buildSkCreditInvoiceLineDescription,
  buildSkCreditInvoiceLineItem,
  buildSkInvoiceFooter,
  filterStripeInvoiceCustomFields,
  isStripeAutomaticTaxEnabled,
  resolveInvoiceCustomFieldsSk,
} from './stripe-invoice-sk';

function mockConfig(overrides: Record<string, string> = {}): ConfigService {
  return {
    get: (key: string) => overrides[key],
  } as ConfigService;
}

describe('stripe-invoice-sk', () => {
  describe('filterStripeInvoiceCustomFields', () => {
    it('removes legacy konštantný symbol', () => {
      expect(
        filterStripeInvoiceCustomFields([
          { name: 'IČO', value: '123' },
          { name: 'Konštantný symbol', value: '0308' },
        ]),
      ).toEqual([{ name: 'IČO', value: '123' }]);
    });
  });

  describe('resolveInvoiceCustomFieldsSk', () => {
    it('returns empty array for individuals (clears customer defaults)', () => {
      expect(resolveInvoiceCustomFieldsSk({ purchaser_type: 'individual' })).toEqual(
        [],
      );
    });
  });

  describe('buildInvoiceCustomFieldsSk', () => {
    it('returns undefined when billing is missing', () => {
      expect(buildInvoiceCustomFieldsSk(undefined)).toBeUndefined();
    });

    it('returns undefined for individuals', () => {
      expect(
        buildInvoiceCustomFieldsSk({ purchaser_type: 'individual' }),
      ).toBeUndefined();
    });

    it('includes company tax ids without konštantný symbol', () => {
      const fields = buildInvoiceCustomFieldsSk({
        purchaser_type: 'company',
        registration_number: '56273975',
        tax_id: '2122259634',
        vat_id: 'SK2122259634',
      });
      expect(fields).toEqual([
        { name: 'IČO', value: '56273975' },
        { name: 'DIČ', value: '2122259634' },
        { name: 'IČ DPH', value: 'SK2122259634' },
      ]);
    });
  });

  describe('buildSkInvoiceFooter', () => {
    it('includes credit poznámka only (no default legal text)', () => {
      const footer = buildSkInvoiceFooter('credits');
      expect(footer).toContain(`Poznámka: ${SK_INVOICE_CREDIT_NOTE}`);
      expect(footer).not.toContain('platiteľom DPH');
      expect(footer).not.toContain('bez DPH');
    });

    it('appends STRIPE_INVOICE_FOOTER when configured', () => {
      const footer = buildSkInvoiceFooter(
        'credits',
        mockConfig({ STRIPE_INVOICE_FOOTER: 'Custom footer line.' }),
      );
      expect(footer).toContain('Custom footer line.');
    });

    it('includes subscription period when provided', () => {
      const footer = buildSkInvoiceFooter('subscription', undefined, {
        start: 1_700_000_000,
        end: 1_702_592_000,
      });
      expect(footer).toContain(SK_INVOICE_SUBSCRIPTION_NOTE);
      expect(footer).toContain('Obdobie predplatného:');
    });
  });

  describe('buildSkCreditInvoiceLineItem', () => {
    it('uses bundle pricing (qty 1, pack price)', () => {
      expect(buildSkCreditInvoiceLineItem(2000, 30)).toEqual({
        quantity: 1,
        unit_amount_decimal: '2000',
        description:
          'Kredity na využívanie online platformy (30 kreditov)',
      });
    });

    it('returns null for invalid input', () => {
      expect(buildSkCreditInvoiceLineItem(0, 5)).toBeNull();
      expect(buildSkCreditInvoiceLineItem(500, 0)).toBeNull();
    });
  });

  describe('buildSkCreditInvoiceLineDescription', () => {
    it('uses singular for one credit', () => {
      expect(buildSkCreditInvoiceLineDescription(1)).toContain('1 kredit');
    });
  });

  describe('isStripeAutomaticTaxEnabled', () => {
    it('is off by default', () => {
      expect(isStripeAutomaticTaxEnabled(mockConfig())).toBe(false);
    });

    it('enables only when explicitly configured', () => {
      expect(
        isStripeAutomaticTaxEnabled(
          mockConfig({ STRIPE_INVOICE_AUTOMATIC_TAX: 'true' }),
        ),
      ).toBe(true);
    });
  });
});
