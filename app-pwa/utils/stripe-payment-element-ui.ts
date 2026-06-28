import type {
  Appearance,
  StripeElementLocale,
  StripeElementsOptionsClientSecret,
  StripeElementsOptionsMode,
  StripePaymentElementOptions,
} from '@stripe/stripe-js'

export type JobbieStripeAppearanceVariant = 'auth' | 'settings'

/** Tailwind `marketing.soft` — matches `.addjob-input` / `AppFormDropdown`. */
export const JOBBIE_STRIPE_INPUT_BACKGROUND = '#fafcfb'

const JOBBIE_STRIPE_MINT = '#f2faf4'
const JOBBIE_STRIPE_PANEL = '#cff0db'
const JOBBIE_STRIPE_GREEN = '#22c55e'
const JOBBIE_STRIPE_BORDER = 'rgba(0, 0, 0, 0.06)'
const JOBBIE_STRIPE_TEXT = '#000000'
const JOBBIE_STRIPE_TEXT_MUTED = 'rgba(0, 0, 0, 0.8)'
/** Normal rounded field corners — a pill/9999px radius made Stripe's accordion render as a giant circle. */
const JOBBIE_STRIPE_FIELD_RADIUS = '14px'
const JOBBIE_STRIPE_OPTION_RADIUS = '10px'

const JOBBIE_STRIPE_FONT_FAMILY =
  '"DM Sans Variable", "DM Sans", ui-sans-serif, system-ui, sans-serif'

/** Shared field chrome aligned with `.addjob-input` and `AppFormDropdown` (h-14, pill, soft bg). */
const jobbieStripeFieldSurface = {
  backgroundColor: JOBBIE_STRIPE_INPUT_BACKGROUND,
  border: `1px solid ${JOBBIE_STRIPE_BORDER}`,
  borderRadius: JOBBIE_STRIPE_FIELD_RADIUS,
  boxShadow: 'none',
  color: JOBBIE_STRIPE_TEXT,
  fontSize: '16px',
  lineHeight: '22px',
  padding: '12px 14px',
} as const

const jobbieStripeFieldFocus = {
  borderColor: JOBBIE_STRIPE_GREEN,
  boxShadow: `0 0 0 2px ${JOBBIE_STRIPE_GREEN}`,
  outline: 'none',
} as const

const jobbieStripeLabel = {
  color: JOBBIE_STRIPE_TEXT,
  fontSize: '15px',
  fontWeight: '600',
  lineHeight: '1.25',
  marginBottom: '6px',
} as const

