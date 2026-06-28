import type { ConfigService } from '@nestjs/config';
import {
  DEFAULT_SK_INVOICE_OR_FOOTER,
  SK_INVOICE_CF_BUYER,
  SK_INVOICE_CF_DELIVERY_DATE,
  SK_INVOICE_CF_SUPPLIER,
  buildInvoiceCustomFieldsFromCustomerMetadata,
  buildInvoiceCustomFieldsSk,
  buildSkCreditInvoiceLineDescription,
  buildSkCreditInvoiceLineItem,
  paymentIntentAmountCents,
  buildSkInvoiceFooter,
  buildSkInvoiceRendering,
  filterStripeInvoiceCustomFields,
  formatPartyTaxIdsValue,
  formatSkInvoiceDateLong,
  isStripeAutomaticTaxEnabled,
  mergeBuyerTaxIdsIntoCustomFields,
  resolveInvoiceCustomFieldsSk,
  type InvoiceCustomField,
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

  describe('formatPartyTaxIdsValue', () => {
    it('joins non-empty ids with middle dot', () => {
      expect(
        formatPartyTaxIdsValue('56273975', '2122259634', 'SK2122259634'),
      ).toBe('IČO: 56273975 · DIČ: 2122259634 · IČ DPH: SK2122259634');
    });
  });

  describe('formatSkInvoiceDateLong', () => {
    it('uses long Slovak month name', () => {
      const formatted = formatSkInvoiceDateLong(1_751_097_600);
      expect(formatted).toMatch(/2025/);
      expect(formatted).not.toMatch(/\d{2}\.\s*\d{2}\./);
    });
  });

  describe('resolveInvoiceCustomFieldsSk', () => {
    it('includes Dátum dodania and Dodávateľ for individuals', () => {
      const fields = resolveInvoiceCustomFieldsSk(
        { purchaser_type: 'individual' },
        undefined,
        1_751_097_600,
      ) as InvoiceCustomField[];
      expect(fields).toHaveLength(2);
      expect(fields[0]?.name).toBe(SK_INVOICE_CF_DELIVERY_DATE);
      expect(fields[0]?.value).toBe(formatSkInvoiceDateLong(1_751_097_600));
      expect(fields[1]?.name).toBe(SK_INVOICE_CF_SUPPLIER);
    });
  });

  describe('buildInvoiceCustomFieldsSk', () => {
    it('returns Dátum dodania and Dodávateľ when billing is missing', () => {
      const fields = buildInvoiceCustomFieldsSk(
        undefined,
        undefined,
        1_751_097_600,
      ) as InvoiceCustomField[];
      expect(fields).toHaveLength(2);
      expect(fields[0]?.name).toBe(SK_INVOICE_CF_DELIVERY_DATE);
      expect(fields[1]?.name).toBe(SK_INVOICE_CF_SUPPLIER);
    });

    it('returns Dátum dodania and Dodávateľ for individuals', () => {
      const fields = buildInvoiceCustomFieldsSk(
        { purchaser_type: 'individual' },
        undefined,
        1_751_097_600,
      ) as InvoiceCustomField[];
      expect(fields).toHaveLength(2);
      expect(fields[0]?.name).toBe(SK_INVOICE_CF_DELIVERY_DATE);
      expect(fields[1]?.name).toBe(SK_INVOICE_CF_SUPPLIER);
    });

    it('includes Dátum dodania, Dodávateľ and Odberateľ for company checkout', () => {
      const fields = buildInvoiceCustomFieldsSk(
        {
          purchaser_type: 'company',
          registration_number: '56273975',
          tax_id: '2122259634',
          vat_id: 'SK2122259634',
        },
        undefined,
        1_751_097_600,
      );
      expect(fields).toEqual([
        {
          name: SK_INVOICE_CF_DELIVERY_DATE,
          value: formatSkInvoiceDateLong(1_751_097_600),
        },
        {
          name: SK_INVOICE_CF_SUPPLIER,
          value: 'IČO: 56273975 · DIČ: 2122295694 · IČ DPH: SK2122259634',
        },
        {
          name: SK_INVOICE_CF_BUYER,
          value: 'IČO: 56273975 · DIČ: 2122259634 · IČ DPH: SK2122259634',
        },
      ]);
    });
  });

  describe('buildSkInvoiceFooter', () => {
    it('returns only the OR footer line by default', () => {
      const footer = buildSkInvoiceFooter();
      expect(footer).toBe(DEFAULT_SK_INVOICE_OR_FOOTER);
      expect(footer).toContain('Obchodnom registri');
      expect(footer).not.toContain('Poznámka:');
      expect(footer).not.toContain('Dodanie je oslobodené od dane');
    });

    it('uses BILLING_SUPPLIER_OR when configured', () => {
      const footer = buildSkInvoiceFooter(
        mockConfig({ BILLING_SUPPLIER_OR: 'Custom OR line.' }),
      );
      expect(footer).toBe('Custom OR line.');
    });
  });

  describe('buildSkInvoiceRendering', () => {
    it('uses A4 and exclude_tax for § 74 amounts without VAT', () => {
      expect(buildSkInvoiceRendering()).toEqual({
        pdf: { page_size: 'a4' },
        amount_tax_display: 'exclude_tax',
      });
    });
  });

  describe('buildInvoiceCustomFieldsFromCustomerMetadata', () => {
    it('rebuilds company buyer fields from customer metadata', () => {
      const fields = buildInvoiceCustomFieldsFromCustomerMetadata(
        {
          buyer_type: 'company',
          registration_number: '12345678',
          tax_id: '2123456789',
          vat_id: 'SK1234567890',
        },
        undefined,
        1_751_097_600,
      ) as InvoiceCustomField[];
      expect(fields).toHaveLength(3);
      expect(fields[0]?.name).toBe(SK_INVOICE_CF_DELIVERY_DATE);
      expect(fields[1]?.name).toBe(SK_INVOICE_CF_SUPPLIER);
      expect(fields[2]?.name).toBe(SK_INVOICE_CF_BUYER);
      expect(fields[2]?.value).toContain('12345678');
    });

    it('returns Dátum dodania and Dodávateľ for individual metadata', () => {
      const fields = buildInvoiceCustomFieldsFromCustomerMetadata(
        {
          buyer_type: 'individual',
        },
        undefined,
        1_751_097_600,
      ) as InvoiceCustomField[];
      expect(fields).toHaveLength(2);
      expect(fields[0]?.name).toBe(SK_INVOICE_CF_DELIVERY_DATE);
      expect(fields[1]?.name).toBe(SK_INVOICE_CF_SUPPLIER);
    });
  });

  describe('mergeBuyerTaxIdsIntoCustomFields', () => {
    it('adds Odberateľ from profile when legacy fields are missing', () => {
      const merged = mergeBuyerTaxIdsIntoCustomFields(
        [{ name: SK_INVOICE_CF_SUPPLIER, value: 'IČO: 1' }],
        {
          registration_number: '12345678',
          tax_id: '2123456789',
          vat_id: 'SK1234567890',
        },
      );
      expect(merged.some((f) => f.name === SK_INVOICE_CF_BUYER)).toBe(true);
      expect(merged.find((f) => f.name === SK_INVOICE_CF_BUYER)?.value).toContain(
        '12345678',
      );
    });

    it('leaves custom fields unchanged when Odberateľ already present', () => {
      const existing = [
        { name: SK_INVOICE_CF_SUPPLIER, value: 'IČO: 1' },
        { name: SK_INVOICE_CF_BUYER, value: 'IČO: 99' },
      ];
      expect(
        mergeBuyerTaxIdsIntoCustomFields(existing, {
          registration_number: '12345678',
        }),
      ).toEqual(existing);
    });
  });

  describe('paymentIntentAmountCents', () => {
    it('prefers amount when amount_received is zero on succeeded PI', () => {
      expect(
        paymentIntentAmountCents({
          status: 'succeeded',
          amount_received: 0,
          amount: 2500,
        }),
      ).toBe(2500);
    });

    it('uses amount_received when present', () => {
      expect(
        paymentIntentAmountCents({
          status: 'succeeded',
          amount_received: 1999,
          amount: 2500,
        }),
      ).toBe(1999);
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
