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
const JOBBIE_STRIPE_PILL_RADIUS = '9999px'
const JOBBIE_STRIPE_OPTION_RADIUS = '10px'

const JOBBIE_STRIPE_FONT_FAMILY =
  '"DM Sans Variable", "DM Sans", ui-sans-serif, system-ui, sans-serif'

/** Shared field chrome aligned with `.addjob-input` and `AppFormDropdown` (h-14, pill, soft bg). */
const jobbieStripeFieldSurface = {
  backgroundColor: JOBBIE_STRIPE_INPUT_BACKGROUND,
  border: `1px solid ${JOBBIE_STRIPE_BORDER}`,
  borderRadius: JOBBIE_STRIPE_PILL_RADIUS,
  boxShadow: 'none',
  color: JOBBIE_STRIPE_TEXT,
  fontSize: '18px',
  lineHeight: '24px',
  padding: '15px 20px',
} as const

const jobbieStripeFieldFocus = {
  borderColor: JOBBIE_STRIPE_GREEN,
  boxShadow: `0 0 0 2px ${JOBBIE_STRIPE_GREEN}`,
  outline: 'none',
} as const

const jobbieStripeLabel = {
  color: JOBBIE_STRIPE_TEXT,
  fontSize: '18px',
  fontWeight: '600',
  lineHeight: '1.25',
  marginBottom: '8px',
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
      borderRadius: JOBBIE_STRIPE_PILL_RADIUS,
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
      borderRadius: JOBBIE_STRIPE_PILL_RADIUS,
      spacingUnit: '4px',
      fontSizeBase: '18px',
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

export function buildJobbiePaymentElementOptions(
  purchaserType: 'individual' | 'company' | null,
): StripePaymentElementOptions {
  const isCompany = purchaserType === 'company'
  return {
    wallets: jobbieStripeWalletOptions,
    layout: {
      type: 'tabs',
      defaultCollapsed: false,
    },
    fields: {
      billingDetails: {
        name: isCompany ? 'never' : 'auto',
        email: 'auto',
        phone: 'auto',
        address: 'never',
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