function buildJobbieStripeAppearanceRules(): NonNullable<Appearance['rules']> {
  return {
    '.Label': jobbieStripeLabel,
    '.Label--invalid': {
      color: '#dc2626',
    },
    '.Input': {
      ...jobbieStripeFieldSurface,
    },
    '.Input:hover': {
      borderColor: JOBBIE_STRIPE_BORDER,
    },
    '.Input:focus': jobbieStripeFieldFocus,
    '.Input--invalid': {
      borderColor: '#dc2626',
      boxShadow: '0 0 0 2px #dc2626',
    },
    '.Input::placeholder': {
      color: 'rgba(0, 0, 0, 0.3)',
    },
    '.Dropdown': {
      ...jobbieStripeFieldSurface,
    },
    '.Dropdown:hover': {
      borderColor: JOBBIE_STRIPE_BORDER,
    },
    '.Dropdown:focus': jobbieStripeFieldFocus,
    '.DropdownItem': {
      backgroundColor: '#ffffff',
      borderRadius: JOBBIE_STRIPE_OPTION_RADIUS,
      color: JOBBIE_STRIPE_TEXT_MUTED,
      fontSize: '18px',
      lineHeight: '1.35',
      padding: '12px 16px',
    },
    '.DropdownItem--highlight': {
      backgroundColor: JOBBIE_STRIPE_MINT,
      color: JOBBIE_STRIPE_TEXT,
    },
    '.DropdownItem:active': {
      backgroundColor: JOBBIE_STRIPE_PANEL,
    },
    '.Tab': {
      backgroundColor: JOBBIE_STRIPE_INPUT_BACKGROUND,
      border: `1px solid ${JOBBIE_STRIPE_BORDER}`,
      borderRadius: JOBBIE_STRIPE_FIELD_RADIUS,
      boxShadow: 'none',
      color: JOBBIE_STRIPE_TEXT_MUTED,
      fontSize: '16px',
      fontWeight: '600',
      padding: '12px 18px',
    },
    '.Tab:hover': {
      backgroundColor: JOBBIE_STRIPE_MINT,
      color: JOBBIE_STRIPE_TEXT,
    },
    '.Tab--selected': {
      backgroundColor: JOBBIE_STRIPE_GREEN,
      borderColor: JOBBIE_STRIPE_GREEN,
      color: '#ffffff',
    },
    '.TabIcon--selected': {
      fill: '#ffffff',
    },
    '.TabLabel--selected': {
      color: '#ffffff',
    },
    '.PickerItem': {
      ...jobbieStripeFieldSurface,
      marginBottom: '8px',
    },
    '.PickerItem:hover': {
      backgroundColor: JOBBIE_STRIPE_MINT,
      borderColor: JOBBIE_STRIPE_BORDER,
    },
    '.PickerItem--selected': {
      backgroundColor: JOBBIE_STRIPE_PANEL,
      borderColor: JOBBIE_STRIPE_GREEN,
      color: JOBBIE_STRIPE_TEXT,
    },
    '.Block': {
      backgroundColor: 'transparent',
      border: 'none',
      boxShadow: 'none',
      padding: '0',
    },
    '.Error': {
      color: '#dc2626',
      fontSize: '14px',
      marginTop: '6px',
    },
    '.Text': {
      color: 'rgba(0, 0, 0, 0.55)',
      fontSize: '14px',
    },
  }
}

export function getJobbieStripeFonts(): NonNullable<
  StripeElementsOptionsClientSecret['fonts']
> {
  return []
}

export function getJobbieStripeAppearance(
  _variant: JobbieStripeAppearanceVariant,
): Appearance {
  return {
    theme: 'stripe',
    variables: {
      colorPrimary: JOBBIE_STRIPE_GREEN,
      colorBackground: JOBBIE_STRIPE_INPUT_BACKGROUND,
      colorText: JOBBIE_STRIPE_TEXT,
      colorDanger: '#dc2626',
      fontFamily: JOBBIE_STRIPE_FONT_FAMILY,
      borderRadius: JOBBIE_STRIPE_FIELD_RADIUS,
      spacingUnit: '4px',
      fontSizeBase: '16px',
      fontWeightNormal: '400',
      fontWeightMedium: '600',
      fontWeightBold: '700',
      gridRowSpacing: '16px',
    },
    rules: buildJobbieStripeAppearanceRules(),
  }
}

export const jobbieStripeWalletOptions = {
  applePay: 'auto',
  googlePay: 'auto',
} as const satisfies NonNullable<StripePaymentElementOptions['wallets']>

/** ISO country for Stripe when Payment Element `fields.billingDetails.address` is `never`. */
export const JOBBIE_STRIPE_BILLING_COUNTRY = 'SK'

/** Matches Nest invoice/subscription `payment_method_types: ['card']` — not automatic PM. */
export const JOBBIE_STRIPE_PAYMENT_METHOD_TYPES = ['card'] as const

export type JobbieStripeConfirmBillingInput = {
  name?: string | null
  address_line1?: string | null
  address_city?: string | null
  address_state?: string | null
  address_postal_code?: string | null
  address_country?: string | null
}

function resolveJobbieStripeBillingState(
  input?: JobbieStripeConfirmBillingInput | null,
): string | undefined {
  const explicit = input?.address_state?.trim()
  if (explicit) return explicit
  const city = input?.address_city?.trim()
  if (city) return city
  return undefined
}

/**
 * Payment Element opts out of address collection; pass billing details on confirm.
 * @see https://docs.stripe.com/payments/payment-element/control-billing-details-collection
 */
