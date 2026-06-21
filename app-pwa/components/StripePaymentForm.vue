<template>
  <div>
    <template v-if="collectBusinessBilling">
      <p class="mb-2 text-sm font-semibold text-black/70">
        {{ S.checkoutBuyerTypeLabel }}
      </p>
      <JaSegmentedToggle
        v-model="purchaserType"
        class="mb-4"
        :options="purchaserTypeOptions"
      />

      <div v-show="purchaserType === 'company'" class="mb-4 space-y-4">
        <div ref="taxIdRef" :class="[jobbieStripeElementsMountClass, 'min-h-[88px]']" />
        <div class="grid gap-3 sm:grid-cols-2">
          <div :class="fieldRowClass">
            <label :class="fieldLabelClass">
              {{ S.companyIdIco }}
            </label>
            <input
              v-model="registrationNumber"
              type="text"
              :class="fieldInputClass"
              autocomplete="off"
            >
          </div>
          <div :class="fieldRowClass">
            <label :class="fieldLabelClass">
              {{ S.taxIdDic }}
            </label>
            <input
              v-model="taxIdDic"
              type="text"
              :class="fieldInputClass"
              autocomplete="off"
            >
          </div>
        </div>
      </div>

      <div
        v-show="purchaserType === 'individual' || purchaserType === 'company'"
        class="mb-4 space-y-4"
        :class="purchaserType === 'company' ? 'border-t border-black/10 pt-4' : ''"
      >
        <div :class="fieldRowClass">
          <label :class="fieldLabelClass">
            {{ S.checkoutBillingAddressLine1 }}
          </label>
          <input
            v-model="addressLine1"
            type="text"
            :class="fieldInputClass"
            autocomplete="street-address"
          >
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div :class="fieldRowClass">
            <label :class="fieldLabelClass">
              {{ S.checkoutBillingCity }}
            </label>
            <input
              v-model="addressCity"
              type="text"
              :class="fieldInputClass"
              autocomplete="address-level2"
            >
          </div>
          <div :class="fieldRowClass">
            <label :class="fieldLabelClass">
              {{ S.checkoutBillingPostalCode }}
            </label>
            <input
              v-model="addressPostalCode"
              type="text"
              :class="fieldInputClass"
              autocomplete="postal-code"
            >
          </div>
        </div>
      </div>

      <label
        v-if="purchaserType === 'individual'"
        class="mb-4 flex cursor-pointer items-start gap-3 text-sm leading-snug text-black/70"
      >
        <input
          v-model="skResidenceAttestation"
          type="checkbox"
          class="mt-0.5 size-4 shrink-0 rounded border-black/20 text-marketing-green focus:ring-marketing-green"
        >
        <span>{{ S.checkoutSkResidenceAttestation }}</span>
      </label>
    </template>

    <div class="pb-2">
      <div ref="elementRef" :class="[jobbieStripeElementsMountClass, 'min-h-[200px]']" />
    </div>
    <p v-if="payError" class="mt-2 text-sm text-red-500">{{ payError }}</p>
    <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:gap-3">
      <button
        type="button"
        :class="primaryButtonClass"
        :disabled="paying"
        @click="handlePay"
      >
        {{ paying ? 'Spracovávam...' : 'Zaplatiť' }}
      </button>
      <button
        type="button"
        :class="secondaryButtonClass"
        :style="variant === 'legacy' ? { borderColor: 'var(--sand3)', color: 'var(--ink2)', background: 'var(--surface)' } : undefined"
        :disabled="paying"
        @click="$emit('cancel')"
      >
        Zrušiť
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StripeTaxIdElement } from '@stripe/stripe-js'
import {
  type CheckoutBillingPayload,
  type CheckoutPurchaserType,
  isValidSkIcoFormat,
} from '~/utils/checkout-billing'
import {
  formFieldLabelClass,
  formFieldRowClass,
  formTextInputClass,
} from '~/utils/form-field-ui'
import {
  buildClientSecretElementsOptions,
  buildDeferredPaymentElementsOptions,
  buildDeferredSetupElementsOptions,
  buildJobbiePaymentMethodConfirmData,
  buildJobbiePaymentElementOptions,
  jobbieStripeElementsMountClass,
  type JobbieStripeAppearanceVariant,
} from '~/utils/stripe-payment-element-ui'
import {
  isSetupIntentClientSecret,
  paymentIntentIdFromClientSecret,
  setupIntentIdFromClientSecret,
} from '~/utils/stripe-payment-intent'
import {
  normalizePreparePaymentResult,
  type PreparePaymentResult,
} from '~/utils/stripe-prepare-payment'
import { S } from '~/utils/strings'

