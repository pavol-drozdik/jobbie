import type { ConfigService } from '@nestjs/config';
import type { InvoiceCreateParams } from './stripe-types';

export type CheckoutBillingDetailsInput = {
  purchaser_type: 'individual' | 'company';
  company_name?: string | null;
  registration_number?: string | null;
  /** DIČ (nie IČ DPH) — zobrazí sa na faktúre, nie ako eu_vat. */
  tax_id?: string | null;
  /** IČ DPH (SK + 10 číslic) — na faktúre cez custom_fields (nie Stripe eu_vat). */
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

export const SK_INVOICE_PAYMENT_METHOD_LABEL = 'Kartou / online platba';

/** Line item base text — Predaj kreditov (firma / FO). */
export const SK_INVOICE_CREDIT_LINE_DESCRIPTION =
  'Kredity na využívanie online platformy';

/** Line item text — Mesačné predplatné (firma / FO). */
export const SK_INVOICE_SUBSCRIPTION_LINE_DESCRIPTION =
  'Mesačné predplatné online platformy';

export const SK_INVOICE_CREDIT_UNIT = 'balík';

export const SK_INVOICE_SUBSCRIPTION_UNIT = 'mesiac';

export const SK_INVOICE_CREDIT_NOTE =
  'Poskytnutie virtuálnych kreditov na využívanie funkcií a služieb online platformy podľa obchodných podmienok.';

export const SK_INVOICE_SUBSCRIPTION_NOTE =
  'Poskytnutie prístupu k funkciám a službám online platformy počas predplateného obdobia.';

export const DEFAULT_BILLING_SUPPLIER = {
  name: 'CoCreate s. r. o.',
  ico: '56273975',
  dic: '2122295694',
  vat: 'SK2122259634',
  or: 'Zapísaná v OR OS Žilina, oddiel Sro, vložka č. 85095/L',
} as const;

const MAX_INVOICE_CUSTOM_FIELDS = 4;

const STRIPE_LEGACY_CONSTANT_SYMBOL_FIELD = 'Konštantný symbol';

export type SkInvoiceProductType = 'credits' | 'subscription';

export type InvoiceCustomField = { name: string; value: string };

export type SkCreditInvoiceLineItem = {
  quantity: 1;
  unit_amount_decimal: string;
  description: string;
};

export function buildSkCreditInvoiceLineDescription(creditsAmount: number): string {
  const count = Math.floor(creditsAmount);
  if (count < 1) {
    return SK_INVOICE_CREDIT_LINE_DESCRIPTION;
  }
  const label = count === 1 ? '1 kredit' : `${count} kreditov`;
  return `${SK_INVOICE_CREDIT_LINE_DESCRIPTION} (${label})`;
}

/** Credit packs are sold as one bundle (qty 1 = pack price), not per-credit unit price. */
export function buildSkCreditInvoiceLineItem(
  totalCents: number,
  creditsAmount: number,
): SkCreditInvoiceLineItem | null {
  if (totalCents < 1 || creditsAmount < 1) {
    return null;
  }
  return {
    quantity: 1,
    unit_amount_decimal: String(totalCents),
    description: buildSkCreditInvoiceLineDescription(creditsAmount),
  };
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

/** Strip legacy konštantný symbol from Stripe/customer defaults. */
export function filterStripeInvoiceCustomFields(
  customFields: Array<{ name: string; value: string }> | null | undefined,
): InvoiceCustomField[] {
  return (customFields ?? []).filter(
    (f) =>
      Boolean(f.name?.trim() && f.value?.trim()) &&
      f.name.trim() !== STRIPE_LEGACY_CONSTANT_SYMBOL_FIELD,
  );
}

/** Up to 4 Stripe invoice custom fields (SK buyer IČO / DIČ / IČ DPH). */
export function buildInvoiceCustomFieldsSk(
  billing?: CheckoutBillingDetailsInput | null,
): InvoiceCreateParams['custom_fields'] {
  if (!billing || billing.purchaser_type === 'individual') {
    return undefined;
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

  if (buyerFields.length === 0) {
    return undefined;
  }
  return buyerFields.slice(0, MAX_INVOICE_CUSTOM_FIELDS);
}

/** Explicit [] clears Stripe Customer invoice_settings defaults (e.g. legacy konštantný symbol). */
export function resolveInvoiceCustomFieldsSk(
  billing?: CheckoutBillingDetailsInput | null,
): NonNullable<InvoiceCreateParams['custom_fields']> {
  return buildInvoiceCustomFieldsSk(billing) ?? [];
}

/** Card-only checkout — matches Payment Element `paymentMethodTypes: ['card']` (no bank transfer). */
export function buildSkCardPaymentIntentTypes(): ['card'] {
  return ['card'];
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

/** Off by default — enable only when explicitly configured (platiteľ DPH). */
export function isStripeAutomaticTaxEnabled(config: ConfigService): boolean {
  const raw = config.get<string>('STRIPE_INVOICE_AUTOMATIC_TAX')?.trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export function formatSkInvoiceDate(unixSeconds: number): string {
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(unixSeconds * 1000));
  } catch {
    return String(unixSeconds);
  }
}

export function formatSkSubscriptionPeriod(
  periodStart: number,
  periodEnd: number,
): string {
  return `${formatSkInvoiceDate(periodStart)} – ${formatSkInvoiceDate(periodEnd)}`;
}

export function getSkInvoiceNote(type: SkInvoiceProductType): string {
  return type === 'credits'
    ? SK_INVOICE_CREDIT_NOTE
    : SK_INVOICE_SUBSCRIPTION_NOTE;
}

export function getSkInvoiceLineUnit(type: SkInvoiceProductType): string {
  return type === 'credits'
    ? SK_INVOICE_CREDIT_UNIT
    : SK_INVOICE_SUBSCRIPTION_UNIT;
}

/** Footer for Stripe PDF: poznámka (+ obdobie predplatného). No default legal boilerplate. */
export function buildSkInvoiceFooter(
  type: SkInvoiceProductType,
  config?: ConfigService,
  subscriptionPeriod?: { start: number; end: number } | null,
): string {
  const parts: string[] = [`Poznámka: ${getSkInvoiceNote(type)}`];
  if (type === 'subscription' && subscriptionPeriod) {
    parts.push(
      `Obdobie predplatného: ${formatSkSubscriptionPeriod(
        subscriptionPeriod.start,
        subscriptionPeriod.end,
      )}`,
    );
  }
  const custom = config?.get<string>('STRIPE_INVOICE_FOOTER')?.trim();
  if (custom) {
    parts.push(custom);
  }
  return parts.join('\n\n');
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
  or: string | null;
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
  const or = config.get<string>('BILLING_SUPPLIER_OR')?.trim() ?? '';
  const configured = Boolean(name || address || ico || dic || vat || or);
  return {
    name: name || DEFAULT_BILLING_SUPPLIER.name,
    address: address || null,
    ico: ico || DEFAULT_BILLING_SUPPLIER.ico,
    dic: dic || DEFAULT_BILLING_SUPPLIER.dic,
    vat: vat || DEFAULT_BILLING_SUPPLIER.vat,
    or: or || DEFAULT_BILLING_SUPPLIER.or,
    configured,
  };
}