export function buildJobbiePaymentMethodConfirmData(
  input?: JobbieStripeConfirmBillingInput | null,
): {
  billing_details: {
    name?: string
    address: {
      country: string
      line1?: string
      city?: string
      state?: string
      postal_code?: string
    }
  }
} {
  const country = input?.address_country?.trim() || JOBBIE_STRIPE_BILLING_COUNTRY
  const address: {
    country: string
    line1?: string
    city?: string
    state?: string
    postal_code?: string
  } = { country }
  const line1 = input?.address_line1?.trim()
  const city = input?.address_city?.trim()
  const postal = input?.address_postal_code?.trim()
  if (line1) address.line1 = line1
  if (city) address.city = city
  if (postal) address.postal_code = postal
  const state = resolveJobbieStripeBillingState(input)
  if (state) {
    address.state = state
  } else if (line1 || city || postal) {
    // SK has no state field in our forms; Stripe requires state when hidden in Payment Element.
    address.state = city || JOBBIE_STRIPE_BILLING_COUNTRY
  }

  const billing_details: {
    name?: string
    address: typeof address
  } = { address }
  const name = input?.name?.trim()
  if (name) billing_details.name = name

  return { billing_details }
}

export type JobbiePaymentElementOptionsConfig = {
  /** Native form collects billing address (checkout); hide those fields in Payment Element. */
  collectAddressExternally?: boolean
}

export function buildJobbiePaymentElementOptions(
  purchaserType: 'individual' | 'company' | null,
  config?: JobbiePaymentElementOptionsConfig,
): StripePaymentElementOptions {
  const isCompany = purchaserType === 'company'
  const collectAddressExternally = config?.collectAddressExternally === true

  return {
    wallets: jobbieStripeWalletOptions,
    layout: {
      type: 'accordion',
      defaultCollapsed: false,
    },
    fields: {
      billingDetails: {
        name: isCompany ? 'never' : 'auto',
        email: 'auto',
        phone: 'auto',
        address: collectAddressExternally
          ? {
              line1: 'never',
              line2: 'never',
              city: 'never',
              postalCode: 'never',
              country: 'never',
              state: 'never',
            }
          : 'if_required',
      },
    },
  }
}

export function buildStripeElementsBaseOptions(
  variant: JobbieStripeAppearanceVariant,
  locale: StripeElementLocale,
): Pick<
  StripeElementsOptionsClientSecret,
  'locale' | 'appearance' | 'fonts'
> {
  return {
    locale,
    appearance: getJobbieStripeAppearance(variant),
    fonts: getJobbieStripeFonts(),
  }
}

export function buildDeferredPaymentElementsOptions(
  variant: JobbieStripeAppearanceVariant,
  locale: StripeElementLocale,
  amount: number,
  currency: string,
): StripeElementsOptionsMode {
  return {
    mode: 'payment',
    amount,
    currency: currency.toLowerCase(),
    paymentMethodTypes: [...JOBBIE_STRIPE_PAYMENT_METHOD_TYPES],
    ...buildStripeElementsBaseOptions(variant, locale),
  }
}

export function buildDeferredSetupElementsOptions(
  variant: JobbieStripeAppearanceVariant,
  locale: StripeElementLocale,
  currency: string,
): StripeElementsOptionsMode {
  return {
    mode: 'setup',
    currency: currency.toLowerCase(),
    paymentMethodTypes: [...JOBBIE_STRIPE_PAYMENT_METHOD_TYPES],
    ...buildStripeElementsBaseOptions(variant, locale),
  }
}

export function buildClientSecretElementsOptions(
  variant: JobbieStripeAppearanceVariant,
  locale: StripeElementLocale,
  clientSecret: string,
): StripeElementsOptionsClientSecret {
  return {
    clientSecret,
    ...buildStripeElementsBaseOptions(variant, locale),
  }
}

/** Wrapper class for Stripe mount nodes (spacing with native fields). */
export const jobbieStripeElementsMountClass = 'jobbie-stripe-elements w-full'