const config = useRuntimeConfig().public
const stripePublishableKey = config.stripePublishableKey as string

const props = withDefaults(
  defineProps<{
    clientSecret?: string
    returnUrl: string
    variant?: 'legacy' | 'auth'
    locale?: string
    collectBusinessBilling?: boolean
    billingPrefill?: {
      company_name?: string | null
      registration_number?: string | null
      tax_id?: string | null
      vat_id?: string | null
      registered_office?: string | null
      billing_details?: { address?: string | null } | null
    } | null
    /** Catalog amount (minor units) for deferred checkout before PI exists. */
    deferredAmount?: number
    deferredCurrency?: string
    /** Deferred Elements mode — use `setup` for subscription trials (card save only). */
    deferredMode?: 'payment' | 'setup'
    preparePayment?: (
      billing?: CheckoutBillingPayload,
    ) => Promise<PreparePaymentResult | string | null>
    onPaymentSuccess?: (
      paymentIntentId?: string,
      billing?: CheckoutBillingPayload,
    ) => Promise<void> | void
  }>(),
  {
    clientSecret: '',
    variant: 'legacy',
    locale: 'sk',
    collectBusinessBilling: false,
    billingPrefill: null,
    deferredAmount: undefined,
    deferredCurrency: 'eur',
    deferredMode: 'payment',
  },
)

const appearanceVariant = computed(
  (): JobbieStripeAppearanceVariant =>
    props.variant === 'auth' ? 'auth' : 'settings',
)

const fieldLabelClass = formFieldLabelClass
const fieldRowClass = formFieldRowClass
const fieldInputClass = formTextInputClass

const primaryButtonClass = computed(() =>
  props.variant === 'auth'
    ? 'h-14 w-full cursor-pointer rounded-full border-none bg-marketing-green text-lg font-bold text-white transition-opacity duration-200 hover:opacity-[0.88] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1'
    : 'btn-green disabled:opacity-50 sm:flex-1',
)

const secondaryButtonClass = computed(() =>
  props.variant === 'auth'
    ? 'h-14 w-full cursor-pointer rounded-full border-[1.5px] border-black/15 bg-white text-lg font-semibold text-black/70 transition-opacity hover:opacity-80 disabled:opacity-50 sm:flex-1'
    : 'w-full rounded-lg border px-4 py-2 font-medium transition-colors disabled:opacity-50 sm:w-auto sm:flex-1',
)

const emit = defineEmits<{
  success: [paymentIntentId?: string, billing?: CheckoutBillingPayload]
  cancel: []
}>()

const elementRef = ref<HTMLDivElement | null>(null)
const taxIdRef = ref<HTMLDivElement | null>(null)
const paying = ref(false)
const payError = ref<string | null>(null)
const activeSecret = ref('')

const purchaserType = ref<CheckoutPurchaserType>('company')
const purchaserTypeOptions = [
  { value: 'individual', label: S.checkoutBuyerIndividual },
  { value: 'company', label: S.checkoutBuyerCompany },
] as const

const registrationNumber = ref('')
const taxIdDic = ref('')
const addressLine1 = ref('')
const addressCity = ref('')
const addressPostalCode = ref('')
const skResidenceAttestation = ref(false)

const usesCheckoutDeferred = computed(
  () =>
    typeof props.preparePayment === 'function' &&
    (props.deferredMode === 'setup' ||
      (typeof props.deferredAmount === 'number' && props.deferredAmount >= 1)),
)

let stripe: import('@stripe/stripe-js').Stripe | null = null
let elements: import('@stripe/stripe-js').StripeElements | null = null
let paymentElement: import('@stripe/stripe-js').StripePaymentElement | null = null
let taxIdElement: StripeTaxIdElement | null = null
let mountGeneration = 0

