import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import StripeSdk from 'stripe';
import { AuditService } from '../audit/audit.service';
import {
  expandableRefId,
  getInvoicePaymentIntentClientSecret,
  getInvoicePaymentIntentId,
  getInvoicePaymentIntentRef,
  getInvoiceSubscriptionId,
  getInvoiceSubscriptionRef,
  getInvoiceTaxAmount,
  getSetupIntentClientSecretFromRef,
  getSetupIntentId,
  getSubscriptionCurrentPeriodEndIso,
} from './stripe-api-compat';
import {
  STRIPE_API_VERSION,
  type Address,
  type Charge,
  type CheckoutSessionCreateParams,
  type CustomerUpdateParams,
  type Event,
  type Invoice,
  type InvoiceCreateParams,
  type InvoiceItemCreateParams,
  type InvoiceLineItem,
  type PaymentIntent,
  type PaymentIntentUpdateParams,
  type PaymentMethod,
  type StripeClient,
  type StripeError,
  type Subscription,
  type SubscriptionCreateParams,
} from './stripe-types';
import { CreditsService } from '../billing/credits.service';
import { isPublicSubscriptionPlanSlug } from '../billing/public-pricing-catalog';
import { SubscriptionTrialService } from '../billing/subscription-trial.service';
import { SkRpoLookupService } from '../registry/sk-rpo-lookup.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  assertPurchaserTypeMatchesAccountRole,
  assertSkBillingEligible,
} from './sk-billing-eligibility';
import { CreditPackDto } from './payments.dto';
import {
  isStripeTestMode,
  resolveCreditPackStripePriceId,
} from './stripe-catalog-prices';
import {
  buildInvoiceCustomFieldsSk,
  buildSkInvoiceFooter,
  buildSkInvoicePaymentSettings,
  buildSkInvoiceRendering,
  buildSkCardPaymentIntentTypes,
  buildSkCreditInvoiceLineItem,
  type CheckoutBillingDetailsInput,
  filterStripeInvoiceCustomFields,
  resolveInvoiceCustomFieldsSk,
  getSkInvoiceLineUnit,
  getSkInvoiceNote,
  getStripeAccountTaxIds,
  getBillingInvoiceSupplier,
  isStripeAutomaticTaxEnabled,
  normalizeSkEuVatId,
  resolveCustomerAddress,
  SK_INVOICE_CREDIT_LINE_DESCRIPTION,
  SK_INVOICE_PAYMENT_METHOD_LABEL,
  SK_INVOICE_SUBSCRIPTION_LINE_DESCRIPTION,
  type BillingInvoiceSupplierDto,
  type SkInvoiceProductType,
  type StripeCustomerAddressInput,
} from './stripe-invoice-sk';

export type { CheckoutBillingDetailsInput } from './stripe-invoice-sk';

export type SubscriptionCancelFeedbackInput = {
  reason_code: string;
  reason_detail?: string | null;
};

export type PaymentMethodSummaryDto = {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
};

export type InvoiceDetailLineDto = {
  description: string;
  quantity: number | null;
  unit: string | null;
  amount: number;
  currency: string;
};

export type InvoiceDetailDto = {
  id: string;
  number: string | null;
  status: string | null;
  created: number;
  due_date: number | null;
  issued_at: number;
  delivery_at: number;
  variable_symbol: string | null;
  constant_symbol: string | null;
  payment_method_label: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  amount_due: number;
  amount_paid: number;
  product_type: SkInvoiceProductType;
  note: string;
  subscription_period: { start: number; end: number } | null;
  lines: InvoiceDetailLineDto[];
  customer: {
    name: string | null;
    email: string | null;
    address: string | null;
    custom_fields: Array<{ name: string; value: string }>;
  };
  supplier: BillingInvoiceSupplierDto;
  footer: string;
  invoice_pdf: string | null;
  can_pay: boolean;
  payment_intent_client_secret: string | null;
};

const STRIPE_CUSTOMER_REQUIRED_MSG =
  'Platobné údaje nie sú dostupné. Najprv dokončite platbu (kredity alebo predplatné).';

