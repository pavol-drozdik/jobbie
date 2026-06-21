<template>
  <div>
    <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
      {{ S.checkoutPageTitleSubscription }}
      <span class="text-marketing-green">{{ S.checkoutPageTitleSubscriptionAccent }}</span>
    </h1>
    <p class="mb-8 mt-2 text-[17px] font-normal leading-normal text-black/55">
      {{ planTrialDays > 0 ? S.checkoutPageSubtitleSubscriptionTrial : S.checkoutPageSubtitleSubscription }}
    </p>
    <p class="mb-6 text-sm leading-relaxed text-black/55">
      {{ S.checkoutSkBillingPolicyNotice }}
    </p>

    <p
      v-if="successMessage"
      class="mb-4 rounded-lg border border-marketing-green/25 bg-marketing-mint px-3 py-2 text-sm font-medium text-marketing-green"
    >
      {{ successMessage }}
    </p>
    <p v-else-if="error" class="mb-4 text-sm text-red-600" role="alert">{{ error }}</p>

    <div
      v-if="plan"
      class="mb-6 rounded-2xl border border-black/10 bg-marketing-soft/60 px-5 py-4"
    >
      <p class="m-0 text-xs font-semibold uppercase tracking-wide text-black/45">
        {{ S.checkoutSummaryLabel }}
      </p>
      <p class="m-0 mt-2 text-lg font-extrabold text-black">
        {{ plan.name_sk }}
        <span class="font-medium text-black/50">· {{ S.checkoutPlanLabel }}</span>
      </p>
      <p
        v-if="planTrialDays > 0"
        class="m-0 mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 font-dmSans text-[13px] font-bold text-amber-950"
      >
        {{ subscriptionTrialBadgeLabel(planTrialDays) }}
      </p>
      <p class="m-0 mt-2 font-dmSans text-2xl font-extrabold text-marketing-green">
        <template v-if="planTrialDays > 0">{{ S.checkoutTrialPriceNow }}</template>
        <template v-else>{{ formatPlanPrice(plan.price_monthly_cents) }}</template>
      </p>
      <p
        v-if="planTrialDays > 0"
        class="m-0 mt-1 font-dmSans text-base font-semibold text-black/55"
      >
        {{ S.checkoutTrialPriceAfter.replace('{price}', formatPlanPrice(plan.price_monthly_cents)) }}
      </p>
      <p class="m-0 mt-1 text-sm text-black/50">
        {{ plan.monthly_credits }} {{ S.credits }} / mesiac
      </p>
    </div>

    <p v-if="loading" class="text-sm text-black/55">{{ S.checkoutLoadingPayment }}</p>
    <ClientOnly v-else-if="plan && !successMessage">
      <StripePaymentForm
        variant="auth"
        locale="sk"
        collect-business-billing
        :return-url="stripeReturnUrl"
        :billing-prefill="billingPrefill"
        :deferred-mode="planTrialDays > 0 ? 'setup' : 'payment'"
        :deferred-amount="planTrialDays > 0 ? undefined : plan.price_monthly_cents"
        deferred-currency="eur"
        :prepare-payment="prepareCheckoutPayment"
        :on-payment-success="confirmSubscriptionFromPaymentIntent"
        @cancel="emit('cancel')"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { subscriptionTrialBadgeLabel } from '~/utils/subscription-trial'

const props = defineProps<{
  planId: string
  returnPath: string
}>()

const emit = defineEmits<{
  cancel: []
}>()

import type { CheckoutBillingPayload } from '~/utils/checkout-billing'
import type { PreparePaymentResult } from '~/utils/stripe-prepare-payment'

const {
  plan,
  loading,
  error,
  successMessage,
  checkoutTrialDays,
  planTrialDays,
  billingPrefill,
  stripeReturnUrl,
  formatPlanPrice,
  confirmSubscriptionFromPaymentIntent,
  createPaymentIntent,
  init,
} = useCheckoutSubscription({
  planId: props.planId,
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