function stripeLocale(): import('@stripe/stripe-js').StripeElementLocale {
  return (props.locale?.trim() || 'sk') as import('@stripe/stripe-js').StripeElementLocale
}

function loadStripeBetas(): readonly ['elements_tax_id_1'] | undefined {
  return props.collectBusinessBilling ? (['elements_tax_id_1'] as const) : undefined
}

async function loadJobbieStripe(): Promise<import('@stripe/stripe-js').Stripe | null> {
  if (!stripePublishableKey) return null
  const betas = loadStripeBetas()
  const { loadStripe } = await import('@stripe/stripe-js')
  return loadStripe(stripePublishableKey, betas ? { betas: [...betas] } : undefined)
}

function applyBillingPrefill(): void {
  const p = props.billingPrefill
  if (!p) return
  registrationNumber.value = p.registration_number?.trim() ?? ''
  taxIdDic.value = p.tax_id?.trim() ?? ''
}

function mountTaxIdOnElements(generation: number): boolean {
  if (!props.collectBusinessBilling || !taxIdRef.value || !elements) {
    return true
  }
  taxIdElement?.unmount()
  taxIdElement = null
  applyBillingPrefill()
  taxIdElement = elements.create('taxId', {
    visibility: purchaserType.value === 'company' ? 'always' : 'never',
    fields: { businessName: 'always' },
    validation: {
      businessName: { required: 'auto' },
      taxId: { required: 'auto' },
    },
    defaultValues: {
      taxIdType: 'sk_vat',
      businessName: props.billingPrefill?.company_name?.trim() || undefined,
      taxId: props.billingPrefill?.vat_id?.trim() || undefined,
    },
  })
  if (generation !== mountGeneration) {
    taxIdElement.unmount()
    taxIdElement = null
    return false
  }
  taxIdElement.mount(taxIdRef.value)
  return true
}

function mountPaymentOnElements(generation: number): boolean {
  if (!elements || !elementRef.value) return false
  paymentElement?.unmount()
  paymentElement = null
  paymentElement = elements.create(
    'payment',
    buildJobbiePaymentElementOptions(purchaserType.value, {
      collectAddressExternally: props.collectBusinessBilling,
    }),
  )
  if (generation !== mountGeneration) {
    paymentElement.unmount()
    paymentElement = null
    return false
  }
  paymentElement.mount(elementRef.value)
  return true
}

function teardownPaymentElement(): void {
  mountGeneration += 1
  paymentElement?.unmount()
  paymentElement = null
  taxIdElement?.unmount()
  taxIdElement = null
  elements = null
  stripe = null
  activeSecret.value = ''
}

async function mountDeferredCheckoutElements(): Promise<void> {
  if (!usesCheckoutDeferred.value || !elementRef.value) {
    return
  }
  const generation = ++mountGeneration
  payError.value = null
  teardownPaymentElement()
  mountGeneration = generation

  const loaded = await loadJobbieStripe()
  if (!loaded || generation !== mountGeneration) {
    return
  }
  stripe = loaded

  const currency = (props.deferredCurrency?.trim() || 'eur').toLowerCase()
  elements =
    props.deferredMode === 'setup'
      ? stripe.elements(
          buildDeferredSetupElementsOptions(appearanceVariant.value, stripeLocale(), currency),
        )
      : stripe.elements(
          buildDeferredPaymentElementsOptions(
            appearanceVariant.value,
            stripeLocale(),
            props.deferredAmount as number,
            currency,
          ),
        )

  if (!mountTaxIdOnElements(generation)) return
  if (!mountPaymentOnElements(generation)) return
}

async function mountWithClientSecret(secret: string): Promise<void> {
  const trimmed = secret.trim()
  if (!trimmed || !elementRef.value) return

  const generation = ++mountGeneration
  payError.value = null

  paymentElement?.unmount()
  paymentElement = null
  taxIdElement?.unmount()
  taxIdElement = null
  elements = null

  const loaded = await loadJobbieStripe()
  if (!loaded || generation !== mountGeneration) {
    return
  }
  stripe = loaded

  elements = stripe.elements(
    buildClientSecretElementsOptions(appearanceVariant.value, stripeLocale(), trimmed),
  )

  if (!mountTaxIdOnElements(generation)) return
  if (!mountPaymentOnElements(generation)) return
  activeSecret.value = trimmed
}