// SECURITY: Never trust client credit amounts — validate PI against credit_packs before grant_credits.
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  private stripe: StripeClient | null = null;

  constructor(
    private config: ConfigService,
    private supabaseService: SupabaseService,
    private audit: AuditService,
    private credits: CreditsService,
    private subscriptionTrial: SubscriptionTrialService,
    private skRpoLookup: SkRpoLookupService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      // SECURITY: pin apiVersion explicitly so SDK upgrades cannot silently
      // change response shapes / behaviour for webhooks and fulfillment.
      // When upgrading the `stripe` SDK major version, update this string
      // and re-run the full Stripe regression suite (see
      // docs/deps-upgrade-plan.md). Do NOT remove the pin.
      this.stripe = new StripeSdk(key, {
        apiVersion: STRIPE_API_VERSION,
        timeout: 30_000,
        maxNetworkRetries: 2,
      });
    }
  }

  private getStripe(): StripeClient {
    if (!this.stripe) {
      throw new ServiceUnavailableException('Stripe not configured');
    }
    return this.stripe;
  }

  /** For billing account trial eligibility (Stripe customer subscription history). */
  getStripeClientForTrialChecks(): StripeClient {
    return this.getStripe();
  }

  async retrieveSubscription(
    subscriptionId: string,
  ): Promise<Subscription | null> {
    try {
      return await this.getStripe().subscriptions.retrieve(subscriptionId);
    } catch (err) {
      if (this.isStripeSubscriptionMissing(err)) {
        this.logger.warn(
          `Stripe subscription ${subscriptionId} not found (stale id)`,
        );
        return null;
      }
      throw err;
    }
  }

  /**
   * Hosted Checkout branding aligned with JOBBIE web (see app-pwa/assets/css/main.css).
   * Passed with a cast: Stripe Node types (v14) predate `branding_settings` on SessionCreateParams.
   */
  private getCheckoutBrandingSettings(): Record<string, unknown> {
    return {
      display_name: 'JOBBIE',
      background_color: '#F6FAF8',
      button_color: '#2ea85c',
      border_style: 'rounded',
    };
  }

  getDefaultCreditsPriceId(): string | null {
    return this.config.get<string>('STRIPE_PRICE_ID_CREDITS') ?? null;
  }

  private async loadProfileBillingContext(userId: string): Promise<{
    role: string | null;
    registered_office: string | null;
    billing_address: string | null;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
  }> {
    const { data } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select(
        'role, registered_office, billing_details, display_name, first_name, last_name',
      )
      .eq('id', userId)
      .maybeSingle();
    const row = data as {
      role?: string | null;
      registered_office?: string | null;
      billing_details?: { address?: string } | null;
      display_name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    } | null;
    const bd = row?.billing_details;
    const billingAddress =
      bd && typeof bd === 'object' && typeof bd.address === 'string'
        ? bd.address
        : null;
    return {
      role: row?.role?.trim() || null,
      registered_office: row?.registered_office?.trim() || null,
      billing_address: billingAddress?.trim() || null,
      display_name: row?.display_name?.trim() || null,
      first_name: row?.first_name?.trim() || null,
      last_name: row?.last_name?.trim() || null,
    };
  }

  private mergeBillingWithProfile(
    userId: string,
    billing: CheckoutBillingDetailsInput | null | undefined,
    profileCtx: Awaited<ReturnType<StripeService['loadProfileBillingContext']>>,
  ): CheckoutBillingDetailsInput {
    if (billing) {
      return billing;
    }
    const personName =
      [profileCtx.first_name, profileCtx.last_name].filter(Boolean).join(' ').trim() ||
      profileCtx.display_name ||
      undefined;
    const purchaserType =
      profileCtx.role === 'company' ? 'company' : 'individual';
    return {
      purchaser_type: purchaserType,
      company_name: personName || null,
    };
  }

  private assertCustomerAddressForSkInvoice(
    address: StripeCustomerAddressInput | null,
    purchaserType: 'individual' | 'company',
  ): void {
    if (address?.line1?.trim() && address.country?.trim()) {
      return;
    }
    if (purchaserType === 'company') {
      throw new BadRequestException(
        'Pre faktúru firmy vyplňte fakturačnú adresu (ulica, mesto, PSČ).',
      );
    }
    throw new BadRequestException(
      'Pre faktúru vyplňte fakturačnú adresu (ulica, mesto, PSČ) vo formulári platby.',
    );
  }

  private buildSkInvoiceCreateParams(
    customerId: string,
    billing: CheckoutBillingDetailsInput | null | undefined,
    metadata: Record<string, string>,
    description: string,
    productType: SkInvoiceProductType,
    subscriptionPeriod?: { start: number; end: number } | null,
    options?: { omitPaymentSettings?: boolean },
  ): InvoiceCreateParams {
    const params: InvoiceCreateParams = {
      customer: customerId,
      collection_method: 'charge_automatically',
      pending_invoice_items_behavior: 'include',
      auto_advance: false,
      description,
      metadata,
      custom_fields: resolveInvoiceCustomFieldsSk(billing),
      footer: buildSkInvoiceFooter(productType, this.config, subscriptionPeriod),
      rendering: buildSkInvoiceRendering(),
    };
    if (!options?.omitPaymentSettings) {
      params.payment_settings = buildSkInvoicePaymentSettings();
    }
    const accountTaxIds = getStripeAccountTaxIds(this.config);
    if (accountTaxIds?.length) {
      params.account_tax_ids = accountTaxIds;
    }
    if (isStripeAutomaticTaxEnabled(this.config)) {
      params.automatic_tax = { enabled: true };
    }
    return params;
  }

  private creditCheckoutMetadata(
    userId: string,
    priceId: string,
    creditsAmount: number,
    billing: CheckoutBillingDetailsInput,
  ): Record<string, string> {
    const metadata: Record<string, string> = {
      user_id: userId,
      credits: String(creditsAmount),
      type: 'credits',
      price_id: priceId,
      purchaser_type: billing.purchaser_type,
    };
    const companyName = billing.company_name?.trim();
    if (companyName) {
      metadata.company_name = companyName.slice(0, 500);
    }
    const ico = billing.registration_number?.trim();
    if (ico) {
      metadata.registration_number = ico.slice(0, 500);
    }
    const dic = billing.tax_id?.trim();
    if (dic) {
      metadata.tax_id = dic.slice(0, 500);
    }
    const vat = billing.vat_id?.trim();
    if (vat) {
      metadata.vat_id = vat.slice(0, 500);
    }
    return metadata;
  }

  private billingFromPaymentIntentMetadata(
    metadata: Record<string, string>,
  ): CheckoutBillingDetailsInput {
    return {
      purchaser_type:
        metadata.purchaser_type === 'company' ? 'company' : 'individual',
      company_name: metadata.company_name?.trim() || null,
      registration_number: metadata.registration_number?.trim() || null,
      tax_id: metadata.tax_id?.trim() || null,
      vat_id: metadata.vat_id?.trim() || null,
    };
  }

  private isCreditPackOpenInvoice(inv: Invoice): boolean {
    return (
      inv.metadata?.type === 'credits' && !getInvoiceSubscriptionId(inv)
    );
  }

  private isSubscriptionInvoice(invoice: Invoice): boolean {
    return Boolean(getInvoiceSubscriptionId(invoice));
  }

  /** Paid invoices + open subscription renewal invoices (past_due); not abandoned credit checkouts. */
  private isVisibleCustomerInvoice(invoice: Invoice): boolean {
    if (invoice.status === 'paid') {
      return true;
    }
    return invoice.status === 'open' && this.isSubscriptionInvoice(invoice);
  }

  private isPayableSubscriptionInvoice(invoice: Invoice): boolean {
    return (
      invoice.status === 'open' &&
      this.isSubscriptionInvoice(invoice) &&
      (invoice.amount_due ?? 0) > 0
    );
  }

  private async voidOpenCustomerInvoices(
    customerId: string,
    filter?: (inv: Invoice) => boolean,
  ): Promise<void> {
    const stripe = this.getStripe();
    let startingAfter: string | undefined;
    for (let page = 0; page < 3; page++) {
      const list = await stripe.invoices.list({
        customer: customerId,
        status: 'open',
        limit: 20,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const inv of list.data) {
        if (filter && !filter(inv)) {
          continue;
        }
        try {
          await stripe.invoices.voidInvoice(inv.id);
        } catch (err) {
          this.logger.warn(
            `voidInvoice failed for ${inv.id}: ${String(err)}`,
          );
        }
      }
      if (!list.has_more || list.data.length < 1) {
        break;
      }
      startingAfter = list.data[list.data.length - 1]?.id;
    }
  }

  private async voidSubscriptionOpenInvoice(subscriptionId: string): Promise<void> {
    try {
      const sub = await this.getStripe().subscriptions.retrieve(subscriptionId, {
        expand: ['latest_invoice'],
      });
      const inv = sub.latest_invoice;
      if (
        inv &&
        typeof inv === 'object' &&
        inv.status === 'open' &&
        inv.id
      ) {
        await this.getStripe().invoices.voidInvoice(inv.id);
      }
    } catch (err) {
      this.logger.warn(
        `voidSubscriptionOpenInvoice failed for ${subscriptionId}: ${String(err)}`,
      );
    }
  }

  private async voidOpenInvoiceForPaymentIntent(
    paymentIntentId: string,
  ): Promise<void> {
    const stripe = this.getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    const invoiceRef = (pi as PaymentIntent & { invoice?: string | { id?: string } | null })
      .invoice;
    const invoiceId =
      typeof invoiceRef === 'string'
        ? invoiceRef
        : invoiceRef && typeof invoiceRef === 'object'
          ? invoiceRef.id
          : null;
    if (!invoiceId) {
      return;
    }
    try {
      const inv = await stripe.invoices.retrieve(invoiceId);
      if (inv.status === 'open') {
        await stripe.invoices.voidInvoice(invoiceId);
      }
    } catch (err) {
      this.logger.warn(
        `voidOpenInvoiceForPaymentIntent failed for ${paymentIntentId}: ${String(err)}`,
      );
    }
  }

  /**
   * SK faktúra for credit packs is created only after PaymentIntent succeeds
   * (paid_out_of_band). Legacy invoice-backed PIs keep their Stripe invoice.
   */
  private async createPaidSkInvoiceForCreditPayment(
    pi: PaymentIntent,
    metadata: Record<string, string>,
  ): Promise<string | null> {
    const invoiceRef = (pi as PaymentIntent & { invoice?: string | { id?: string } | null })
      .invoice;
    if (invoiceRef) {
      return typeof invoiceRef === 'string'
        ? invoiceRef
        : invoiceRef.id ?? null;
    }
    const existingInvoiceId = metadata.invoice_id?.trim();
    if (existingInvoiceId) {
      return existingInvoiceId;
    }

    const customerId =
      typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null;
    const priceId = metadata.price_id?.trim();
    const creditsRaw = metadata.credits;
    if (!customerId || !priceId || creditsRaw === undefined) {
      return null;
    }
    const creditsAmount = parseInt(String(creditsRaw), 10);
    if (creditsAmount < 1) {
      return null;
    }

    const stripe = this.getStripe();
    const billing = this.billingFromPaymentIntentMetadata(metadata);
    const invoiceMetadata: Record<string, string> = {
      ...metadata,
      payment_intent_id: pi.id,
    };
    const description = SK_INVOICE_CREDIT_LINE_DESCRIPTION;

    await this.voidOpenCustomerInvoices(customerId, (inv) =>
      this.isCreditPackOpenInvoice(inv),
    );

    const drafts = await stripe.invoices.list({
      customer: customerId,
      status: 'draft',
      limit: 20,
    });
    for (const inv of drafts.data) {
      if (!getInvoiceSubscriptionId(inv)) {
        await stripe.invoices.del(inv.id);
      }
    }

    const totalCents = pi.amount_received ?? pi.amount ?? 0;
    const lineItem = buildSkCreditInvoiceLineItem(totalCents, creditsAmount);
    if (!lineItem) {
      this.logger.warn(
        `createPaidSkInvoiceForCreditPayment: invalid amount for PI ${pi.id}`,
      );
      return null;
    }

    await stripe.invoiceItems.create({
      customer: customerId,
      currency: (pi.currency ?? 'eur').toLowerCase(),
      description: lineItem.description,
      metadata: invoiceMetadata,
      quantity: lineItem.quantity,
      unit_amount_decimal: lineItem.unit_amount_decimal,
    } as unknown as InvoiceItemCreateParams);

    const finalized = await this.createAndFinalizeSkInvoice(
      customerId,
      billing,
      invoiceMetadata,
      description,
      'credits',
      null,
      { omitPaymentSettings: true },
    );

    let paid: Invoice;
    try {
      paid = await stripe.invoices.attachPayment(finalized.id, {
        payment_intent: pi.id,
      });
    } catch (err) {
      this.logger.warn(
        `attachPayment failed for PI ${pi.id} on invoice ${finalized.id}, trying paid_out_of_band: ${String(err)}`,
      );
      await stripe.invoices.pay(finalized.id, { paid_out_of_band: true });
      paid = await stripe.invoices.retrieve(finalized.id);
    }

    if (paid.status !== 'paid') {
      this.logger.warn(
        `createPaidSkInvoiceForCreditPayment: invoice ${finalized.id} not paid after pay (status=${paid.status})`,
      );
      return null;
    }

    const mergedMetadata: Record<string, string> = {
      ...(pi.metadata ?? {}),
      invoice_id: paid.id,
    };
    try {
      await stripe.paymentIntents.update(pi.id, { metadata: mergedMetadata });
    } catch (err) {
      this.logger.warn(
        `Could not persist invoice_id on PI ${pi.id}: ${String(err)}`,
      );
    }
    return paid.id;
  }

  private async createAndFinalizeSkInvoice(
    customerId: string,
    billing: CheckoutBillingDetailsInput | null | undefined,
    metadata: Record<string, string>,
    description: string,
    productType: SkInvoiceProductType,
    subscriptionPeriod?: { start: number; end: number } | null,
    options?: { omitPaymentSettings?: boolean },
  ): Promise<Invoice> {
    const stripe = this.getStripe();
    const base = this.buildSkInvoiceCreateParams(
      customerId,
      billing,
      metadata,
      description,
      productType,
      subscriptionPeriod,
      options,
    );
    try {
      const invoice = await stripe.invoices.create(base);
      return await stripe.invoices.finalizeInvoice(invoice.id, {
        expand: ['payments.data.payment.payment_intent'],
      });
    } catch (err) {
      if (!base.automatic_tax?.enabled) {
        throw err;
      }
      this.logger.warn(
        `Stripe automatic_tax invoice create failed, retrying without tax: ${String(err)}`,
      );
      const { automatic_tax: _removed, ...withoutTax } = base;
      const invoice = await stripe.invoices.create(withoutTax);
      return await stripe.invoices.finalizeInvoice(invoice.id, {
        expand: ['payments.data.payment.payment_intent'],
      });
    }
  }

  /**
   * Align subscription invoice PDF with SK template (line text, poznámka, obdobie).
   * Called from invoice.created while invoice is still draft.
   */
  async applySkSubscriptionInvoiceTemplate(invoice: Invoice): Promise<void> {
    if (!getInvoiceSubscriptionId(invoice)) {
      return;
    }
    if (invoice.status !== 'draft') {
      return;
    }
    const stripe = this.getStripe();
    const firstLine = invoice.lines?.data?.[0];
    const periodStart = firstLine?.period?.start;
    const periodEnd = firstLine?.period?.end;
    const subscriptionPeriod =
      typeof periodStart === 'number' &&
      typeof periodEnd === 'number' &&
      periodStart > 0 &&
      periodEnd > 0
        ? { start: periodStart, end: periodEnd }
        : null;

    try {
      await stripe.invoices.update(invoice.id, {
        footer: buildSkInvoiceFooter(
          'subscription',
          this.config,
          subscriptionPeriod,
        ),
        rendering: buildSkInvoiceRendering(),
      });
    } catch (err) {
      this.logger.warn(
        `Could not update subscription invoice footer ${invoice.id}: ${String(err)}`,
      );
    }

    for (const line of invoice.lines?.data ?? []) {
      if (!line.id) {
        continue;
      }
      try {
        await stripe.invoiceItems.update(line.id, {
          description: SK_INVOICE_SUBSCRIPTION_LINE_DESCRIPTION,
        });
      } catch (err) {
        this.logger.warn(
          `Could not update subscription line item ${line.id}: ${String(err)}`,
        );
      }
    }
  }

  private resolveInvoiceProductType(invoice: Invoice): SkInvoiceProductType {
    if (getInvoiceSubscriptionId(invoice)) {
      return 'subscription';
    }
    if (invoice.metadata?.type === 'credits') {
      return 'credits';
    }
    const lineDesc = invoice.lines?.data?.[0]?.description?.toLowerCase() ?? '';
    if (lineDesc.includes('predplatn')) {
      return 'subscription';
    }
    return 'credits';
  }

  private extractSubscriptionPeriod(
    invoice: Invoice,
    lineRows: InvoiceLineItem[],
  ): { start: number; end: number } | null {
    const line = lineRows[0] ?? invoice.lines?.data?.[0];
    const start = line?.period?.start;
    const end = line?.period?.end;
    if (
      typeof start === 'number' &&
      typeof end === 'number' &&
      start > 0 &&
      end > 0
    ) {
      return { start, end };
    }
    return null;
  }

  /**
   * Invoice-backed PaymentIntents: Stripe rejects `customer` on update, but allows
   * `receipt_email`. Receipts for invoice payments include the hosted invoice link.
   * Do not set automatic_payment_methods — subscription PIs use payment_method_types: ['card'].
   */
  private async attachInvoicePaymentIntentExtras(
    paymentIntentId: string,
    customerEmail: string,
    metadata: Record<string, string>,
  ): Promise<void> {
    const email = customerEmail.trim();
    const update: PaymentIntentUpdateParams = { metadata };
    if (email) {
      update.receipt_email = email;
    }
    await this.getStripe().paymentIntents.update(paymentIntentId, update);
  }

  private paymentIntentResponseFromStripe(
    pi: PaymentIntent | null,
    clientSecret: string,
    extras?: {
      intent_type?: 'payment' | 'setup';
      trial_period_days?: number;
    },
  ): {
    client_secret: string;
    amount?: number;
    currency?: string;
    intent_type?: 'payment' | 'setup';
    trial_period_days?: number;
  } {
    const response: {
      client_secret: string;
      amount?: number;
      currency?: string;
      intent_type?: 'payment' | 'setup';
      trial_period_days?: number;
    } = {
      client_secret: clientSecret,
      ...extras,
    };
    if (pi && typeof pi.amount === 'number' && pi.amount >= 1) {
      response.amount = pi.amount;
    }
    if (pi?.currency?.trim()) {
      response.currency = pi.currency.trim();
    }
    return response;
  }

  private async applyStripePriceTrialToSubscriptionCreate(
    params: SubscriptionCreateParams,
    userId: string,
    stripePriceId: string,
  ): Promise<number> {
    const stripe = this.getStripe();
    const priceTrialDays =
      await this.subscriptionTrial.getTrialPeriodDaysForPrice(
        stripe,
        stripePriceId,
      );
    const trialPeriodDays =
      await this.subscriptionTrial.resolveSubscriptionTrialDays(
        userId,
        stripe,
        stripePriceId,
      );
    this.subscriptionTrial.applyTrialToSubscriptionParams(
      params,
      trialPeriodDays,
      {
        suppressPriceDefaultTrial:
          priceTrialDays > 0 && trialPeriodDays < 1,
      },
    );
    return trialPeriodDays;
  }

  private async resolveSubscriptionPaymentClientSecret(
    subscription: Subscription,
  ): Promise<{
    clientSecret: string;
    intentType: 'payment' | 'setup';
    pi: PaymentIntent | null;
  }> {
    const stripe = this.getStripe();
    const invoiceExpand = ['payments.data.payment.payment_intent'] as const;
    const invoiceRef = subscription.latest_invoice;
    const invoiceId = expandableRefId(invoiceRef);
    let invoice: Invoice | null = null;
    let invoiceFromShallowExpand = false;

    if (invoiceRef && typeof invoiceRef === 'object') {
      invoice = invoiceRef as Invoice;
      invoiceFromShallowExpand = true;
    } else if (invoiceId) {
      invoice = await stripe.invoices.retrieve(invoiceId, {
        expand: [...invoiceExpand],
      });
    }

    if (invoice) {
      let secret = getInvoicePaymentIntentClientSecret(invoice);
      let pi: PaymentIntent | null = null;
      const piRef = getInvoicePaymentIntentRef(invoice);
      if (piRef && typeof piRef === 'object') {
        pi = piRef;
      }

      if (!secret && invoiceFromShallowExpand && invoice.id) {
        invoice = await stripe.invoices.retrieve(invoice.id, {
          expand: [...invoiceExpand],
        });
        secret = getInvoicePaymentIntentClientSecret(invoice);
        const refetchedPiRef = getInvoicePaymentIntentRef(invoice);
        if (refetchedPiRef && typeof refetchedPiRef === 'object') {
          pi = refetchedPiRef;
        }
      }

      if (!secret) {
        const piId = getInvoicePaymentIntentId(invoice);
        if (piId) {
          pi = await stripe.paymentIntents.retrieve(piId);
          secret = pi.client_secret?.trim() || null;
        }
      }

      if (secret) {
        return { clientSecret: secret, intentType: 'payment', pi };
      }
    }

    const setupRef = subscription.pending_setup_intent;
    const setupSecret = getSetupIntentClientSecretFromRef(setupRef);
    if (setupSecret) {
      return { clientSecret: setupSecret, intentType: 'setup', pi: null };
    }
    const setupId = getSetupIntentId(setupRef);
    if (setupId) {
      const si = await stripe.setupIntents.retrieve(setupId);
      const secret = si.client_secret?.trim();
      if (secret) {
        return { clientSecret: secret, intentType: 'setup', pi: null };
      }
    }

    throw new ServiceUnavailableException(
      'Nepodarilo sa vytvoriť platobný formulár predplatného.',
    );
  }

  private async upsertUserSubscriptionFromStripeSub(
    userId: string,
    planId: string,
    sub: Subscription,
  ): Promise<void> {
    const periodEnd = getSubscriptionCurrentPeriodEndIso(sub);
    const customerId =
      typeof sub.customer === 'string'
        ? sub.customer
        : sub.customer &&
            typeof sub.customer === 'object' &&
            'id' in sub.customer
          ? String((sub.customer as { id: string }).id)
          : null;
    await this.supabaseService
      .getClient()
      .from('user_subscriptions')
      .upsert(
        {
          user_id: userId,
          plan_id: planId,
          status: sub.status ?? 'active',
          stripe_subscription_id: sub.id,
          stripe_customer_id: customerId,
          current_period_end: periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
        },
        { onConflict: 'user_id' },
      );
  }

  /** Keep Stripe Customer + invoice recipient email aligned (Dashboard + receipt emails). */
  async syncCustomerEmailFromPaymentIntent(
    paymentIntentId: string,
  ): Promise<void> {
    const stripe = this.getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });
    const charge = pi.latest_charge;
    const fromCharge =
      charge && typeof charge === 'object' ? charge.billing_details : undefined;
    const email = fromCharge?.email?.trim() || pi.receipt_email?.trim();
    const customerRef = pi.customer;
    const customerId =
      typeof customerRef === 'string'
        ? customerRef.trim()
        : customerRef?.id?.trim();
    if (!customerId) {
      return;
    }
    const addr = fromCharge?.address;
    const update: CustomerUpdateParams = {};
    if (email) {
      update.email = email;
    }
    if (addr?.line1?.trim() && addr.country?.trim()) {
      update.address = {
        line1: addr.line1.trim(),
        line2: addr.line2?.trim() || undefined,
        city: addr.city?.trim() || undefined,
        postal_code: addr.postal_code?.trim() || undefined,
        country: addr.country.trim().toUpperCase(),
      };
    }
    if (Object.keys(update).length > 0) {
      await stripe.customers.update(customerId, update);
    }
  }

  async createPaymentIntentCredits(
    userId: string,
    priceId: string,
    creditsAmount: number,
    email: string,
    billing?: CheckoutBillingDetailsInput | null,
  ): Promise<{ client_secret: string; amount?: number; currency?: string }> {
    const customerEmail = email?.trim();
    if (!customerEmail) {
      throw new ServiceUnavailableException(
        'Pre fakturáciu je potrebný e-mail na účte.',
      );
    }
    const stripe = this.getStripe();
    const price = await stripe.prices.retrieve(priceId);
    const amount = price.unit_amount ?? 0;
    const currency = price.currency ?? 'eur';
    if (amount < 1) {
      throw new ServiceUnavailableException('Invalid price amount');
    }

    const profileCtx = await this.loadProfileBillingContext(userId);
    const effectiveBilling = this.mergeBillingWithProfile(
      userId,
      billing,
      profileCtx,
    );
    await assertSkBillingEligible(
      effectiveBilling,
      this.skRpoLookup,
      profileCtx.role,
    );
    const customerId = await this.ensureStripeCustomer(userId, customerEmail);
    await this.applyCheckoutBillingDetails(
      userId,
      effectiveBilling,
      customerEmail,
      profileCtx,
    );
    const customerAddress = resolveCustomerAddress(effectiveBilling, {
      registered_office: profileCtx.registered_office,
      billing_address: profileCtx.billing_address,
    });
    this.assertCustomerAddressForSkInvoice(
      customerAddress,
      effectiveBilling.purchaser_type,
    );

    await this.voidOpenCustomerInvoices(customerId, (inv) =>
      this.isCreditPackOpenInvoice(inv),
    );

    const metadata = this.creditCheckoutMetadata(
      userId,
      priceId,
      creditsAmount,
      effectiveBilling,
    );

    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      metadata,
      receipt_email: customerEmail,
      description: SK_INVOICE_CREDIT_LINE_DESCRIPTION,
      payment_method_types: buildSkCardPaymentIntentTypes(),
    });
    const secret = pi.client_secret?.trim();
    if (!secret) {
      throw new ServiceUnavailableException(
        'Nepodarilo sa vytvoriť platobný formulár pre kredity.',
      );
    }
    return this.paymentIntentResponseFromStripe(pi, secret);
  }

  private isValidStripePriceId(value: unknown): value is string {
    return typeof value === 'string' && value.trim().startsWith('price_');
  }

  async listCreditPacks(): Promise<CreditPackDto[]> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('credit_packs')
      .select('slug, name_sk, stripe_price_id, credits, unit_amount, currency, badge')
      .eq('active', true)
      .neq('slug', 'agentura');
    let packs: CreditPackDto[] = [];
    if (!error && Array.isArray(data)) {
      const rows = data as Array<{
        slug: string;
        name_sk: string;
        stripe_price_id: string | null;
        credits: number;
        unit_amount: number;
        currency: string;
        badge: string | null;
      }>;
      const testMode = isStripeTestMode(this.config);
      const missingPriceSlugs: string[] = [];
      packs = [];
      for (const row of rows) {
        const priceId = resolveCreditPackStripePriceId(
          this.config,
          row.slug,
          row.stripe_price_id,
        );
        if (!this.isValidStripePriceId(priceId)) {
          missingPriceSlugs.push(row.slug);
          continue;
        }
        packs.push({
          price_id: priceId!.trim(),
          credits: row.credits,
          unit_amount: row.unit_amount,
          currency: row.currency,
          slug: row.slug,
          name_sk: row.name_sk,
          badge: row.badge,
        });
      }
      if (missingPriceSlugs.length > 0) {
        this.logger.warn(
          testMode
            ? `credit_packs: no sandbox price for slugs: ${missingPriceSlugs.join(', ')} (sk_test_ — see docs/stripe-sandbox-catalog.md)`
            : `credit_packs missing stripe_price_id for: ${missingPriceSlugs.join(', ')}`,
        );
      }
    }
    if (packs.length > 0) {
      return packs;
    }
    return this.listCreditPacksFromDefaultStripePrice();
  }

  /**
   * When `credit_packs` has no rows (e.g. not seeded), expose one pack from
   * STRIPE_PRICE_ID_CREDITS so the buy-credits UI is usable.
   */
  private async listCreditPacksFromDefaultStripePrice(): Promise<CreditPackDto[]> {
    if (!this.stripe) {
      return [];
    }
    const priceId = this.getDefaultCreditsPriceId();
    if (!priceId) {
      return [];
    }
    try {
      const stripe = this.getStripe();
      const price = await stripe.prices.retrieve(priceId);
      const unitAmount = price.unit_amount ?? 0;
      if (unitAmount < 1) {
        return [];
      }
      const credits = Math.max(
        1,
        Math.floor(Number(this.config.get('STRIPE_CREDITS_PER_PACK') ?? 10)),
      );
      return [
        {
          price_id: priceId,
          credits,
          unit_amount: unitAmount,
          currency: price.currency ?? 'eur',
        },
      ];
    } catch {
      return [];
    }
  }

  /**
   * Switch user to the free subscription plan (`price_monthly_cents === 0`).
   * Cancels an active Stripe subscription when downgrading from a paid plan.
   */
  async activateFreeSubscriptionPlan(
    userId: string,
    planId: string,
    confirmDowngrade: boolean,
  ): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const { data: plan, error } = await supabase
      .from('subscription_plans')
      .select('id, slug, price_monthly_cents')
      .eq('id', planId)
      .single();
    if (error || !plan) {
      throw new NotFoundException('Plán nebol nájdený.');
    }
    const p = plan as {
      id: string;
      slug: string;
      price_monthly_cents: number;
    };
    if (!isPublicSubscriptionPlanSlug(p.slug)) {
      throw new BadRequestException('Tento plán už nie je dostupný.');
    }
    if (p.price_monthly_cents !== 0) {
      throw new BadRequestException(
        'Platené predplatné aktivujte na /platba.',
      );
    }
    const { data: currentSub } = await supabase
      .from('user_subscriptions')
      .select('plan_id, stripe_subscription_id, subscription_plans(slug, price_monthly_cents)')
      .eq('user_id', userId)
      .maybeSingle();
    const curPlan = (currentSub as {
      subscription_plans?: { slug?: string; price_monthly_cents?: number };
      stripe_subscription_id?: string | null;
    } | null)?.subscription_plans;
    const wasPaid = (curPlan?.price_monthly_cents ?? 0) > 0;
    if (wasPaid && !confirmDowngrade) {
      throw new BadRequestException(
        'Prechod na bezplatný plán vyžaduje potvrdenie. Zruší sa aktuálne predplatné.',
      );
    }
    const stripeSubId = (
      currentSub as { stripe_subscription_id?: string | null } | null
    )?.stripe_subscription_id;
    if (stripeSubId?.trim()) {
      await this.cancelStripeSubscriptionBeforeAccountDeletion(userId);
    }
    const { error: upsertError } = await supabase.from('user_subscriptions').upsert(
      {
        user_id: userId,
        plan_id: p.id,
        status: 'active',
        stripe_subscription_id: null,
      },
      { onConflict: 'user_id' },
    );
    if (upsertError) {
      throw new BadRequestException(
        'Nepodarilo sa aktivovať bezplatný plán. Skúste znova.',
      );
    }
  }

  async applyCheckoutBillingDetails(
    userId: string,
    details: CheckoutBillingDetailsInput,
    customerEmail?: string | null,
    profileCtx?: {
      role?: string | null;
      registered_office: string | null;
      billing_address: string | null;
    } | null,
  ): Promise<void> {
    const supabase = this.supabaseService.getClient();
    let accountRole = profileCtx?.role?.trim() || null;
    if (!accountRole) {
      const { data: roleRow } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      accountRole =
        (roleRow as { role?: string | null } | null)?.role?.trim() || null;
    }
    assertPurchaserTypeMatchesAccountRole(accountRole, details);
    const profileUpdate: Record<string, unknown> = {};
    if (details.purchaser_type === 'company') {
      if (details.company_name !== undefined) {
        profileUpdate.company_name = details.company_name?.trim() || null;
      }
      if (details.registration_number !== undefined) {
        profileUpdate.registration_number =
          details.registration_number?.trim() || null;
      }
      if (details.tax_id !== undefined) {
        profileUpdate.tax_id = details.tax_id?.trim() || null;
      }
      if (details.vat_id !== undefined) {
        profileUpdate.vat_id = details.vat_id?.trim() || null;
      }
    }
    if (Object.keys(profileUpdate).length > 0) {
      await supabase.from('profiles').update(profileUpdate).eq('id', userId);
    }

    const { data: subRow } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    const customerId = (
      subRow as { stripe_customer_id?: string | null } | null
    )?.stripe_customer_id?.trim();
    if (!customerId) return;

    const stripe = this.getStripe();
    const purchaserType = details.purchaser_type;
    const metadata: Record<string, string> = {
      user_id: userId,
      buyer_type: purchaserType,
    };
    const companyName = details.company_name?.trim();
    const localeUpdate = { preferred_locales: ['sk'] };
    const emailFields = customerEmail?.trim()
      ? { email: customerEmail.trim() }
      : {};
    const customerAddress = resolveCustomerAddress(details, profileCtx ?? null);
    const addressFields = customerAddress
      ? {
          address: {
            line1: customerAddress.line1,
            line2: customerAddress.line2 || undefined,
            city: customerAddress.city || undefined,
            postal_code: customerAddress.postal_code || undefined,
            country: customerAddress.country,
          },
        }
      : {};
    const invoiceSettingsFields = {
      invoice_settings: {
        custom_fields: resolveInvoiceCustomFieldsSk(details),
      },
    };

    if (purchaserType === 'company' && companyName) {
      metadata.company_name = companyName;
      await stripe.customers.update(customerId, {
        name: companyName,
        metadata,
        ...localeUpdate,
        ...emailFields,
        ...addressFields,
        ...invoiceSettingsFields,
      });
    } else {
      const personName = details.company_name?.trim();
      await stripe.customers.update(customerId, {
        name: personName || undefined,
        metadata,
        ...localeUpdate,
        ...emailFields,
        ...addressFields,
        ...invoiceSettingsFields,
      });
    }

    if (isStripeAutomaticTaxEnabled(this.config)) {
      const vat = normalizeSkEuVatId(details.vat_id);
      if (purchaserType === 'company' && vat) {
        const normalized = vat;
        const existing = await stripe.customers.listTaxIds(customerId, {
          limit: 20,
        });
        const has = existing.data.some(
          (t) => t.value.replace(/\s+/g, '').toUpperCase() === normalized,
        );
        if (!has) {
          try {
            await stripe.customers.createTaxId(customerId, {
              type: 'eu_vat',
              value: normalized,
            });
          } catch (err) {
            this.logger.warn(
              `Stripe tax id create skipped for user ${userId}: ${String(err)}`,
            );
          }
        }
      }
    } else {
      await this.removeCustomerEuVatTaxIds(customerId);
    }
  }
  /** Buyer IČ DPH is on invoice custom_fields only — remove duplicate „SK VAT“ on Customer. */
  private async removeCustomerEuVatTaxIds(customerId: string): Promise<void> {
    const stripe = this.getStripe();
    try {
      const existing = await stripe.customers.listTaxIds(customerId, {
        limit: 100,
      });
      for (const taxId of existing.data) {
        if (taxId.type !== 'eu_vat') {
          continue;
        }
        try {
          await stripe.customers.deleteTaxId(customerId, taxId.id);
        } catch (err) {
          this.logger.warn(
            `Could not delete customer eu_vat ${taxId.id}: ${String(err)}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `Could not list customer tax ids for ${customerId}: ${String(err)}`,
      );
    }
  }

  async ensureStripeCustomer(userId: string, email: string): Promise<string> {
    const customerEmail = email?.trim();
    if (!customerEmail) {
      throw new ServiceUnavailableException(
        'Pre platbu je potrebný e-mail na účte (Stripe faktúry a potvrdenia).',
      );
    }
    const supabase = this.supabaseService.getClient();
    const { data: subRow } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    let customerId = (
      subRow as { stripe_customer_id?: string | null } | null
    )?.stripe_customer_id?.trim();

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, company_name, first_name, last_name')
      .eq('id', userId)
      .maybeSingle();
    const p = profile as {
      display_name?: string | null;
      company_name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    } | null;
    const personName =
      [p?.first_name, p?.last_name].filter(Boolean).join(' ').trim() ||
      p?.display_name?.trim() ||
      undefined;

    const stripe = this.getStripe();
    const metadata: Record<string, string> = { user_id: userId };

    const localeFields = { preferred_locales: ['sk'] };
    if (customerId) {
      await stripe.customers.update(customerId, {
        email: customerEmail,
        name: personName || undefined,
        metadata,
        ...localeFields,
      });
    } else {
      const customer = await stripe.customers.create({
        email: customerEmail,
        name: personName || undefined,
        metadata,
        ...localeFields,
      });
      customerId = customer.id;
    }

    await this.persistStripeCustomerId(userId, customerId!);

    return customerId!;
  }

  /** Stripe Customer for invoices / portal — DB first, then metadata search. */
  async resolveStripeCustomerId(userId: string): Promise<string | null> {
    const supabase = this.supabaseService.getClient();
    const { data: subRow } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    const fromDb = (
      subRow as { stripe_customer_id?: string | null } | null
    )?.stripe_customer_id?.trim();
    if (fromDb) {
      return fromDb;
    }
    try {
      const stripe = this.getStripe();
      const found = await stripe.customers.search({
        query: `metadata['user_id']:'${userId}'`,
        limit: 1,
      });
      const customerId = found.data[0]?.id?.trim();
      if (customerId) {
        await this.persistStripeCustomerId(userId, customerId);
        return customerId;
      }
    } catch (err) {
      this.logger.warn(
        `Stripe customer search failed for ${userId}: ${String(err)}`,
      );
    }
    return null;
  }

  /**
   * If `userId` already has a stored `stripe_customer_id`, the PaymentIntent's
   * `customer` field must match it. Returns `true` on mismatch (caller should
   * deny the grant). When the user has no stored customer yet, we accept any
   * customer on the PI (first-purchase case — `persistStripeCustomerId` will
   * record it afterwards).
   *
   * Returning false means "no mismatch — safe to fulfill".
   */
  private async assertPaymentIntentCustomerForUser(
    paymentIntentId: string,
    userId: string,
    piCustomerId: string | null,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      // Fail closed: if we can't read the binding, treat as mismatch when a
      // PI customer is present and we can't verify it.
      this.logger.warn(
        `assertPaymentIntentCustomerForUser: lookup failed for ${userId}: ${error.message}`,
      );
      return piCustomerId !== null;
    }
    const stored = (
      data as { stripe_customer_id?: string | null } | null
    )?.stripe_customer_id?.trim();
    if (!stored) {
      // No prior binding — accept first-time PI customer.
      return false;
    }
    if (!piCustomerId) {
      // We have a stored customer but the PI has none — suspicious.
      this.logger.warn(
        `PI ${paymentIntentId} has no customer; user ${userId} has stored customer ${stored}`,
      );
      return true;
    }
    return stored !== piCustomerId;
  }

  private async persistStripeCustomerId(
    userId: string,
    customerId: string,
  ): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('plan_id, status, stripe_subscription_id, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', userId);
      if (error) {
        this.logger.warn(
          `persistStripeCustomerId update failed for ${userId}: ${error.message}`,
        );
      }
      return;
    }

    const { data: freePlan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('slug', 'zadarmo')
      .maybeSingle();
    const planId = (freePlan as { id?: string } | null)?.id;
    if (!planId) {
      this.logger.error(
        `Cannot persist stripe_customer_id — subscription_plans slug zadarmo missing`,
      );
      return;
    }
    const { error } = await supabase.from('user_subscriptions').insert({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      stripe_customer_id: customerId,
    });
    if (error) {
      this.logger.warn(
        `persistStripeCustomerId insert failed for ${userId}: ${error.message}`,
      );
    }
  }

  async createSubscriptionPaymentIntent(
    userId: string,
    planId: string,
    stripePriceId: string,
    email: string,
    billing?: CheckoutBillingDetailsInput | null,
  ): Promise<{ client_secret: string; amount?: number; currency?: string }> {
    const customerEmail = email?.trim();
    if (!customerEmail) {
      throw new ServiceUnavailableException(
        'Pre fakturáciu je potrebný e-mail na účte.',
      );
    }
    const stripe = this.getStripe();
    const profileCtx = await this.loadProfileBillingContext(userId);
    const effectiveBilling = this.mergeBillingWithProfile(
      userId,
      billing,
      profileCtx,
    );
    await assertSkBillingEligible(
      effectiveBilling,
      this.skRpoLookup,
      profileCtx.role,
    );
    const customerId = await this.ensureStripeCustomer(userId, customerEmail);
    await this.applyCheckoutBillingDetails(
      userId,
      effectiveBilling,
      customerEmail,
      profileCtx,
    );
    const customerAddress = resolveCustomerAddress(effectiveBilling, {
      registered_office: profileCtx.registered_office,
      billing_address: profileCtx.billing_address,
    });
    this.assertCustomerAddressForSkInvoice(
      customerAddress,
      effectiveBilling.purchaser_type,
    );

    try {
      await this.cancelUserSubscriptionImmediately(userId);
    } catch (err) {
      this.logger.warn(
        `Could not cancel prior subscription for ${userId}: ${String(err)}`,
      );
    }

    const incomplete = await stripe.subscriptions.list({
      customer: customerId,
      status: 'incomplete',
      limit: 10,
    });
    for (const sub of incomplete.data) {
      await this.voidSubscriptionOpenInvoice(sub.id);
      try {
        await stripe.subscriptions.cancel(sub.id);
      } catch (err) {
        if (!this.isStripeSubscriptionMissing(err)) {
          this.logger.warn(
            `Could not cancel incomplete subscription ${sub.id}: ${String(err)}`,
          );
        }
      }
    }

    const subscriptionParams: SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: stripePriceId }],
      collection_method: 'charge_automatically',
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      expand: ['latest_invoice', 'pending_setup_intent'],
      metadata: {
        user_id: userId,
        plan_id: planId,
        type: 'subscription',
      },
    };
    const trialPeriodDays = await this.applyStripePriceTrialToSubscriptionCreate(
      subscriptionParams,
      userId,
      stripePriceId,
    );
    if (isStripeAutomaticTaxEnabled(this.config)) {
      subscriptionParams.automatic_tax = { enabled: true };
    }
    const accountTaxIds = getStripeAccountTaxIds(this.config);
    if (accountTaxIds?.length) {
      subscriptionParams.invoice_settings = {
        ...(subscriptionParams.invoice_settings ?? {}),
        account_tax_ids: accountTaxIds,
      };
    }
    let subscription: Subscription;
    try {
      subscription = await stripe.subscriptions.create(subscriptionParams);
    } catch (err) {
      if (!subscriptionParams.automatic_tax?.enabled) {
        throw err;
      }
      this.logger.warn(
        `Stripe automatic_tax subscription create failed, retrying without tax: ${String(err)}`,
      );
      const { automatic_tax: _removed, ...retryParams } = subscriptionParams;
      subscription = await stripe.subscriptions.create(retryParams);
    }

    const { clientSecret, intentType, pi } =
      await this.resolveSubscriptionPaymentClientSecret(subscription);
    const setupRef = subscription.pending_setup_intent;
    const setupId =
      typeof setupRef === 'string'
        ? setupRef
        : setupRef && typeof setupRef === 'object' && 'id' in setupRef
          ? String((setupRef as { id: string }).id)
          : null;
    if (setupId) {
      await stripe.setupIntents.update(setupId, {
        metadata: {
          user_id: userId,
          plan_id: planId,
          type: 'subscription',
          stripe_subscription_id: subscription.id,
        },
      });
    }
    if (pi?.id) {
      await this.attachInvoicePaymentIntentExtras(pi.id, customerEmail, {
        user_id: userId,
        plan_id: planId,
        type: 'subscription',
        stripe_subscription_id: subscription.id,
      });
    }
    return this.paymentIntentResponseFromStripe(pi, clientSecret, {
      intent_type: intentType,
      trial_period_days: trialPeriodDays > 0 ? trialPeriodDays : undefined,
    });
  }

  async syncSubscriptionFromPaymentIntent(
    paymentIntentId: string,
    options?: { assertUserId?: string },
  ): Promise<{
    applied: boolean;
    reason:
      | 'ok'
      | 'not_succeeded'
      | 'no_invoice'
      | 'no_subscription'
      | 'forbidden'
      | 'missing_metadata';
  }> {
    const stripe = this.getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded') {
      return { applied: false, reason: 'not_succeeded' };
    }
    const piMeta = (pi.metadata ?? {}) as Record<string, string>;
    let sub: Subscription | null = null;
    const subscriptionIdFromMeta = piMeta.stripe_subscription_id?.trim();
    if (subscriptionIdFromMeta) {
      sub = await this.retrieveSubscription(subscriptionIdFromMeta);
    }
    const invRef = (pi as { invoice?: string | Invoice | null }).invoice;
    if (!sub && invRef) {
      const inv =
        typeof invRef === 'string'
          ? await stripe.invoices.retrieve(invRef, {
              expand: ['parent.subscription_details.subscription'],
            })
          : invRef;
      const subRef = getInvoiceSubscriptionRef(inv);
      if (typeof subRef === 'string') {
        sub = await this.retrieveSubscription(subRef);
      } else if (
        subRef &&
        typeof subRef === 'object' &&
        'id' in subRef
      ) {
        sub = subRef as Subscription;
      }
    }
    const meta = (sub?.metadata ?? piMeta) as Record<string, string>;
    const userId = meta.user_id?.trim() || piMeta.user_id?.trim();
    const planId = meta.plan_id?.trim() || piMeta.plan_id?.trim();
    if (options?.assertUserId && userId !== options.assertUserId) {
      return { applied: false, reason: 'forbidden' };
    }
    if (!userId || !planId) {
      return { applied: false, reason: 'missing_metadata' };
    }
    const subscriptionId =
      sub?.id || subscriptionIdFromMeta || null;
    if (!subscriptionId) {
      return { applied: false, reason: 'no_subscription' };
    }
    const fullSub =
      sub ?? (await this.retrieveSubscription(subscriptionId));
    if (!fullSub) {
      return { applied: false, reason: 'no_subscription' };
    }
    await this.upsertUserSubscriptionFromStripeSub(userId, planId, fullSub);
    if (fullSub.status === 'trialing') {
      await this.subscriptionTrial.markSubscriptionTrialUsed(userId);
    }
    return { applied: true, reason: 'ok' };
  }

  async syncSubscriptionFromSetupIntent(
    setupIntentId: string,
    options?: { assertUserId?: string },
  ): Promise<{
    applied: boolean;
    reason:
      | 'ok'
      | 'not_succeeded'
      | 'no_subscription'
      | 'forbidden'
      | 'missing_metadata';
  }> {
    const stripe = this.getStripe();
    const si = await stripe.setupIntents.retrieve(setupIntentId);
    if (si.status !== 'succeeded') {
      return { applied: false, reason: 'not_succeeded' };
    }
    const siMeta = (si.metadata ?? {}) as Record<string, string>;
    const subscriptionId = siMeta.stripe_subscription_id?.trim();
    if (!subscriptionId) {
      return { applied: false, reason: 'no_subscription' };
    }
    const sub = await this.retrieveSubscription(subscriptionId);
    if (!sub) {
      return { applied: false, reason: 'no_subscription' };
    }
    const meta = (sub.metadata ?? {}) as Record<string, string>;
    const userId = meta.user_id?.trim() || siMeta.user_id?.trim();
    const planId = meta.plan_id?.trim() || siMeta.plan_id?.trim();
    if (options?.assertUserId && userId !== options.assertUserId) {
      return { applied: false, reason: 'forbidden' };
    }
    if (!userId || !planId) {
      return { applied: false, reason: 'missing_metadata' };
    }
    await this.upsertUserSubscriptionFromStripeSub(userId, planId, sub);
    if (sub.status === 'trialing') {
      await this.subscriptionTrial.markSubscriptionTrialUsed(userId);
    }
    return { applied: true, reason: 'ok' };
  }

  /**
   * Verifies PI amount matches an active credit pack (DB or env default).
   */
  async validateCreditPackForPaymentIntent(
    pi: PaymentIntent,
    expectedCredits: number,
  ): Promise<boolean> {
    const amount = pi.amount_received ?? pi.amount ?? 0;
    if (amount < 1) return false;
    const packs = await this.listCreditPacks();
    const priceId =
      typeof pi.metadata?.price_id === 'string' ? pi.metadata.price_id : null;
    if (priceId) {
      const pack = packs.find((p) => p.price_id === priceId);
      return (
        !!pack &&
        pack.credits === expectedCredits &&
        pack.unit_amount === amount
      );
    }
    const match = packs.find(
      (p) => p.credits === expectedCredits && p.unit_amount === amount,
    );
    return !!match;
  }

  private async isCreditFulfillmentComplete(
    paymentIntentId: string,
    userId: string,
    credits: number,
  ): Promise<boolean> {
    const supabase = this.supabaseService.getClient();
    const { data: row } = await supabase
      .from('stripe_credit_fulfillments')
      .select('user_id, credits')
      .eq('payment_intent_id', paymentIntentId)
      .maybeSingle();
    if (!row) return false;
    const r = row as { user_id: string; credits: number };
    if (r.user_id !== userId || r.credits !== credits) return false;
    const { data: ledger } = await supabase
      .from('credit_ledger')
      .select('id')
      .eq('ref_type', 'payment_intent')
      .eq('ref_id', paymentIntentId)
      .eq('user_id', userId)
      .maybeSingle();
    return !!ledger;
  }

  /**
   * Voids an open invoice linked to a canceled PaymentIntent (legacy invoice-backed checkout).
   */
  async voidAbandonedInvoiceForCanceledPaymentIntent(
    paymentIntentId: string,
  ): Promise<void> {
    await this.voidOpenInvoiceForPaymentIntent(paymentIntentId);
  }

  /**
   * Loads credits from a succeeded PaymentIntent once (idempotent). Used by webhooks
   * and by the client after return_url redirect when webhooks are unavailable or delayed.
   */
  async fulfillCreditsIfNeeded(
    paymentIntentId: string,
    options?: {
      fallbackMetadata?: Record<string, string>;
      assertUserId?: string;
    },
  ): Promise<{ applied: boolean; reason: 'ok' | 'not_succeeded' | 'not_credits' | 'forbidden' }> {
    const stripe = this.getStripe();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== 'succeeded') {
      return { applied: false, reason: 'not_succeeded' };
    }
    const merged: Record<string, string> = {
      ...(options?.fallbackMetadata ?? {}),
      ...(pi.metadata ?? {}),
    };
    if (
      merged.type !== 'credits' ||
      !merged.user_id ||
      merged.credits === undefined
    ) {
      return { applied: false, reason: 'not_credits' };
    }
    if (
      options?.assertUserId &&
      merged.user_id !== options.assertUserId
    ) {
      throw new ForbiddenException('Platba nepatrí tomuto účtu.');
    }
    const addCredits = parseInt(String(merged.credits), 10) || 0;
    if (addCredits < 1) {
      return { applied: false, reason: 'not_credits' };
    }
    const packValid = await this.validateCreditPackForPaymentIntent(
      pi,
      addCredits,
    );
    if (!packValid) {
      this.logger.warn(
        `Credit pack amount mismatch for PI ${pi.id}: credits=${addCredits} amount=${pi.amount_received ?? pi.amount}`,
      );
      return { applied: false, reason: 'not_credits' };
    }
    // Bind the PaymentIntent's Stripe Customer to the user we're about to
    // credit. Without this check, anyone who can reach `confirm-credits` for
    // a payment they didn't make (or who can influence metadata.user_id via a
    // legacy code path) could redirect fulfillment to their own account. The
    // metadata is server-controlled in normal flows; this is defense in depth
    // when other invariants break.
    const piCustomer =
      typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null;
    const customerMismatch = await this.assertPaymentIntentCustomerForUser(
      pi.id,
      merged.user_id,
      piCustomer,
    );
    if (customerMismatch) {
      this.logger.warn(
        `Stripe customer mismatch for PI ${pi.id}: pi.customer=${piCustomer ?? 'null'} user=${merged.user_id}`,
      );
      throw new ForbiddenException('Platba nepatrí tomuto účtu.');
    }
    const supabase = this.supabaseService.getClient();
    // Claim fulfillment row before grant_credits — duplicate webhook/redirect cannot double-grant.
    const { error: insertErr } = await supabase
      .from('stripe_credit_fulfillments')
      .insert({
        payment_intent_id: pi.id,
        user_id: merged.user_id,
        credits: addCredits,
      });
    if (insertErr) {
      if (insertErr.code === '23505') {
        const alreadyFulfilled = await this.isCreditFulfillmentComplete(
          pi.id,
          merged.user_id,
          addCredits,
        );
        if (alreadyFulfilled) {
          try {
            await this.createPaidSkInvoiceForCreditPayment(pi, merged);
          } catch (err) {
            this.logger.error(
              `createPaidSkInvoiceForCreditPayment retry failed for PI ${pi.id}: ${String(err)}`,
            );
          }
          return { applied: true, reason: 'ok' };
        }
        this.logger.warn(
          `Fulfillment row exists for PI ${pi.id} but grant incomplete or mismatched`,
        );
        throw new ForbiddenException(
          'Platbu sa nepodarilo dokončiť. Kontaktujte podporu.',
        );
      }
      throw new ServiceUnavailableException(insertErr.message);
    }
    await this.audit.recordAuditEvent({
      actorUserId: merged.user_id,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'credits.purchase',
      subjectType: 'payment_intent',
      subjectId: null,
      payload: {
        payment_intent_id: pi.id,
        credits_added: addCredits,
        currency: pi.currency,
        amount_received_cents: pi.amount_received ?? pi.amount,
      },
    });
    if (piCustomer) {
      await this.persistStripeCustomerId(merged.user_id, piCustomer);
    }

    await this.credits.grant(merged.user_id, addCredits, {
      reason: 'credit_package_purchase',
      source: 'purchase',
      paymentIntentId: pi.id,
      refType: 'payment_intent',
      refId: pi.id,
    });
    try {
      await this.createPaidSkInvoiceForCreditPayment(pi, merged);
    } catch (err) {
      this.logger.error(
        `createPaidSkInvoiceForCreditPayment failed for PI ${pi.id}: ${String(err)}`,
      );
    }
    return { applied: true, reason: 'ok' };
  }

  /**
   * Cancels an active Stripe subscription before the auth user is removed.
   * If Stripe is not configured, logs a warning and skips (e.g. local dev).
   * API errors fail closed so billing is not left dangling when Stripe is available.
   */
  async cancelStripeSubscriptionBeforeAccountDeletion(
    userId: string,
  ): Promise<void> {
    const { data: row, error } = await this.supabaseService
      .getClient()
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      this.logger.warn(
        `user_subscriptions select failed before account deletion: ${error.message}`,
      );
      return;
    }
    const subId = (
      row as { stripe_subscription_id?: string | null } | null
    )?.stripe_subscription_id?.trim();
    if (!subId) {
      return;
    }
    if (!this.stripe) {
      this.logger.warn(
        `Stripe not configured; cannot cancel subscription ${subId} for user ${userId}`,
      );
      return;
    }
    try {
      await this.getStripe().subscriptions.cancel(subId);
    } catch (err: unknown) {
      if (this.isStripeSubscriptionMissing(err)) {
        await this.downgradeUserSubscriptionToFree(userId);
        return;
      }
      this.logger.error(
        `Stripe subscription cancel failed for user ${userId}: ${String(err)}`,
      );
      throw new ServiceUnavailableException(
        'Nepodarilo sa zrušiť predplatné pred zmazaním účtu. Skúste znova alebo kontaktujte podporu.',
      );
    }
  }

  private paymentMethodToSummary(
    pm: PaymentMethod | string | null | undefined,
  ): PaymentMethodSummaryDto | null {
    if (!pm || typeof pm === 'string') {
      return null;
    }
    if (pm.type !== 'card' || !pm.card) {
      return null;
    }
    return {
      brand: pm.card.brand,
      last4: pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year,
    };
  }

  async getPaymentMethodForUser(userId: string): Promise<{
    payment_method: PaymentMethodSummaryDto | null;
    stripe_customer_linked: boolean;
  }> {
    const customerId = await this.resolveStripeCustomerId(userId);
    if (!customerId) {
      return { payment_method: null, stripe_customer_linked: false };
    }
    const payment_method = await this.getDefaultPaymentMethodSummary(
      customerId,
      userId,
    );
    return { payment_method, stripe_customer_linked: true };
  }

  private async getDefaultPaymentMethodSummary(
    customerId: string,
    userId: string,
  ): Promise<PaymentMethodSummaryDto | null> {
    const stripe = this.getStripe();
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ['invoice_settings.default_payment_method'],
    });
    if (customer.deleted) {
      return null;
    }
    let pm = customer.invoice_settings?.default_payment_method;
    if (typeof pm === 'string') {
      pm = await stripe.paymentMethods.retrieve(pm);
    }
    const fromCustomer = this.paymentMethodToSummary(pm);
    if (fromCustomer) {
      return fromCustomer;
    }

    const supabase = this.supabaseService.getClient();
    const { data: subRow } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();
    const subId = (
      subRow as { stripe_subscription_id?: string | null } | null
    )?.stripe_subscription_id?.trim();
    if (!subId) {
      return null;
    }
    try {
      const sub = await stripe.subscriptions.retrieve(subId, {
        expand: ['default_payment_method'],
      });
      return this.paymentMethodToSummary(sub.default_payment_method);
    } catch {
      return null;
    }
  }

  async createPaymentMethodSetupIntent(
    userId: string,
    email: string,
  ): Promise<{ client_secret: string }> {
    const customerId =
      (await this.resolveStripeCustomerId(userId)) ??
      (await this.ensureStripeCustomer(userId, email));
    const si = await this.getStripe().setupIntents.create({
      customer: customerId,
      usage: 'off_session',
      payment_method_types: buildSkCardPaymentIntentTypes(),
    });
    if (!si.client_secret) {
      throw new ServiceUnavailableException('SetupIntent client_secret missing');
    }
    return { client_secret: si.client_secret };
  }

  async setDefaultPaymentMethodFromSetupIntent(
    userId: string,
    setupIntentId: string,
  ): Promise<{ payment_method: PaymentMethodSummaryDto | null }> {
    const trimmedId = setupIntentId.trim();
    if (!trimmedId.startsWith('seti_')) {
      throw new BadRequestException('Neplatný identifikátor platobnej metódy.');
    }
    const customerId = await this.resolveStripeCustomerId(userId);
    if (!customerId) {
      throw new BadRequestException(STRIPE_CUSTOMER_REQUIRED_MSG);
    }

    const stripe = this.getStripe();
    const si = await stripe.setupIntents.retrieve(trimmedId, {
      expand: ['payment_method'],
    });
    if (si.status !== 'succeeded') {
      throw new BadRequestException(
        'Platobná metóda nebola úspešne uložená. Skúste znova.',
      );
    }
    const siCustomer =
      typeof si.customer === 'string' ? si.customer : si.customer?.id;
    if (!siCustomer || siCustomer !== customerId) {
      throw new ForbiddenException('Platobná metóda nepatrí k tomuto účtu.');
    }

    const pmId =
      typeof si.payment_method === 'string'
        ? si.payment_method
        : si.payment_method?.id;
    if (!pmId) {
      throw new BadRequestException(
        'Platobná metóda nebola nájdená. Skúste znova.',
      );
    }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pmId },
    });

    const supabase = this.supabaseService.getClient();
    const { data: subRow } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();
    const subId = (
      subRow as { stripe_subscription_id?: string | null } | null
    )?.stripe_subscription_id?.trim();
    if (subId) {
      try {
        await stripe.subscriptions.update(subId, {
          default_payment_method: pmId,
        });
      } catch (err) {
        this.logger.warn(
          `subscription default_payment_method update failed for ${userId}: ${String(err)}`,
        );
      }
    }

    const pm = await stripe.paymentMethods.retrieve(pmId);
    const payment_method = this.paymentMethodToSummary(pm);

    await this.audit.recordAuditEvent({
      actorUserId: userId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'billing.payment_method_updated',
      subjectType: 'stripe_customer',
      subjectId: customerId,
      payload: {
        setup_intent_id: trimmedId,
        brand: payment_method?.brand ?? null,
        last4: payment_method?.last4 ?? null,
      },
    });

    return { payment_method };
  }

  /** Undo scheduled cancel — subscription continues renewing. */
  async resumeUserSubscription(userId: string): Promise<{
    resumed: boolean;
    cancel_at_period_end?: boolean;
    current_period_end?: string | null;
  }> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('user_subscriptions')
      .select(
        'stripe_subscription_id, cancel_at_period_end, current_period_end',
      )
      .eq('user_id', userId)
      .maybeSingle();
    const row = data as {
      stripe_subscription_id?: string | null;
      cancel_at_period_end?: boolean;
      current_period_end?: string | null;
    } | null;
    const subId = row?.stripe_subscription_id?.trim();
    if (!subId) {
      return { resumed: false };
    }

    try {
      const existing = await this.getStripe().subscriptions.retrieve(subId);
      if (existing.status === 'canceled') {
        throw new BadRequestException(
          'Predplatné už bolo ukončené. Vyberte nový plán v cenníku.',
        );
      }
      if (!existing.cancel_at_period_end) {
        await supabase
          .from('user_subscriptions')
          .update({ cancel_at_period_end: false })
          .eq('user_id', userId);
        return {
          resumed: true,
          cancel_at_period_end: false,
          current_period_end: row?.current_period_end ?? null,
        };
      }

      const updated = await this.getStripe().subscriptions.update(subId, {
        cancel_at_period_end: false,
      });
      const periodEnd = getSubscriptionCurrentPeriodEndIso(updated);
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: false,
          current_period_end: periodEnd,
          status: updated.status ?? 'active',
        })
        .eq('user_id', userId);
      if (error) {
        this.logger.warn(
          `resume subscription DB sync failed for ${userId}: ${error.message}`,
        );
      }

      await this.audit.recordAuditEvent({
        actorUserId: userId,
        actorIp: null,
        actorUserAgent: null,
        sessionId: null,
        deviceId: null,
        eventType: 'subscription.resumed_by_user',
        subjectType: 'user_subscription',
        subjectId: userId,
        payload: {
          stripe_subscription_id: subId,
          cancel_at_period_end: false,
          current_period_end: periodEnd,
        },
      });

      return {
        resumed: true,
        cancel_at_period_end: false,
        current_period_end: periodEnd,
      };
    } catch (err: unknown) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      if (this.isStripeSubscriptionMissing(err)) {
        await this.downgradeUserSubscriptionToFree(userId);
        throw new BadRequestException(
          'Predplatné v Stripe už neexistuje. Vyberte plán v cenníku.',
        );
      }
      this.logger.error(
        `resumeUserSubscription failed for ${userId}: ${String(err)}`,
      );
      throw new ServiceUnavailableException(
        'Nepodarilo sa obnoviť predplatné. Skúste znova alebo kontaktujte podporu.',
      );
    }
  }

  private formatStripeAddress(
    addr: Address | null | undefined,
  ): string | null {
    if (!addr) {
      return null;
    }
    const parts = [
      addr.line1,
      addr.line2,
      [addr.postal_code, addr.city].filter(Boolean).join(' '),
      addr.country,
    ].filter((p) => typeof p === 'string' && p.trim());
    const joined = parts.map((p) => String(p).trim()).filter(Boolean);
    return joined.length > 0 ? joined.join(', ') : null;
  }

  async getCustomerInvoiceDetail(
    userId: string,
    invoiceId: string,
  ): Promise<InvoiceDetailDto> {
    const trimmedId = invoiceId.trim();
    if (!trimmedId.startsWith('in_')) {
      throw new BadRequestException('Neplatný identifikátor faktúry.');
    }

    const customerId = await this.resolveStripeCustomerId(userId);
    if (!customerId) {
      throw new NotFoundException('Faktúra nebola nájdená.');
    }

    const stripe = this.getStripe();
    let invoice: Invoice;
    try {
      invoice = await stripe.invoices.retrieve(trimmedId, {
        expand: ['payments.data.payment.payment_intent'],
      });
    } catch (err: unknown) {
      const e = err as StripeError;
      if (e?.code === 'resource_missing' || e?.statusCode === 404) {
        throw new NotFoundException('Faktúra nebola nájdená.');
      }
      this.logger.warn(
        `invoices.retrieve failed for ${trimmedId}: ${String(err)}`,
      );
      throw new ServiceUnavailableException(
        'Nepodarilo sa načítať faktúru. Skúste znova neskôr.',
      );
    }

    if (!this.isVisibleCustomerInvoice(invoice)) {
      throw new NotFoundException('Faktúra nebola nájdená.');
    }

    const invCustomer =
      typeof invoice.customer === 'string'
        ? invoice.customer
        : invoice.customer?.id;
    if (!invCustomer || invCustomer !== customerId) {
      throw new ForbiddenException('Nemáte prístup k tejto faktúre.');
    }

    const envSupplier = getBillingInvoiceSupplier(this.config);
    const supplier: BillingInvoiceSupplierDto = envSupplier.configured
      ? envSupplier
      : {
          name: invoice.account_name?.trim() || envSupplier.name,
          address: envSupplier.address,
          ico: envSupplier.ico,
          dic: envSupplier.dic,
          vat: envSupplier.vat,
          or: envSupplier.or,
          configured: false,
        };

    const productType = this.resolveInvoiceProductType(invoice);

    const customFields = filterStripeInvoiceCustomFields(
      (invoice.custom_fields ?? [])
        .filter(
          (f): f is { name: string; value: string } =>
            Boolean(f?.name?.trim() && f?.value?.trim()),
        )
        .map((f) => ({ name: f.name.trim(), value: f.value.trim() })),
    );

    let lineRows: InvoiceLineItem[] = [];
    try {
      const listed = await stripe.invoices.listLineItems(trimmedId, {
        limit: 100,
      });
      lineRows = listed.data;
    } catch (err) {
      this.logger.warn(
        `invoices.listLineItems failed for ${trimmedId}: ${String(err)}`,
      );
      lineRows = invoice.lines?.data ?? [];
    }

    const lines: InvoiceDetailLineDto[] = lineRows.map((line) => ({
      description: line.description?.trim() || 'Položka',
      quantity: line.quantity ?? null,
      unit: getSkInvoiceLineUnit(productType),
      amount: line.amount ?? 0,
      currency: line.currency ?? invoice.currency ?? 'eur',
    }));

    const subscriptionPeriod =
      productType === 'subscription'
        ? this.extractSubscriptionPeriod(invoice, lineRows)
        : null;

    const piRef = getInvoicePaymentIntentRef(invoice);
    const pi =
      piRef && typeof piRef !== 'string'
        ? piRef
        : piRef
          ? await stripe.paymentIntents.retrieve(piRef)
          : null;
    let clientSecret: string | null = getInvoicePaymentIntentClientSecret(invoice);
    if (
      this.isPayableSubscriptionInvoice(invoice) &&
      pi &&
      (pi.status === 'requires_payment_method' ||
        pi.status === 'requires_confirmation' ||
        pi.status === 'requires_action')
    ) {
      clientSecret = pi.client_secret ?? clientSecret;
    } else {
      clientSecret = null;
    }

    const tax = getInvoiceTaxAmount(invoice);

    const createdTs =
      invoice.created ??
      invoice.status_transitions?.finalized_at ??
      invoice.status_transitions?.paid_at ??
      0;
    const issuedAt =
      invoice.status_transitions?.finalized_at ?? createdTs;
    const deliveryAt =
      invoice.status_transitions?.paid_at ??
      invoice.status_transitions?.finalized_at ??
      createdTs;

    return {
      id: invoice.id,
      number: invoice.number ?? null,
      status: invoice.status,
      created: createdTs,
      due_date: invoice.due_date ?? null,
      issued_at: issuedAt,
      delivery_at: deliveryAt,
      variable_symbol: invoice.number?.trim() || null,
      constant_symbol: null,
      payment_method_label: SK_INVOICE_PAYMENT_METHOD_LABEL,
      currency: invoice.currency ?? 'eur',
      subtotal: invoice.subtotal ?? 0,
      tax,
      total: invoice.total ?? 0,
      amount_due: invoice.amount_due ?? 0,
      amount_paid: invoice.amount_paid ?? 0,
      lines,
      customer: {
        name: invoice.customer_name ?? null,
        email: invoice.customer_email ?? null,
        address: this.formatStripeAddress(invoice.customer_address),
        custom_fields: customFields,
      },
      supplier,
      footer: invoice.footer?.trim() || buildSkInvoiceFooter(
        productType,
        this.config,
        subscriptionPeriod,
      ),
      product_type: productType,
      note: getSkInvoiceNote(productType),
      subscription_period: subscriptionPeriod,
      invoice_pdf: invoice.invoice_pdf ?? null,
      can_pay: Boolean(clientSecret),
      payment_intent_client_secret: clientSecret,
    };
  }

  async listCustomerInvoices(
    customerId: string,
    limit = 24,
  ): Promise<
    Array<{
      id: string;
      number: string | null;
      created: number;
      amount_paid: number;
      total: number;
      currency: string;
      status: string | null;
      invoice_pdf: string | null;
      hosted_invoice_url: string | null;
    }>
  > {
    const stripe = this.getStripe();
    const cap = Math.min(limit, 100);
    const [paidList, openList] = await Promise.all([
      stripe.invoices.list({ customer: customerId, status: 'paid', limit: cap }),
      stripe.invoices.list({ customer: customerId, status: 'open', limit: 20 }),
    ]);
    const merged = [...openList.data, ...paidList.data]
      .filter((inv) => this.isVisibleCustomerInvoice(inv))
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
      .slice(0, Math.min(limit, 24));
    return merged.map((inv) => ({
        id: inv.id,
        number: inv.number ?? null,
        created: inv.created,
        amount_paid: inv.amount_paid ?? 0,
        total: inv.total ?? inv.amount_due ?? 0,
        currency: inv.currency,
        status: inv.status,
        invoice_pdf: inv.invoice_pdf ?? null,
        hosted_invoice_url: inv.hosted_invoice_url ?? null,
      }));
  }

  /** Immediate cancel — checkout/plan switch and account deletion only. */
  async cancelUserSubscriptionImmediately(
    userId: string,
  ): Promise<{ canceled: boolean }> {
    const { data } = await this.supabaseService
      .getClient()
      .from('user_subscriptions')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .maybeSingle();
    const subId = (
      data as { stripe_subscription_id?: string | null } | null
    )?.stripe_subscription_id?.trim();
    if (!subId) {
      return { canceled: false };
    }
    try {
      await this.getStripe().subscriptions.cancel(subId);
    } catch (err: unknown) {
      if (this.isStripeSubscriptionMissing(err)) {
        await this.downgradeUserSubscriptionToFree(userId);
        return { canceled: true };
      }
      throw err;
    }
    return { canceled: true };
  }

  /** User-initiated cancel — access until current_period_end. */
  async cancelUserSubscriptionAtPeriodEnd(
    userId: string,
    feedback: SubscriptionCancelFeedbackInput,
  ): Promise<{
    canceled: boolean;
    cancel_at_period_end?: boolean;
    current_period_end?: string | null;
  }> {
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('user_subscriptions')
      .select('stripe_subscription_id, cancel_at_period_end, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();
    const row = data as {
      stripe_subscription_id?: string | null;
      cancel_at_period_end?: boolean;
      current_period_end?: string | null;
    } | null;
    const subId = row?.stripe_subscription_id?.trim();
    if (!subId) {
      return this.cancelPaidPlanWithoutStripeSubscription(
        userId,
        row?.current_period_end ?? null,
        feedback,
      );
    }
    if (row?.cancel_at_period_end) {
      return {
        canceled: true,
        cancel_at_period_end: true,
        current_period_end: row.current_period_end ?? null,
      };
    }
    try {
      const existing = await this.getStripe().subscriptions.retrieve(subId);
      if (
        existing.status === 'incomplete' ||
        existing.status === 'incomplete_expired'
      ) {
        return this.cancelIncompleteStripeSubscription(
          userId,
          subId,
          feedback,
        );
      }
      if (existing.status === 'canceled') {
        const periodEndIso = getSubscriptionCurrentPeriodEndIso(existing);
        const reconciled = await this.markCancelAtPeriodEndLocally(
          userId,
          periodEndIso,
        );
        if (reconciled) {
          await this.recordSubscriptionCancelFeedback(userId, subId, feedback, {
            cancel_at_period_end: true,
            current_period_end: periodEndIso,
          });
          return {
            canceled: true,
            cancel_at_period_end: true,
            current_period_end: periodEndIso,
          };
        }
        await this.downgradeUserSubscriptionToFree(userId);
        await this.recordSubscriptionCancelFeedback(userId, subId, feedback, {
          cancel_at_period_end: false,
          current_period_end: null,
        });
        return {
          canceled: true,
          cancel_at_period_end: false,
          current_period_end: null,
        };
      }
      if (existing.cancel_at_period_end) {
        const periodEnd = getSubscriptionCurrentPeriodEndIso(existing);
        await supabase
          .from('user_subscriptions')
          .update({
            cancel_at_period_end: true,
            current_period_end: periodEnd,
            status: existing.status ?? 'active',
          })
          .eq('user_id', userId);
        await this.recordSubscriptionCancelFeedback(userId, subId, feedback, {
          cancel_at_period_end: true,
          current_period_end: periodEnd,
        });
        return {
          canceled: true,
          cancel_at_period_end: true,
          current_period_end: periodEnd,
        };
      }
      const existingMeta = (existing.metadata ?? {}) as Record<string, string>;
      const reasonDetail = feedback.reason_detail?.trim().slice(0, 500) || '';
      const updated = await this.getStripe().subscriptions.update(subId, {
        cancel_at_period_end: true,
        metadata: {
          ...existingMeta,
          cancel_reason_code: feedback.reason_code,
          ...(reasonDetail ? { cancel_reason_detail: reasonDetail } : {}),
        },
      });
      const periodEnd = getSubscriptionCurrentPeriodEndIso(updated);
      const { error } = await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: true,
          current_period_end: periodEnd,
          status: updated.status ?? 'active',
        })
        .eq('user_id', userId);
      if (error) {
        this.logger.warn(
          `cancel_at_period_end DB sync failed for ${userId}: ${error.message}`,
        );
      }
      await this.recordSubscriptionCancelFeedback(userId, subId, feedback, {
        cancel_at_period_end: true,
        current_period_end: periodEnd,
      });
      return {
        canceled: true,
        cancel_at_period_end: true,
        current_period_end: periodEnd,
      };
    } catch (err: unknown) {
      if (this.isStripeSubscriptionMissing(err)) {
        this.logger.warn(
          `Stripe subscription ${subId} missing for user ${userId}; reconciling local state`,
        );
        const reconciled = await this.markCancelAtPeriodEndLocally(
          userId,
          row?.current_period_end ?? null,
        );
        if (reconciled) {
          await this.recordSubscriptionCancelFeedback(userId, subId, feedback, {
            cancel_at_period_end: true,
            current_period_end: row?.current_period_end ?? null,
          });
          return {
            canceled: true,
            cancel_at_period_end: true,
            current_period_end: row?.current_period_end ?? null,
          };
        }
        await this.downgradeUserSubscriptionToFree(userId);
        await this.recordSubscriptionCancelFeedback(userId, subId, feedback, {
          cancel_at_period_end: false,
          current_period_end: null,
        });
        return {
          canceled: true,
          cancel_at_period_end: false,
          current_period_end: null,
        };
      }
      this.logger.error(
        `cancelUserSubscriptionAtPeriodEnd failed for ${userId}: ${String(err)}`,
      );
      throw new ServiceUnavailableException(
        'Nepodarilo sa zrušiť predplatné. Skúste znova alebo kontaktujte podporu.',
      );
    }
  }

  /**
   * Incomplete checkouts cannot use cancel_at_period_end — cancel in Stripe and
   * clear local paid plan so the user can subscribe again.
   */
  private async cancelIncompleteStripeSubscription(
    userId: string,
    subId: string,
    feedback: SubscriptionCancelFeedbackInput,
  ): Promise<{
    canceled: boolean;
    cancel_at_period_end?: boolean;
    current_period_end?: string | null;
  }> {
    await this.voidSubscriptionOpenInvoice(subId);
    try {
      await this.getStripe().subscriptions.cancel(subId);
    } catch (err: unknown) {
      if (!this.isStripeSubscriptionMissing(err)) {
        throw err;
      }
    }
    await this.downgradeUserSubscriptionToFree(userId);
    await this.recordSubscriptionCancelFeedback(userId, subId, feedback, {
      cancel_at_period_end: false,
      current_period_end: null,
    });
    return {
      canceled: true,
      cancel_at_period_end: false,
      current_period_end: null,
    };
  }

  /** Paid plan in DB without Stripe subscription id (dev / webhook drift). */
  private async cancelPaidPlanWithoutStripeSubscription(
    userId: string,
    currentPeriodEnd: string | null,
    feedback: SubscriptionCancelFeedbackInput,
  ): Promise<{
    canceled: boolean;
    cancel_at_period_end?: boolean;
    current_period_end?: string | null;
  }> {
    const kept = await this.markCancelAtPeriodEndLocally(
      userId,
      currentPeriodEnd,
    );
    if (kept) {
      await this.recordSubscriptionCancelFeedback(userId, null, feedback, {
        cancel_at_period_end: true,
        current_period_end: currentPeriodEnd,
      });
      return {
        canceled: true,
        cancel_at_period_end: true,
        current_period_end: currentPeriodEnd,
      };
    }
    await this.downgradeUserSubscriptionToFree(userId);
    await this.recordSubscriptionCancelFeedback(userId, null, feedback, {
      cancel_at_period_end: false,
      current_period_end: null,
    });
    return {
      canceled: true,
      cancel_at_period_end: false,
      current_period_end: null,
    };
  }

  private async recordSubscriptionCancelFeedback(
    userId: string,
    stripeSubscriptionId: string | null,
    feedback: SubscriptionCancelFeedbackInput,
    outcome: {
      cancel_at_period_end: boolean;
      current_period_end: string | null;
    },
  ): Promise<void> {
    const reasonDetail = feedback.reason_detail?.trim().slice(0, 500) || null;
    await this.audit.recordAuditEvent({
      actorUserId: userId,
      actorIp: null,
      actorUserAgent: null,
      sessionId: null,
      deviceId: null,
      eventType: 'subscription.canceled_by_user',
      subjectType: 'user_subscription',
      subjectId: userId,
      payload: {
        reason_code: feedback.reason_code,
        reason_detail: reasonDetail,
        stripe_subscription_id: stripeSubscriptionId,
        cancel_at_period_end: outcome.cancel_at_period_end,
        current_period_end: outcome.current_period_end,
      },
    });
  }

  private isStripeSubscriptionMissing(err: unknown): boolean {
    const e = err as StripeError;
    if (e?.code === 'resource_missing' || e?.statusCode === 404) {
      return true;
    }
    const msg = (e?.message ?? (err instanceof Error ? err.message : String(err)))
      .toLowerCase();
    return msg.includes('no such subscription');
  }

  /**
   * Sync `user_subscriptions` with Stripe before billing UI reads entitlements.
   * Fixes stale plan/status when webhooks were missed or subscription IDs drifted.
   */
  async reconcileUserSubscription(userId: string): Promise<void> {
    if (!this.stripe) {
      return;
    }
    const supabase = this.supabaseService.getClient();
    const { data } = await supabase
      .from('user_subscriptions')
      .select(
        'plan_id, stripe_subscription_id, cancel_at_period_end, current_period_end, status',
      )
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) {
      return;
    }
    const row = data as {
      plan_id: string;
      stripe_subscription_id?: string | null;
      cancel_at_period_end?: boolean;
      current_period_end?: string | null;
      status?: string;
    };
    const subId = row.stripe_subscription_id?.trim();
    if (!subId) {
      await this.reconcileOrphanPaidPlan(userId, row);
      return;
    }
    try {
      const sub = await this.getStripe().subscriptions.retrieve(subId);
      if (sub.status === 'canceled') {
        const periodEndIso = getSubscriptionCurrentPeriodEndIso(sub);
        const kept = await this.markCancelAtPeriodEndLocally(
          userId,
          periodEndIso,
        );
        if (!kept) {
          await this.downgradeUserSubscriptionToFree(userId);
        }
        return;
      }
      const periodEnd = getSubscriptionCurrentPeriodEndIso(sub);
      await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
          current_period_end: periodEnd,
          status: sub.status ?? row.status ?? 'active',
        })
        .eq('user_id', userId);
    } catch (err: unknown) {
      if (this.isStripeSubscriptionMissing(err)) {
        this.logger.warn(
          `reconcileUserSubscription: Stripe subscription ${subId} missing for ${userId}; leaving local row unchanged`,
        );
      }
    }
  }

  private async reconcileOrphanPaidPlan(
    userId: string,
    row: {
      plan_id: string;
      cancel_at_period_end?: boolean;
      current_period_end?: string | null;
    },
  ): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('price_monthly_cents')
      .eq('id', row.plan_id)
      .maybeSingle();
    if (((plan as { price_monthly_cents?: number } | null)?.price_monthly_cents ?? 0) < 1) {
      return;
    }
    if (row.cancel_at_period_end && row.current_period_end) {
      const endMs = new Date(row.current_period_end).getTime();
      if (endMs > Date.now()) {
        return;
      }
    }
    const kept = await this.markCancelAtPeriodEndLocally(
      userId,
      row.current_period_end ?? null,
    );
    if (!kept) {
      await this.downgradeUserSubscriptionToFree(userId);
    }
  }

  /** Keep paid access locally until period end when Stripe is unreachable or already canceled. */
  private async markCancelAtPeriodEndLocally(
    userId: string,
    currentPeriodEnd: string | null,
  ): Promise<boolean> {
    if (!currentPeriodEnd) {
      return false;
    }
    const endMs = new Date(currentPeriodEnd).getTime();
    if (!Number.isFinite(endMs) || endMs <= Date.now()) {
      return false;
    }
    const { error } = await this.supabaseService
      .getClient()
      .from('user_subscriptions')
      .update({
        cancel_at_period_end: true,
        current_period_end: currentPeriodEnd,
        status: 'active',
      })
      .eq('user_id', userId);
    if (error) {
      this.logger.warn(
        `markCancelAtPeriodEndLocally failed for ${userId}: ${error.message}`,
      );
      return false;
    }
    return true;
  }

  /** Clears a stale paid plan when Stripe subscription no longer exists. */
  private async downgradeUserSubscriptionToFree(userId: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    const { data: freePlan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('slug', 'zadarmo')
      .maybeSingle();
    const freeId = (freePlan as { id?: string } | null)?.id;
    if (!freeId) {
      this.logger.error(
        `downgradeUserSubscriptionToFree: subscription_plans slug zadarmo missing`,
      );
      return;
    }
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        plan_id: freeId,
        status: 'active',
        stripe_subscription_id: null,
        current_period_end: null,
        cancel_at_period_end: false,
      })
      .eq('user_id', userId);
    if (error) {
      this.logger.warn(
        `downgradeUserSubscriptionToFree failed for ${userId}: ${error.message}`,
      );
    }
  }

  /**
   * Pro-rated credit revocation on Stripe refund.
   *
   * Previously this revoked the *full* fulfillment credit total even for a
   * partial refund (e.g. 50% refund → 100% credits clawed back). With this
   * version the revoked amount is `floor(fulfillment.credits *
   * amount_refunded / charge.amount)` so partial refunds are mirrored
   * fairly. A full refund (`amount_refunded === amount`) keeps the previous
   * behaviour — all credits are revoked.
   *
   * Accounting policy when spent > remaining: `revoke_credits_for_payment_refund`
   * RPC currently skips revoke on insufficient balance and surfaces a
   * `payment_refund` ledger reversal for the amount it CAN claw back. Cases
   * where the customer already spent more than the refundable amount are
   * surfaced via the `credits.refund_revoke` audit event for manual ops
   * reconciliation rather than producing a negative balance.
   */
  async handleChargeRefunded(charge: Charge): Promise<void> {
    const piRef = charge.payment_intent;
    const piId =
      typeof piRef === 'string'
        ? piRef
        : piRef && typeof piRef === 'object' && 'id' in piRef
          ? (piRef as { id: string }).id
          : null;
    if (!piId) {
      return;
    }
    const supabase = this.supabaseService.getClient();
    const { data: fulfillment } = await supabase
      .from('stripe_credit_fulfillments')
      .select('user_id, credits')
      .eq('payment_intent_id', piId)
      .maybeSingle();
    if (!fulfillment) {
      return;
    }
    const row = fulfillment as { user_id: string; credits: number };
    const totalCharged = charge.amount ?? 0;
    const refunded = charge.amount_refunded ?? totalCharged;
    let creditsToRevoke = row.credits;
    if (
      Number.isFinite(totalCharged) &&
      Number.isFinite(refunded) &&
      totalCharged > 0 &&
      refunded > 0 &&
      refunded < totalCharged
    ) {
      const proRated = Math.floor((row.credits * refunded) / totalCharged);
      creditsToRevoke = Math.max(0, Math.min(row.credits, proRated));
    }
    if (creditsToRevoke <= 0) {
      this.logger.warn(
        `Refund for PI ${piId}: pro-rated revoke=0 (charge=${totalCharged}, refunded=${refunded}, fulfillment=${row.credits})`,
      );
      return;
    }
    await this.credits.revokeForPaymentRefund(
      row.user_id,
      piId,
      creditsToRevoke,
    );
  }

  /** Resolve JOBBIE user from a Stripe Invoice (subscription renewals, failed payments). */
  async resolveUserIdFromStripeInvoice(
    inv: Invoice,
  ): Promise<string | null> {
    const meta = (inv.metadata ?? {}) as Record<string, string>;
    const fromMeta = meta.user_id?.trim();
    if (fromMeta) {
      return fromMeta;
    }
    const subRef = getInvoiceSubscriptionRef(inv);
    const subId =
      typeof subRef === 'string' ? subRef.trim() : subRef?.id?.trim();
    if (subId) {
      const { data: row } = await this.supabaseService
        .getClient()
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_subscription_id', subId)
        .maybeSingle();
      const userId = (row as { user_id?: string } | null)?.user_id?.trim();
      if (userId) {
        return userId;
      }
      const sub = await this.retrieveSubscription(subId);
      if (sub) {
        const subMeta = (sub.metadata ?? {}) as Record<string, string>;
        const uid = subMeta.user_id?.trim();
        if (uid) {
          return uid;
        }
      }
    }
    const customerRef = inv.customer;
    const customerId =
      typeof customerRef === 'string'
        ? customerRef.trim()
        : customerRef?.id?.trim();
    if (customerId) {
      const { data: row } = await this.supabaseService
        .getClient()
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();
      const userId = (row as { user_id?: string } | null)?.user_id?.trim();
      if (userId) {
        return userId;
      }
    }
    return null;
  }

  /**
   * Sync user_subscriptions.status from a subscription invoice event (past_due / active).
   */
  async syncSubscriptionStatusFromInvoice(
    inv: Invoice,
    status: 'past_due' | 'active',
  ): Promise<string | null> {
    const userId = await this.resolveUserIdFromStripeInvoice(inv);
    if (!userId) {
      return null;
    }
    const supabase = this.supabaseService.getClient();
    const { error } = await supabase
      .from('user_subscriptions')
      .update({ status })
      .eq('user_id', userId);
    if (error) {
      this.logger.warn(
        `syncSubscriptionStatusFromInvoice failed for ${userId}: ${error.message}`,
      );
    }
    return userId;
  }

  constructWebhookEvent(
    payload: Buffer | string,
    signature: string,
  ): Event {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('Webhook secret not configured');
    }
    return this.getStripe().webhooks.constructEvent(
      payload,
      signature,
      secret,
    );
  }
}
