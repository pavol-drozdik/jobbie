<template>
  <div>
    <h1 class="m-0 text-4xl font-extrabold leading-[1.1] text-black">
      {{ S.checkoutPageTitleSubscription }}
      <span class="text-marketing-green">{{ S.checkoutPageTitleSubscriptionAccent }}</span>
    </h1>
    <p class="mb-8 mt-2 text-[17px] font-normal leading-normal text-black/55">
      {{ checkoutTrialDays > 0 ? S.checkoutPageSubtitleSubscriptionTrial : S.checkoutPageSubtitleSubscription }}
    </p>
    <p class="mb-6 text-sm leading-relaxed text-black/55">
      {{ S.checkoutSkBillingPolicyNotice }}
    </p>

    <p v-if="error" class="mb-4 text-sm text-red-600" role="alert">{{ error }}</p>

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
        v-if="checkoutTrialDays > 0"
        class="m-0 mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 font-dmSans text-[13px] font-bold text-amber-950"
      >
        {{ subscriptionTrialBadgeLabel(checkoutTrialDays) }}
      </p>
      <template v-if="checkoutTrialDays === 0">
        <p
          v-if="promoPreview && promoPreview.discounted_cents < promoPreview.original_cents"
          class="m-0 mt-2 text-sm text-black/45 line-through"
        >
          {{ S.checkoutPromoOriginalPrice }}:
          {{ formatPlanPrice(promoPreview.original_cents) }}
        </p>
        <p class="m-0 mt-2 font-dmSans text-2xl font-extrabold text-marketing-green">
          {{ formatPlanPrice(checkoutAmountCents) }}
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
        <p
          v-if="promoPreview?.duration_label"
          class="m-0 mt-1 text-sm text-black/50"
        >
          {{ promoPreview.duration_label }}
        </p>
      </template>
      <template v-else>
        <p class="m-0 mt-2 font-dmSans text-2xl font-extrabold text-marketing-green">
          {{ S.checkoutTrialPriceNow }}
        </p>
        <p class="m-0 mt-1 font-dmSans text-base font-semibold text-black/55">
          {{ S.checkoutTrialPriceAfter.replace('{price}', formatPlanPrice(plan.price_monthly_cents)) }}
        </p>
      </template>
      <p class="m-0 mt-1 text-sm text-black/50">
        {{ plan.monthly_credits }} {{ S.credits }} / mesiac
      </p>
    </div>

    <div
      v-if="plan && checkoutTrialDays === 0 && promoCheckoutAvailable"
      class="mb-6 flex flex-col gap-2"
    >
      <label class="text-sm font-medium text-black/70" for="checkout-subscription-promo">
        {{ S.checkoutPromoCodeLabel }}
      </label>
      <input
        id="checkout-subscription-promo"
        v-model="promoCode"
        type="text"
        class="max-w-sm rounded-xl border border-black/15 px-4 py-2.5 text-sm"
        :placeholder="S.checkoutPromoCodePlaceholder"
        autocomplete="off"
      />
      <p class="m-0 text-xs text-black/45">{{ S.checkoutPromoCodeHint }}</p>
      <p v-if="promoValidating" class="m-0 text-xs text-black/45">
        {{ S.checkoutPromoValidating }}
      </p>
      <p v-else-if="promoError" class="m-0 text-xs text-red-600" role="alert">
        {{ promoError }}
      </p>
    </div>

    <p v-if="loading" class="text-sm text-black/55">{{ S.checkoutLoadingPayment }}</p>
    <ClientOnly v-else-if="plan">
      <StripePaymentForm
        :key="`checkout-stripe-${checkoutIntentType}`"
        variant="auth"
        locale="sk"
        collect-business-billing
        :return-url="stripeReturnUrl"
        :billing-prefill="billingPrefill"
        :deferred-mode="checkoutIntentType"
        :deferred-amount="checkoutIntentType === 'setup' ? undefined : checkoutAmountCents"
        deferred-currency="eur"
        :prepare-payment="prepareCheckoutPayment"
        :on-payment-success="navigateToCheckoutResult"
        @cancel="emit('cancel')"
      />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import { subscriptionTrialBadgeLabel } from '~/utils/subscription-trial'
import { formatPromoAmountOff } from '~/composables/useCheckoutPromo'

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
  checkoutTrialDays,
  checkoutIntentType,
  billingPrefill,
  stripeReturnUrl,
  promoCode,
  promoPreview,
  promoError,
  promoValidating,
  promoCheckoutAvailable,
  checkoutAmountCents,
  formatPlanPrice,
  navigateToCheckoutResult,
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