async function applyPrepareResult(prepared: PreparePaymentResult): Promise<boolean> {
  const secret = prepared.clientSecret
  if (!stripe || !elements) {
    await mountWithClientSecret(secret)
    return Boolean(stripe && elements)
  }
  try {
    const updateResult = await elements.update({ clientSecret: secret })
    if (updateResult?.error) {
      payError.value = updateResult.error.message ?? S.checkoutPaymentFormNotReady
      return false
    }
  } catch (err) {
    payError.value =
      err instanceof Error ? err.message : S.checkoutPaymentFormNotReady
    return false
  }
  activeSecret.value = secret
  if (
    typeof prepared.amount === 'number' &&
    prepared.amount >= 1 &&
    elements.fetchUpdates
  ) {
    try {
      const fetchResult = await elements.fetchUpdates()
      if (fetchResult?.error) {
        payError.value = fetchResult.error.message ?? S.checkoutPaymentFormNotReady
        return false
      }
    } catch {
      // Optional after setup-intent update; confirm still uses clientSecret.
    }
  }
  return true
}

function readBillingAddressFromForm(): {
  line1: string
  city: string
  postal: string
} | null {
  const line1 = addressLine1.value.trim()
  const city = addressCity.value.trim()
  const postal = addressPostalCode.value.trim()
  if (!line1 || !city || !postal) {
    payError.value = S.checkoutBillingAddressRequired
    return null
  }
  return { line1, city, postal }
}

async function buildBillingPayload(): Promise<CheckoutBillingPayload | undefined> {
  if (!props.collectBusinessBilling) return undefined
  const address = readBillingAddressFromForm()
  if (!address) {
    return undefined
  }
  if (purchaserType.value === 'individual') {
    if (!skResidenceAttestation.value) {
      payError.value = S.checkoutSkResidenceAttestationRequired
      return undefined
    }
    return {
      purchaser_type: 'individual',
      address_line1: address.line1,
      address_city: address.city,
      address_postal_code: address.postal,
      address_country: 'SK',
      billing_attestation_sk_residence: true,
    }
  }
  const ico = registrationNumber.value.trim()
  if (!isValidSkIcoFormat(ico)) {
    payError.value = S.checkoutBillingIcoInvalid
    return undefined
  }
  if (!taxIdElement) {
    payError.value = 'Údaje firmy sa nepodarilo načítať.'
    return undefined
  }
  const taxResult = await taxIdElement.getValue()
  if (!taxResult.complete) {
    payError.value = 'Vyplňte názov firmy a IČ DPH.'
    return undefined
  }
  return {
    purchaser_type: 'company',
    company_name: taxResult.value.businessName?.trim() || null,
    vat_id: taxResult.value.taxId?.trim() || null,
    registration_number: registrationNumber.value.trim() || null,
    tax_id: taxIdDic.value.trim() || null,
    address_line1: address.line1,
    address_city: address.city,
    address_postal_code: address.postal,
    address_country: 'SK',
  }
}

function resolveEffectiveSecret(): string {
  return (activeSecret.value || props.clientSecret || '').trim()
}

function syncTaxIdVisibility(): void {
  if (!taxIdElement) return
  taxIdElement.update({
    visibility: purchaserType.value === 'company' ? 'always' : 'never',
  })
}

function syncPaymentBillingFields(): void {
  paymentElement?.update(
    buildJobbiePaymentElementOptions(purchaserType.value, {
      collectAddressExternally: props.collectBusinessBilling,
    }),
  )
}

onMounted(() => {
  if (usesCheckoutDeferred.value) {
    void mountDeferredCheckoutElements()
    return
  }
  const secret = props.clientSecret?.trim()
  if (secret) {
    void mountWithClientSecret(secret)
  }
})

watch(
  () => props.clientSecret,
  (secret) => {
    if (usesCheckoutDeferred.value) return
    if (!secret?.trim()) return
    void mountWithClientSecret(secret)
  },
)

