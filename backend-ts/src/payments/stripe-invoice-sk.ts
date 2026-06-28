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
  or: 'Spoločnosť je zapísaná v Obchodnom registri Okresného súdu Žilina v oddiele Sro vložka č. 85095/L',
} as const;

/** Stripe invoice custom field — supplier tax IDs (PDF header, left column). */
export const SK_INVOICE_CF_SUPPLIER = 'Dodávateľ';

/** Stripe invoice custom field — buyer tax IDs (PDF header, right column). */
export const SK_INVOICE_CF_BUYER = 'Odberateľ';

/** Stripe invoice custom field — delivery date (= issue date on SK SaaS invoices). */
export const SK_INVOICE_CF_DELIVERY_DATE = 'Dátum dodania';

export const DEFAULT_SK_INVOICE_OR_FOOTER = DEFAULT_BILLING_SUPPLIER.or;

const MAX_INVOICE_CUSTOM_FIELDS = 4;

const STRIPE_LEGACY_CONSTANT_SYMBOL_FIELD = 'Konštantný symbol';

const STRIPE_LEGACY_BUYER_FIELD_NAMES = new Set(['IČO', 'DIČ', 'IČ DPH']);

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

/** Charge amount on a succeeded PI — `amount_received` can lag briefly after redirect. */
export function paymentIntentAmountCents(pi: {
  amount_received?: number | null;
  amount?: number | null;
  status?: string | null;
}): number {
  const received = pi.amount_received ?? 0;
  const intended = pi.amount ?? 0;
  if (received > 0) {
    return received;
  }
  return intended;
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

/** Single-line party tax IDs for Stripe custom field values (max 140 chars). */
export function formatPartyTaxIdsValue(
  ico?: string | null,
  dic?: string | null,
  vat?: string | null,
): string | null {
  const parts: string[] = [];
  const i = ico?.trim();
  if (i) {
    parts.push(`IČO: ${i}`);
  }
  const d = dic?.trim();
  if (d) {
    parts.push(`DIČ: ${d}`);
  }
  const v = vat?.trim();
  if (v) {
    parts.push(`IČ DPH: ${v}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function supplierTaxIdsFromConfig(
  config?: ConfigService,
): { ico: string | null; dic: string | null; vat: string | null } {
  if (config) {
    const supplier = getBillingInvoiceSupplier(config);
    return {
      ico: supplier.ico,
      dic: supplier.dic,
      vat: supplier.vat,
    };
  }
  return {
    ico: DEFAULT_BILLING_SUPPLIER.ico,
    dic: DEFAULT_BILLING_SUPPLIER.dic,
    vat: DEFAULT_BILLING_SUPPLIER.vat,
  };
}

/** Dodávateľ + Odberateľ + Dátum dodania custom fields (delivery date = issue date). */
export function buildInvoiceCustomFieldsSk(
  billing?: CheckoutBillingDetailsInput | null,
  config?: ConfigService,
  issueDateUnix?: number | null,
): InvoiceCreateParams['custom_fields'] {
  const fields: InvoiceCustomField[] = [];
  const supplierIds = supplierTaxIdsFromConfig(config);
  const supplierValue = formatPartyTaxIdsValue(
    supplierIds.ico,
    supplierIds.dic,
    supplierIds.vat,
  );
  if (supplierValue) {
    fields.push({ name: SK_INVOICE_CF_SUPPLIER, value: supplierValue });
  }

  if (billing?.purchaser_type === 'company') {
    const buyerValue = formatPartyTaxIdsValue(
      billing.registration_number,
      billing.tax_id,
      normalizeSkEuVatId(billing.vat_id),
    );
    if (buyerValue) {
      fields.push({ name: SK_INVOICE_CF_BUYER, value: buyerValue });
    }
  }

  return appendDeliveryDateCustomField(
    fields,
    resolveSkInvoiceIssueDateUnix(issueDateUnix),
  );
}

/** Always includes Dátum dodania (+ Dodávateľ when supplier IDs configured). */
export function resolveInvoiceCustomFieldsSk(
  billing?: CheckoutBillingDetailsInput | null,
  config?: ConfigService,
  issueDateUnix?: number | null,
): NonNullable<InvoiceCreateParams['custom_fields']> {
  return (
    buildInvoiceCustomFieldsSk(billing, config, issueDateUnix) ??
    appendDeliveryDateCustomField([], resolveSkInvoiceIssueDateUnix(issueDateUnix))
  );
}

export function resolveSkInvoiceIssueDateUnix(
  unixSeconds?: number | null,
): number {
  if (typeof unixSeconds === 'number' && unixSeconds > 0) {
    return unixSeconds;
  }
  return Math.floor(Date.now() / 1000);
}

function appendDeliveryDateCustomField(
  fields: InvoiceCustomField[],
  issueDateUnix: number,
): InvoiceCustomField[] {
  const deliveryField: InvoiceCustomField = {
    name: SK_INVOICE_CF_DELIVERY_DATE,
    value: formatSkInvoiceDateLong(issueDateUnix),
  };
  const withoutDelivery = fields.filter(
    (f) => f.name !== SK_INVOICE_CF_DELIVERY_DATE,
  );
  return [deliveryField, ...withoutDelivery].slice(0, MAX_INVOICE_CUSTOM_FIELDS);
}

function parseTaxIdFromPartyValue(
  value: string,
  label: 'IČO' | 'DIČ' | 'IČ DPH',
): string | null {
  const pattern =
    label === 'IČ DPH'
      ? /IČ\s*DPH:\s*([^\s·]+)/i
      : label === 'IČO'
        ? /IČO:\s*([^\s·]+)/i
        : /DIČ:\s*([^\s·]+)/i;
  const match = value.match(pattern);
  return match?.[1]?.trim() || null;
}

/** True when buyer tax IDs are present (new Odberateľ field or legacy IČO/DIČ/IČ DPH). */
export function buyerTaxIdsPresentInCustomFields(
  customFields: InvoiceCustomField[],
): boolean {
  const odberatel = customFields.find((f) => f.name === SK_INVOICE_CF_BUYER);
  if (odberatel?.value?.trim()) {
    return true;
  }
  return (
    customFields.some((f) => f.name === 'IČO') &&
    customFields.some((f) => f.name === 'DIČ') &&
    customFields.some((f) => f.name === 'IČ DPH')
  );
}

/** Merge profile buyer IDs into custom_fields (Odberateľ); keeps legacy fields if already complete. */
export function mergeBuyerTaxIdsIntoCustomFields(
  customFields: InvoiceCustomField[],
  profile: {
    registration_number?: string | null;
    tax_id?: string | null;
    vat_id?: string | null;
  },
): InvoiceCustomField[] {
  if (buyerTaxIdsPresentInCustomFields(customFields)) {
    return customFields;
  }

  const legacyIco = customFields.find((f) => f.name === 'IČO')?.value?.trim();
  const legacyDic = customFields.find((f) => f.name === 'DIČ')?.value?.trim();
  const legacyVat = customFields.find((f) => f.name === 'IČ DPH')?.value?.trim();
  const existingOdberatel = customFields.find(
    (f) => f.name === SK_INVOICE_CF_BUYER,
  )?.value;
  const ico =
    legacyIco ??
    (existingOdberatel
      ? parseTaxIdFromPartyValue(existingOdberatel, 'IČO')
      : null) ??
    profile.registration_number?.trim() ??
    null;
  const dic =
    legacyDic ??
    (existingOdberatel
      ? parseTaxIdFromPartyValue(existingOdberatel, 'DIČ')
      : null) ??
    profile.tax_id?.trim() ??
    null;
  const vat =
    legacyVat ??
    (existingOdberatel
      ? parseTaxIdFromPartyValue(existingOdberatel, 'IČ DPH')
      : null) ??
    normalizeSkEuVatId(profile.vat_id);

  const buyerValue = formatPartyTaxIdsValue(ico, dic, vat);
  if (!buyerValue) {
    return customFields;
  }

  const withoutBuyer = customFields.filter(
    (f) =>
      f.name !== SK_INVOICE_CF_BUYER &&
      !STRIPE_LEGACY_BUYER_FIELD_NAMES.has(f.name),
  );
  const supplierIdx = withoutBuyer.findIndex(
    (f) => f.name === SK_INVOICE_CF_SUPPLIER,
  );
  const buyerField: InvoiceCustomField = {
    name: SK_INVOICE_CF_BUYER,
    value: buyerValue,
  };
  if (supplierIdx >= 0) {
    return [
      ...withoutBuyer.slice(0, supplierIdx + 1),
      buyerField,
      ...withoutBuyer.slice(supplierIdx + 1),
    ];
  }
  return [...withoutBuyer, buyerField];
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
  return {
    pdf: { page_size: 'a4' },
    amount_tax_display: 'exclude_tax',
  };
}

/** OR (obchodný register) line for Stripe PDF footer. */
export function getSkInvoiceOrFooterText(config?: ConfigService): string {
  const or = config
    ? getBillingInvoiceSupplier(config).or?.trim()
    : DEFAULT_SK_INVOICE_OR_FOOTER;
  return or || DEFAULT_SK_INVOICE_OR_FOOTER;
}

/** Rebuild Dodávateľ/Odberateľ/Dátum dodania custom_fields from Stripe Customer metadata. */
export function buildInvoiceCustomFieldsFromCustomerMetadata(
  metadata: Record<string, string> | null | undefined,
  config?: ConfigService,
  issueDateUnix?: number | null,
): InvoiceCreateParams['custom_fields'] {
  const meta = metadata ?? {};
  const isCompany =
    meta.buyer_type === 'company' || meta.purchaser_type === 'company';
  return buildInvoiceCustomFieldsSk(
    isCompany
      ? {
          purchaser_type: 'company',
          registration_number: meta.registration_number?.trim() || null,
          tax_id: meta.tax_id?.trim() || null,
          vat_id: meta.vat_id?.trim() || null,
        }
      : { purchaser_type: 'individual' },
    config,
    issueDateUnix,
  );
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

/** Long Slovak date for Stripe PDF custom field (matches native „Dátum vystavenia“ style). */
export function formatSkInvoiceDateLong(unixSeconds: number): string {
  try {
    return new Intl.DateTimeFormat('sk-SK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(unixSeconds * 1000));
  } catch {
    return formatSkInvoiceDate(unixSeconds);
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

/** Footer for Stripe PDF — obchodný register dodávateľa only. */
export function buildSkInvoiceFooter(config?: ConfigService): string {
  return getSkInvoiceOrFooterText(config);
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
  const rawAddress = config.get<string>('BILLING_SUPPLIER_ADDRESS')?.trim() ?? '';
  // Normalize English country name to Slovak in the supplier address env var.
  const address = rawAddress
    ? rawAddress.replace(/\bSlovakia\b/gi, 'Slovenská republika')
    : '';
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
    or: or || DEFAULT_SK_INVOICE_OR_FOOTER,
    configured,
  };
}
