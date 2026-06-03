<template>
  <div class="mt-4 rounded-2xl border border-black/[0.08] bg-marketing-surface/50 p-4">
    <p class="m-0 mb-3 text-sm font-semibold text-black">{{ S.settingsInvoicePaySection }}</p>
    <div class="pb-2">
      <div ref="elementRef" :class="[jobbieStripeElementsMountClass, 'min-h-[200px]']" />
    </div>
    <p v-if="formError" class="mt-2 text-sm text-red-600">{{ formError }}</p>
    <AppButton
      type="button"
      variant="primary"
      size="md"
      class="mt-4 w-full sm:w-auto"
      :disabled="busy"
      @click="handlePay"
    >
      {{ busy ? S.loading : S.settingsInvoicePay }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import {
  buildClientSecretElementsOptions,
  buildJobbiePaymentElementOptions,
  jobbieStripeElementsMountClass,
} from '~/utils/stripe-payment-element-ui'
import { paymentIntentIdFromClientSecret } from '~/utils/stripe-payment-intent'
import { S } from '~/utils/strings'

const props = defineProps<{
  clientSecret: string
  returnUrl: string
}>()

const emit = defineEmits<{ success: [] }>()

const config = useRuntimeConfig().public
const stripePublishableKey = config.stripePublishableKey as string

const elementRef = ref<HTMLDivElement | null>(null)
const busy = ref(false)
const formError = ref('')

let stripe: import('@stripe/stripe-js').Stripe | null = null
let elements: import('@stripe/stripe-js').StripeElements | null = null
let paymentElement: import('@stripe/stripe-js').StripePaymentElement | null = null
let mountGeneration = 0

function teardown(): void {
  mountGeneration += 1
  paymentElement?.unmount()
  paymentElement = null
  elements = null
  stripe = null
}

async function mountElement(): Promise<void> {
  const secret = props.clientSecret.trim()
  if (!stripePublishableKey || !secret || !elementRef.value) {
    formError.value = S.checkoutPaymentFormNotReady
    return
  }

  paymentElement?.unmount()
  paymentElement = null
  elements = null

  const generation = ++mountGeneration
  const { loadStripe } = await import('@stripe/stripe-js')
  stripe = await loadStripe(stripePublishableKey)
  if (!stripe || generation !== mountGeneration || !elementRef.value) {
    return
  }

  elements = stripe.elements(
    buildClientSecretElementsOptions('settings', 'sk', secret),
  )

  paymentElement = elements.create('payment', buildJobbiePaymentElementOptions(null))
  if (generation !== mountGeneration) {
    paymentElement.unmount()
    paymentElement = null
    return
  }
  paymentElement.mount(elementRef.value)
}

async function handlePay(): Promise<void> {
  if (!stripe || !elements) {
    formError.value = S.checkoutPaymentFormNotReady
    return
  }

  busy.value = true
  formError.value = ''
  try {
    const secret = props.clientSecret.trim()
    const { error: submitError } = await elements.submit()
    if (submitError) {
      formError.value =
        submitError.message ?? 'Skontrolujte platobné údaje vo formulári.'
      return
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret: secret,
      confirmParams: { return_url: props.returnUrl },
      redirect: 'if_required',
    })
    if (error) {
      formError.value = error.message ?? 'Platba zlyhala.'
      return
    }

    const piId =
      paymentIntent && typeof paymentIntent === 'object' && 'id' in paymentIntent
        ? String((paymentIntent as { id: string }).id)
        : paymentIntentIdFromClientSecret(secret)
    if (!piId?.startsWith('pi_')) {
      formError.value = S.checkoutPaymentNoIntentId
      return
    }
    emit('success')
  } finally {
    busy.value = false
  }
}

watch(
  () => props.clientSecret,
  () => {
    void mountElement()
  },
)

onMounted(() => {
  void mountElement()
})

onUnmounted(() => {
  teardown()
})
</script>
