import type { ConfigService } from '@nestjs/config';
import {
  DEFAULT_INVOICE_CONSTANT_SYMBOL,
  buildInvoiceCustomFieldsSk,
  getInvoiceConstantSymbol,
} from './stripe-invoice-sk';

function mockConfig(overrides: Record<string, string> = {}): ConfigService {
  return {
    get: (key: string) => overrides[key],
  } as ConfigService;
}

describe('stripe-invoice-sk', () => {
  describe('getInvoiceConstantSymbol', () => {
    it('defaults to 0308', () => {
      expect(getInvoiceConstantSymbol()).toBe(DEFAULT_INVOICE_CONSTANT_SYMBOL);
      expect(getInvoiceConstantSymbol(mockConfig())).toBe('0308');
    });

    it('reads STRIPE_INVOICE_CONSTANT_SYMBOL from config', () => {
      expect(
        getInvoiceConstantSymbol(
          mockConfig({ STRIPE_INVOICE_CONSTANT_SYMBOL: '1234' }),
        ),
      ).toBe('1234');
    });
  });

  describe('buildInvoiceCustomFieldsSk', () => {
    it('returns only konštantný symbol when billing is missing', () => {
      const fields = buildInvoiceCustomFieldsSk(undefined);
      expect(fields).toEqual([
        { name: 'Konštantný symbol', value: '0308' },
      ]);
    });

    it('includes odberateľ and konštantný for individuals', () => {
      const fields = buildInvoiceCustomFieldsSk({
        purchaser_type: 'individual',
      });
      expect(fields).toEqual([
        { name: 'Odberateľ', value: 'Fyzická osoba' },
        { name: 'Konštantný symbol', value: '0308' },
      ]);
    });

    it('includes company tax ids and konštantný symbol', () => {
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
        { name: 'Konštantný symbol', value: '0308' },
      ]);
      expect(fields).toHaveLength(4);
    });

    it('caps custom fields at four for company with all ids', () => {
      const fields = buildInvoiceCustomFieldsSk({
        purchaser_type: 'company',
        registration_number: '1',
        tax_id: '2',
        vat_id: 'SK1234567890',
      });
      expect(fields).toHaveLength(4);
      expect(fields?.[3]).toEqual({
        name: 'Konštantný symbol',
        value: '0308',
      });
    });

    it('returns konštantný only when company has no tax ids', () => {
      const fields = buildInvoiceCustomFieldsSk({
        purchaser_type: 'company',
      });
      expect(fields).toEqual([
        { name: 'Konštantný symbol', value: '0308' },
      ]);
    });
  });
});
