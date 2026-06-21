import type { ConfigService } from '@nestjs/config';
import type { InvoiceCreateParams } from './stripe-types';

export type CheckoutBillingDetailsInput = {
  purchaser_type: 'individual' | 'company';
  company_name?: string | null;
  registration_number?: string | null;
  /** DIČ (nie IČ DPH) — zobrazí sa na faktúre, nie ako eu_vat. */
  tax_id?: string | null;
  /** IČ DPH (SK + 10 číslic) — Stripe eu_vat na zákazníkovi. */
  vat_id?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  address_city?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  /** Required true for individual checkout (SK billing attestation). */
  billing_attestation_sk_residence?: boolean | null;
};

/** Stripe Customer.address from checkout billing or profile text. */
export type StripeCustomerAddressInput = {
  line1: string;
  line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country: string;
};

export const DEFAULT_INVOICE_CONSTANT_SYMBOL = '0308';

export const SK_INVOICE_PAYMENT_METHOD_LABEL = 'Kartou / online platba';

const MAX_INVOICE_CUSTOM_FIELDS = 4;

const LATE_PAYMENT_FOOTER_SK =
  'Dovoľujeme si Vás upozorniť, že v prípade nedodržania dátumu splatnosti uvedeného na faktúre Vám môžeme účtovať zákonný úrok z omeškania.';

const DEFAULT_INVOICE_FOOTER_SK = [
  'Faktúra vyhotovená v súlade so zákonom č. 222/2004 Z. z. o dani z pridanej hodnoty.',
  'Dodávateľ je platiteľom DPH (údaje dodávateľa sú uvedené v hlavičke faktúry).',
  LATE_PAYMENT_FOOTER_SK,
].join(' ');

export type InvoiceCustomField = { name: string; value: string };

export function getInvoiceConstantSymbol(config?: ConfigService): string {
  const raw = config?.get<string>('STRIPE_INVOICE_CONSTANT_SYMBOL')?.trim();
  return raw || DEFAULT_INVOICE_CONSTANT_SYMBOL;
}

export function normalizeSkEuVatId(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) {
    return null;
  }
  const compact = t.replace(/\s+/g, '').toUpperCase();
  if (/^SK\d{10}$/.test(compact)) {
    return compact;
  }
  if (/^\d{10}$/.test(compact)) {
    return `SK${compact}`;
  }
  return compact;
}

/** Single-line billing address from profile settings → Stripe address (min. line1 + country). */
export function addressFromProfileText(
  text: string | null | undefined,
  country = 'SK',
): StripeCustomerAddressInput | null {
  const line1 = text?.trim();
  if (!line1) {
    return null;
  }
  return { line1, country: country.toUpperCase() };
}

export function resolveCustomerAddress(
  billing?: CheckoutBillingDetailsInput | null,
  profileFallback?: {
    registered_office?: string | null;
    billing_address?: string | null;
  } | null,
): StripeCustomerAddressInput | null {
  const line1 = billing?.address_line1?.trim();
  if (line1) {
    return {
      line1,
      line2: billing?.address_line2?.trim() || undefined,
      city: billing?.address_city?.trim() || undefined,
      postal_code: billing?.address_postal_code?.trim() || undefined,
      country: (billing?.address_country?.trim() || 'SK').toUpperCase(),
    };
  }
  return (
    addressFromProfileText(profileFallback?.registered_office) ??
    addressFromProfileText(profileFallback?.billing_address)
  );
}

/** Up to 4 Stripe invoice custom fields (SK buyer IDs + konštantný symbol). */
export function buildInvoiceCustomFieldsSk(
  billing?: CheckoutBillingDetailsInput | null,
  config?: ConfigService,
): InvoiceCreateParams['custom_fields'] {
  const constantField: InvoiceCustomField = {
    name: 'Konštantný symbol',
    value: getInvoiceConstantSymbol(config),
  };

  if (!billing) {
    return [constantField];
  }

  if (billing.purchaser_type === 'individual') {
    return [
      { name: 'Odberateľ', value: 'Fyzická osoba' },
      constantField,
    ];
  }

  const buyerFields: InvoiceCustomField[] = [];
  const ico = billing.registration_number?.trim();
  if (ico) {
    buyerFields.push({ name: 'IČO', value: ico });
  }
  const dic = billing.tax_id?.trim();
  if (dic) {
    buyerFields.push({ name: 'DIČ', value: dic });
  }
  const vat = normalizeSkEuVatId(billing.vat_id);
  if (vat) {
    buyerFields.push({ name: 'IČ DPH', value: vat });
  }

  const cappedBuyer = buyerFields.slice(0, MAX_INVOICE_CUSTOM_FIELDS - 1);
  return [...cappedBuyer, constantField];
}

/** Card-only invoice payment — no bank transfer / Pay by Square on PDF. */
export function buildSkInvoicePaymentSettings(): NonNullable<
  InvoiceCreateParams['payment_settings']
> {
  return { payment_method_types: ['card'] };
}

export function buildSkInvoiceRendering(): NonNullable<InvoiceCreateParams['rendering']> {
  return { pdf: { page_size: 'a4' } };
}

export function isStripeAutomaticTaxEnabled(config: ConfigService): boolean {
  const raw = config.get<string>('STRIPE_INVOICE_AUTOMATIC_TAX')?.trim().toLowerCase();
  return raw !== 'false' && raw !== '0' && raw !== 'no';
}

export function getStripeInvoiceFooter(config: ConfigService): string {
  const custom = config.get<string>('STRIPE_INVOICE_FOOTER')?.trim();
  return custom || DEFAULT_INVOICE_FOOTER_SK;
}

export function getStripeAccountTaxIds(
  config: ConfigService,
): string[] | undefined {
  const raw = config.get<string>('STRIPE_ACCOUNT_TAX_IDS')?.trim();
  if (!raw) {
    return undefined;
  }
  const ids = raw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.startsWith('txi_'));
  return ids.length > 0 ? ids : undefined;
}

export type BillingInvoiceSupplierDto = {
  name: string;
  address: string | null;
  ico: string | null;
  dic: string | null;
  vat: string | null;
  configured: boolean;
};

/** Seller block for in-app invoice UI (mirror Stripe Dashboard business details). */
export function getBillingInvoiceSupplier(
  config: ConfigService,
): BillingInvoiceSupplierDto {
  const name = config.get<string>('BILLING_SUPPLIER_NAME')?.trim() ?? '';
  const address = config.get<string>('BILLING_SUPPLIER_ADDRESS')?.trim() ?? '';
  const ico = config.get<string>('BILLING_SUPPLIER_ICO')?.trim() ?? '';
  const dic = config.get<string>('BILLING_SUPPLIER_DIC')?.trim() ?? '';
  const vat = config.get<string>('BILLING_SUPPLIER_VAT')?.trim() ?? '';
  const configured = Boolean(name || address || ico || dic || vat);
  return {
    name: name || 'JOBBIE',
    address: address || null,
    ico: ico || null,
    dic: dic || null,
    vat: vat || null,
    configured,
  };
}
