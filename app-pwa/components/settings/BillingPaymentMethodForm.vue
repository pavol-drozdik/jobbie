<template>
  <div class="mt-4 rounded-2xl border border-black/[0.08] bg-marketing-surface/50 p-4">
    <div class="pb-2">
      <div ref="elementRef" :class="[jobbieStripeElementsMountClass, 'min-h-[200px]']" />
    </div>
    <p v-if="formError" class="mt-2 text-sm text-red-600">{{ formError }}</p>
    <div class="mt-4 flex flex-col gap-3 sm:flex-row">
      <AppButton
        type="button"
        variant="primary"
        size="md"
        class="w-full sm:w-auto"
        :disabled="busy"
        @click="handleSave"
      >
        {{ busy ? S.loading : S.settingsBillingPaymentMethodSave }}
      </AppButton>
      <AppButton
        type="button"
        variant="outline"
        size="md"
        class="w-full sm:w-auto"
        :disabled="busy"
        @click="$emit('cancel')"
      >
        {{ S.cancel }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  buildClientSecretElementsOptions,
  buildJobbiePaymentElementOptions,
  jobbieStripeElementsMountClass,
} from '~/utils/stripe-payment-element-ui'
import { parseApiErrorMessage } from '~/utils/api-errors'
import { S } from '~/utils/strings'

const props = defineProps<{
  clientSecret: string
}>()

const emit = defineEmits<{
  success: []
  cancel: []
}>()

const config = useRuntimeConfig().public
const stripePublishableKey = config.stripePublishableKey as string
const { api } = useApi()

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

async function handleSave(): Promise<void> {
  if (!stripe || !elements) {
    formError.value = S.checkoutPaymentFormNotReady
    return
  }

  busy.value = true
  formError.value = ''
  try {
    const { error: submitError } = await elements.submit()
    if (submitError) {
      formError.value =
        submitError.message ?? 'Skontrolujte údaje platobnej karty vo formulári.'
      return
    }

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    })
    if (error) {
      formError.value = error.message ?? S.settingsBillingPaymentMethodFailed
      return
    }
    const setupIntentId = setupIntent?.id?.trim()
    if (!setupIntentId) {
      formError.value = S.settingsBillingPaymentMethodFailed
      return
    }

    const res = await api<{ payment_method: unknown }>('/api/payments/payment-method/confirm', {
      method: 'POST',
      body: { setup_intent_id: setupIntentId },
    })
    if (res.ok) {
      emit('success')
      return
    }
    formError.value = parseApiErrorMessage(res, S.settingsBillingPaymentMethodFailed)
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
