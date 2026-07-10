<template>
  <div>
    <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
      {{ S.checkoutPageTitleCredits }}
      <span class="text-marketing-green">{{ S.checkoutPageTitleCreditsAccent }}</span>
    </h1>
    <p class="mb-8 mt-2 text-[17px] font-normal leading-normal text-black/55">
      {{ S.checkoutPageSubtitleCredits }}
    </p>
    <p class="mb-6 text-sm leading-relaxed text-black/55">
      {{ S.checkoutSkBillingPolicyNotice }}
    </p>

    <p v-if="error" class="mb-4 text-sm text-red-600" role="alert">{{ error }}</p>

    <div
      v-if="pack"
      class="mb-6 rounded-2xl border border-black/10 bg-marketing-soft/60 px-5 py-4"
    >
      <p class="m-0 text-xs font-semibold uppercase tracking-wide text-black/45">
        {{ S.checkoutSummaryLabel }}
      </p>
      <p class="m-0 mt-2 text-lg font-extrabold text-black">
        {{ pack.credits }} {{ S.credits }}
        <span class="font-medium text-black/50">· {{ S.checkoutCreditsLabel }}</span>
      </p>
      <p
        v-if="promoPreview && promoPreview.discounted_cents < promoPreview.original_cents"
        class="m-0 mt-1 text-sm text-black/45 line-through"
      >
        {{ S.checkoutPromoOriginalPrice }}:
        {{ formatPrice(promoPreview.original_cents, pack.currency) }}
      </p>
      <p class="m-0 mt-1 font-dmSans text-2xl font-extrabold text-marketing-green">
        {{ formatPrice(checkoutAmountCents, pack.currency) }}
        <span
          v-if="promoPreview?.percent_off"
          class="ml-2 text-sm font-semibold text-marketing-green/80"
        >
          −{{ promoPreview.percent_off }} %
        </span>
        <span
          v-else-if="promoPreview?.amount_off_cents"
          class="ml-2 text-sm font-semibold text-marketing-green/80"
        >
          {{ formatPromoAmountOff(promoPreview.amount_off_cents) }}
        </span>
      </p>
    </div>

    <PromoCodeToggleField
      v-if="pack && promoCheckoutAvailable"
      v-model="promoCode"
      available
      input-id="checkout-credits-promo"
      :input-class="promoInputClass"
      class="mb-6"
    >
      <p class="m-0 text-xs text-black/45">{{ S.checkoutPromoCodeHint }}</p>
      <p v-if="promoValidating" class="m-0 text-xs text-black/45">
        {{ S.checkoutPromoValidating }}
      </p>
      <p v-else-if="promoError" class="m-0 text-xs text-red-600" role="alert">
        {{ promoError }}
      </p>
    </PromoCodeToggleField>

    <p v-if="loading" class="text-sm text-black/55">{{ S.checkoutLoadingPayment }}</p>
    <ClientOnly v-else-if="pack">
      <StripePaymentForm
        variant="auth"
        locale="sk"
        collect-business-billing
        :return-url="stripeReturnUrl"
        :billing-prefill="billingPrefill"
        :deferred-amount="checkoutAmountCents"
        :deferred-currency="pack.currency"
        :prepare-payment="prepareCheckoutPayment"
        @success="(id, billing) => navigateToCheckoutResult(id, billing)"
        @cancel="emit('cancel')"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { formatPromoAmountOff } from '~/composables/useCheckoutPromo'
import { formTextInputClass } from '~/utils/form-field-ui'

const promoInputClass = formTextInputClass

const props = defineProps<{
  packSlug: string
  returnPath: string
}>()

const emit = defineEmits<{
  cancel: []
}>()

import type { CheckoutBillingPayload } from '~/utils/checkout-billing'
import type { PreparePaymentResult } from '~/utils/stripe-prepare-payment'

const {
  pack,
  loading,
  error,
  billingPrefill,
  stripeReturnUrl,
  promoCode,
  promoPreview,
  promoError,
  promoValidating,
  promoCheckoutAvailable,
  checkoutAmountCents,
  formatPrice,
  navigateToCheckoutResult,
  createPaymentIntent,
  init,
} = useCheckoutCredits({
  packSlug: props.packSlug,
  returnPath: props.returnPath,
})

async function prepareCheckoutPayment(
  billing?: CheckoutBillingPayload,
): Promise<PreparePaymentResult | null> {
  error.value = null
  return createPaymentIntent(billing)
}

onMounted(() => {
  void init()
})
</script>
