<template>
  <div>
    <template v-if="collectBusinessBilling">
      <p class="mb-4 text-sm font-medium text-black/70">
        {{ accountPurchaserType === 'company' ? S.checkoutBuyerTypeFixedCompany : S.checkoutBuyerTypeFixedIndividual }}
      </p>

      <div v-show="accountPurchaserType === 'company'" class="mb-4 space-y-4">
        <div :class="fieldRowClass">
          <label :class="fieldLabelClass">
            {{ S.companyName }}
          </label>
          <input
            v-model="companyName"
            type="text"
            :class="fieldInputClass"
            autocomplete="organization"
          >
        </div>
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
        <label class="flex is-clickable items-center gap-3 text-sm font-medium leading-snug text-black/70">
          <input
            v-model="vatPayer"
            type="checkbox"
            class="size-4 shrink-0 rounded border-black/20 text-marketing-green focus:ring-marketing-green"
          >
          <span>{{ S.vatPayer }}</span>
        </label>
        <div v-show="vatPayer" :class="fieldRowClass">
          <label :class="fieldLabelClass">
            {{ S.vatIdIcDph }}
          </label>
          <input
            v-model="vatId"
            type="text"
            :class="fieldInputClass"
            autocomplete="off"
          >
        </div>
      </div>

      <div
        v-show="accountPurchaserType === 'individual' || accountPurchaserType === 'company'"
        class="mb-4 space-y-4"
        :class="accountPurchaserType === 'company' ? 'border-t border-black/10 pt-4' : ''"
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
        v-if="accountPurchaserType === 'individual'"
        class="mb-4 flex is-clickable items-start gap-3 text-sm leading-snug text-black/70"
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
import {
  type CheckoutBillingPayload,
  type CheckoutPurchaserType,
  isValidSkIcoFormat,
  resolveAccountPurchaserType,
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
  isPaymentIntentClientSecret,
  isSetupIntentClientSecret,
  paymentIntentIdFromClientSecret,
  setupIntentIdFromClientSecret,
  shouldConfirmSetupIntent,
  shouldRemountElementsForIntentMismatch,
} from '~/utils/stripe-payment-intent'
import {
  normalizePreparePaymentResult,
  type PreparePaymentResult,
} from '~/utils/stripe-prepare-payment'
import { S } from '~/utils/strings'

const config = useRuntimeConfig().public
const stripePublishableKey = config.stripePublishableKey as string
const { user } = useAuth()

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
    ? 'h-14 w-full is-clickable rounded-full border-none bg-marketing-green text-lg font-bold text-white transition-opacity duration-200 hover:opacity-[0.88] disabled:is-disabled-cursor disabled:opacity-50 sm:flex-1'
    : 'btn-green disabled:opacity-50 sm:flex-1',
)

const secondaryButtonClass = computed(() =>
  props.variant === 'auth'
    ? 'h-14 w-full is-clickable rounded-full border-[1.5px] border-black/15 bg-white text-lg font-semibold text-black/70 transition-opacity hover:opacity-80 disabled:opacity-50 sm:flex-1'
    : 'w-full rounded-lg border px-4 py-2 font-medium transition-colors disabled:opacity-50 sm:w-auto sm:flex-1',
)

const emit = defineEmits<{
  success: [paymentIntentId?: string, billing?: CheckoutBillingPayload]
  cancel: []
}>()

const elementRef = ref<HTMLDivElement | null>(null)
const paying = ref(false)
const payError = ref<string | null>(null)
const activeSecret = ref('')

const accountPurchaserType = computed((): CheckoutPurchaserType =>
  resolveAccountPurchaserType(user.value?.role),
)

const companyName = ref('')
const registrationNumber = ref('')
const taxIdDic = ref('')
const vatPayer = ref(false)
const vatId = ref('')
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
let mountGeneration = 0

type ElementsMountKind = 'deferred-setup' | 'deferred-payment' | 'client-secret' | null
const elementsMountKind = ref<ElementsMountKind>(null)

function stripeLocale(): import('@stripe/stripe-js').StripeElementLocale {
  return (props.locale?.trim() || 'sk') as import('@stripe/stripe-js').StripeElementLocale
}

async function loadJobbieStripe(): Promise<import('@stripe/stripe-js').Stripe | null> {
  if (!stripePublishableKey) return null
  const { loadStripe } = await import('@stripe/stripe-js')
  return loadStripe(stripePublishableKey)
}