watch(
  () => [props.deferredAmount, props.deferredCurrency, props.deferredMode] as const,
  () => {
    if (!usesCheckoutDeferred.value) return
    void mountDeferredCheckoutElements()
  },
)

watch(purchaserType, () => {
  skResidenceAttestation.value = false
  if (usesCheckoutDeferred.value) {
    activeSecret.value = ''
    void mountDeferredCheckoutElements()
    return
  }
  syncTaxIdVisibility()
  syncPaymentBillingFields()
})

onUnmounted(() => {
  teardownPaymentElement()
})

async function handlePay() {
  paying.value = true
  payError.value = null
  try {
    const billing = await buildBillingPayload()
    if (props.collectBusinessBilling && !billing) {
      return
    }

    let secret = resolveEffectiveSecret()
    if (!secret && props.preparePayment) {
      const raw = await props.preparePayment(billing)
      const prepared = normalizePreparePaymentResult(raw)
      if (!prepared) {
        payError.value = S.checkoutPaymentFailed
        return
      }
      const ready = await applyPrepareResult(prepared)
      if (!ready) {
        return
      }
      secret = prepared.clientSecret
    }

    if (!stripe || !elements) {
      payError.value = S.checkoutPaymentFormNotReady
      return
    }

    const submitResult = await elements.submit()
    const submitError = submitResult?.error
    if (submitError) {
      payError.value =
        submitError.message ?? 'Skontrolujte platobné a fakturačné údaje vo formulári.'
      return
    }

    const confirmParams: {
      return_url: string
      payment_method_data?: ReturnType<typeof buildJobbiePaymentMethodConfirmData>
    } = { return_url: props.returnUrl }
    if (props.collectBusinessBilling) {
      confirmParams.payment_method_data = buildJobbiePaymentMethodConfirmData(
        billing
          ? {
              name:
                billing.purchaser_type === 'company'
                  ? billing.company_name
                  : undefined,
              address_line1: billing.address_line1,
              address_city: billing.address_city,
              address_postal_code: billing.address_postal_code,
              address_country: billing.address_country,
            }
          : null,
      )
    }

    const confirmOptions: {
      elements: typeof elements
      confirmParams: typeof confirmParams
      redirect: 'if_required'
      clientSecret?: string
    } = {
      elements,
      confirmParams,
      redirect: 'if_required',
    }
    if (secret) {
      confirmOptions.clientSecret = secret
    }

    const useSetup = isSetupIntentClientSecret(secret)
    if (useSetup) {
      const { error: setupError, setupIntent } = await stripe.confirmSetup(confirmOptions)
      if (setupError) {
        payError.value = setupError.message ?? 'Platba zlyhala.'
        return
      }
      let setupId =
        setupIntent && typeof setupIntent === 'object' && 'id' in setupIntent
          ? String((setupIntent as { id: string }).id)
          : undefined
      if (!setupId?.startsWith('seti_')) {
        setupId = setupIntentIdFromClientSecret(secret) ?? undefined
      }
      if (!setupId?.startsWith('seti_')) {
        payError.value = S.checkoutPaymentNoIntentId
        return
      }
      if (props.onPaymentSuccess) {
        await props.onPaymentSuccess(setupId, billing)
      } else {
        emit('success', setupId, billing)
      }
      return
    }

    const { error, paymentIntent } = await stripe.confirmPayment(confirmOptions)
    if (error) {
      payError.value = error.message ?? 'Platba zlyhala.'
      return
    }

    let piId =
      paymentIntent && typeof paymentIntent === 'object' && 'id' in paymentIntent
        ? String((paymentIntent as { id: string }).id)
        : undefined
    if (!piId?.startsWith('pi_')) {
      piId = paymentIntentIdFromClientSecret(secret) ?? undefined
    }
    if (!piId?.startsWith('pi_')) {
      payError.value = S.checkoutPaymentNoIntentId
      return
    }
    if (props.onPaymentSuccess) {
      await props.onPaymentSuccess(piId, billing)
    } else {
      emit('success', piId, billing)
    }
  } catch (err) {
    payError.value =
      err instanceof Error ? err.message : 'Platba zlyhala. Skúste to znova.'
  } finally {
    paying.value = false
  }
}
</script>