function applyBillingPrefill(): void {
  const p = props.billingPrefill
  if (!p) return
  companyName.value = p.company_name?.trim() ?? ''
  registrationNumber.value = p.registration_number?.trim() ?? ''
  taxIdDic.value = p.tax_id?.trim() ?? ''
  const storedVatId = p.vat_id?.trim() ?? ''
  vatId.value = storedVatId
  if (storedVatId) vatPayer.value = true
}

function mountPaymentOnElements(generation: number): boolean {
  if (!elements || !elementRef.value) return false
  paymentElement?.unmount()
  paymentElement = null
  paymentElement = elements.create(
    'payment',
    buildJobbiePaymentElementOptions(accountPurchaserType.value, {
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
  elements = null
  stripe = null
  activeSecret.value = ''
  elementsMountKind.value = null
}

async function mountDeferredCheckoutElements(): Promise<void> {
  if (!usesCheckoutDeferred.value || !elementRef.value) {
    return
  }
  const generation = ++mountGeneration
  payError.value = null
  teardownPaymentElement()
  mountGeneration = generation
  applyBillingPrefill()

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

  if (!mountPaymentOnElements(generation)) return
  elementsMountKind.value =
    props.deferredMode === 'setup' ? 'deferred-setup' : 'deferred-payment'
}

async function mountWithClientSecret(secret: string): Promise<void> {
  const trimmed = secret.trim()
  if (!trimmed || !elementRef.value) return

  const generation = ++mountGeneration
  payError.value = null

  paymentElement?.unmount()
  paymentElement = null
  elements = null
  applyBillingPrefill()

  const loaded = await loadJobbieStripe()
  if (!loaded || generation !== mountGeneration) {
    return
  }
  stripe = loaded

  elements = stripe.elements(
    buildClientSecretElementsOptions(appearanceVariant.value, stripeLocale(), trimmed),
  )

  if (!mountPaymentOnElements(generation)) return
  activeSecret.value = trimmed
  elementsMountKind.value = 'client-secret'
}

type ApplyPrepareResultOutcome = {
  ok: boolean
  /** Elements were remounted after deferred mode / server intent mismatch — submit again. */
  remounted?: boolean
}

async function applyPrepareResult(
  prepared: PreparePaymentResult,
  options?: { fromDeferredCheckout?: boolean },
): Promise<ApplyPrepareResultOutcome> {
  const secret = prepared.clientSecret
  if (!secret) {
    payError.value = S.checkoutPaymentFailed
    return { ok: false }
  }

  const fromDeferred = options?.fromDeferredCheckout === true
  const priorMountKind = elementsMountKind.value

  const intentMismatch =
    fromDeferred &&
    shouldRemountElementsForIntentMismatch(
      props.deferredMode,
      secret,
      prepared.intentType,
    )

  /** Never `elements.update` a PI onto deferred-setup — off_session leaks into confirm. */
  const forcePiRemount =
    fromDeferred &&
    isPaymentIntentClientSecret(secret) &&
    priorMountKind === 'deferred-setup'

  const needsClientSecretMount =
    !stripe || !elements || intentMismatch || forcePiRemount

  if (needsClientSecretMount) {
    await mountWithClientSecret(secret)
    if (!stripe || !elements) {
      payError.value = S.checkoutPaymentFormNotReady
      return { ok: false }
    }
    const remounted =
      intentMismatch ||
      forcePiRemount ||
      (fromDeferred &&
        (priorMountKind === 'deferred-setup' ||
          priorMountKind === 'deferred-payment'))
    return { ok: true, remounted }
  }

  try {
    const updateResult = await elements.update({ clientSecret: secret })
    if (updateResult?.error) {
      payError.value = updateResult.error.message ?? S.checkoutPaymentFormNotReady
      return { ok: false }
    }
  } catch (err) {
    payError.value =
      err instanceof Error ? err.message : S.checkoutPaymentFormNotReady
    return { ok: false }
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
        return { ok: false }
      }
    } catch {
      // Optional after PI create; confirm still uses clientSecret.
    }
  }
  return { ok: true }
}

async function submitElementsOrSetError(): Promise<boolean> {
  if (!elements) {
    payError.value = S.checkoutPaymentFormNotReady
    return false
  }
  const submitResult = await elements.submit()
  const submitError = submitResult?.error
  if (submitError) {
    payError.value =
      submitError.message ??
      'Skontrolujte platobné a fakturačné údaje vo formulári.'
    return false
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
  if (accountPurchaserType.value === 'individual') {
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
  const nameVal = companyName.value.trim()
  if (!nameVal) {
    payError.value = 'Vyplňte názov spoločnosti.'
    return undefined
  }
  const ico = registrationNumber.value.trim()
  if (!isValidSkIcoFormat(ico)) {
    payError.value = S.checkoutBillingIcoInvalid
    return undefined
  }
  return {
    purchaser_type: 'company',
    company_name: nameVal,
    vat_id: vatId.value.trim() || null,
    registration_number: ico || null,
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

function syncPaymentBillingFields(): void {
  paymentElement?.update(
    buildJobbiePaymentElementOptions(accountPurchaserType.value, {
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

watch(vatPayer, (checked) => {
  if (!checked) vatId.value = ''
})

watch(
  accountPurchaserType,
  () => {
    skResidenceAttestation.value = false
    if (usesCheckoutDeferred.value) {
      activeSecret.value = ''
      void mountDeferredCheckoutElements()
      return
    }
    syncPaymentBillingFields()
  },
)

onUnmounted(() => {
  teardownPaymentElement()
})

/** Stripe confirm can stall indefinitely (3DS / network); never leave the button stuck. */
const PAYMENT_CONFIRM_TIMEOUT_MS = 30_000

async function raceConfirmTimeout<T>(op: Promise<T>): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), PAYMENT_CONFIRM_TIMEOUT_MS)
  })
  try {
    return await Promise.race([op, timeout])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function handlePay() {
  paying.value = true
  payError.value = null
  try {
    const billing = await buildBillingPayload()
    if (props.collectBusinessBilling && !billing) {
      return
    }

    if (!stripe || !elements) {
      payError.value = S.checkoutPaymentFormNotReady
      return
    }

    let secret = resolveEffectiveSecret()
    let preparedIntentType: PreparePaymentResult['intentType']
    const isDeferredCheckout = usesCheckoutDeferred.value && !secret && props.preparePayment

    // Deferred: validate card in Elements before creating PI (Stripe recommended order).
    if (isDeferredCheckout) {
      if (!(await submitElementsOrSetError())) {
        return
      }

      const raw = await props.preparePayment!(billing)
      const prepared = normalizePreparePaymentResult(raw)
      if (!prepared) {
        return
      }
      preparedIntentType = prepared.intentType
      const preparedResult = await applyPrepareResult(prepared, {
        fromDeferredCheckout: true,
      })
      if (!preparedResult.ok) {
        return
      }
      secret = prepared.clientSecret
      if (preparedResult.remounted) {
        // Intent type changed (e.g. trial setup -> immediate payment): Elements
        // were remounted with the server clientSecret and the card field is now
        // empty. Submitting it here never resolves; ask the user to re-enter the
        // card and confirm again (the next click uses the new clientSecret).
        payError.value = S.checkoutConfirmAfterRemount
        return
      }
    } else if (!secret && props.preparePayment) {
      const raw = await props.preparePayment(billing)
      const prepared = normalizePreparePaymentResult(raw)
      if (!prepared) {
        return
      }
      preparedIntentType = prepared.intentType
      const preparedResult = await applyPrepareResult(prepared)
      if (!preparedResult.ok) {
        return
      }
      secret = prepared.clientSecret
    }

    if (!isDeferredCheckout) {
      if (!(await submitElementsOrSetError())) {
        return
      }
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

    const useSetup = shouldConfirmSetupIntent(
      secret,
      preparedIntentType,
      undefined,
    )
    if (useSetup && isPaymentIntentClientSecret(secret)) {
      payError.value = S.checkoutConfirmAfterRemount
      return
    }
    if (!useSetup && isSetupIntentClientSecret(secret)) {
      payError.value = S.checkoutConfirmAfterRemount
      return
    }
    if (useSetup) {
      const setupResult = await raceConfirmTimeout(
        stripe.confirmSetup(confirmOptions),
      )
      if (setupResult === 'timeout') {
        payError.value = S.checkoutPaymentFailed
        return
      }
      const { error: setupError, setupIntent } = setupResult
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

    if (elementsMountKind.value === 'deferred-setup') {
      payError.value = S.checkoutConfirmAfterRemount
      return
    }

    const confirmResult = await raceConfirmTimeout(
      stripe.confirmPayment(confirmOptions),
    )
    if (confirmResult === 'timeout') {
      payError.value = S.checkoutPaymentFailed
      return
    }
    const { error, paymentIntent } = confirmResult
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
