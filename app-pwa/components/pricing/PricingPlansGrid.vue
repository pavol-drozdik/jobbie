<template>
  <div>
    <p v-if="successFlash" class="mb-4 rounded-xl border border-marketing-green/20 bg-white px-4 py-3 text-sm font-medium text-marketing-green shadow-[0px_0px_4px_0px_rgba(0,0,0,0.08)]">
      {{ successFlash }}
    </p>
    <p v-if="loading" class="font-dmSans text-sm text-black/50">{{ S.loading }}</p>
    <p v-else-if="loadError" class="text-sm text-red-600">{{ loadError }}</p>
    <template v-else>
      <div class="overflow-hidden rounded-[20px] bg-white shadow-[0px_0px_4px_0px_rgba(0,0,0,0.12)]">
        <div
          class="grid grid-cols-1 min-[960px]:grid-cols-4 min-[960px]:divide-x min-[960px]:divide-black/[0.06]"
        >
          <article
            v-for="(plan, index) in visiblePlans"
            :key="plan.id"
            class="flex flex-col px-5 py-6 sm:px-6 sm:py-8"
            :class="[
              index > 0 ? 'border-t border-black/[0.06] min-[960px]:border-t-0' : '',
              planColumnClass(plan),
            ]"
          >
            <div class="mb-4 min-h-[28px]">
              <span
                v-if="mySub?.plan_id === plan.id"
                class="inline-block rounded-full bg-marketing-panel px-3 py-1 font-dmSans text-[12px] font-bold text-marketing-green"
              >
                Aktuálny plán
              </span>
              <span
                v-else-if="planTrialDays(plan) > 0"
                class="inline-block rounded-full bg-amber-100 px-3 py-1 font-dmSans text-[12px] font-bold text-amber-950"
              >
                {{ subscriptionTrialBadgeLabel(planTrialDays(plan)) }}
              </span>
              <span
                v-else-if="plan.slug === 'plus'"
                class="inline-block rounded-full bg-marketing-green px-3 py-1 font-dmSans text-[12px] font-bold text-white"
              >
                {{ S.pricingPlanRecommended }}
              </span>
            </div>

            <h3 class="m-0 font-dmSans text-xl font-extrabold text-black">
              {{ plan.name_sk }}
            </h3>

            <p class="m-0 mt-3 font-dmSans text-[clamp(1.75rem,3vw,2.25rem)] font-extrabold leading-none tracking-tight text-marketing-green">
              <template v-if="plan.price_monthly_cents === 0">{{ S.planPriceFree }}</template>
              <template v-else-if="planTrialDays(plan) > 0">{{ S.checkoutTrialPriceNow }}</template>
              <template v-else>
                {{ (plan.price_monthly_cents / 100).toFixed(2) }} €
                <span class="text-[15px] font-semibold text-black/40">{{ S.planPerMonth }}</span>
              </template>
            </p>
            <p
              v-if="planTrialDays(plan) > 0 && plan.price_monthly_cents > 0"
              class="m-0 mt-2 font-dmSans text-sm font-semibold text-black/55"
            >
              {{ S.checkoutTrialPriceAfter.replace('{price}', `${(plan.price_monthly_cents / 100).toFixed(2)} €${S.planPerMonth}`) }}
            </p>
            <p
              v-else-if="planTrialDays(plan) > 0"
              class="m-0 mt-2 font-dmSans text-sm font-semibold text-amber-900"
            >
              {{ subscriptionTrialBadgeLabel(planTrialDays(plan)) }} — {{ S.pricingTrialAfterHint }}
            </p>

            <ul class="m-0 mt-5 flex flex-1 flex-col gap-2.5 list-none p-0">
              <li
                v-for="feature in planFeatures(plan)"
                :key="feature"
                class="flex items-start gap-2 font-dmSans text-[15px] leading-snug text-black/65"
              >
                <AppIcon name="check-circle" :size="18" class="mt-0.5 shrink-0 text-marketing-green" />
                <span>{{ feature }}</span>
              </li>
            </ul>

            <div class="mt-6 pt-2">
              <AppButton
                v-if="mySub?.plan_id === plan.id"
                type="button"
                variant="outline"
                block
                disabled
                class="!h-11 !cursor-not-allowed !rounded-full !border-black/10 !bg-marketing-surface !text-[15px] !font-bold !text-black/40"
              >
                Aktuálny
              </AppButton>
              <AppButton
                v-else
                type="button"
                :variant="plan.slug === 'plus' ? 'primary' : 'outline'"
                block
                class="!h-11 !rounded-full !text-[15px] !font-bold"
                :disabled="actionLoading === plan.id"
                @click="selectPlan(plan.id, plan.price_monthly_cents)"
              >
                {{ actionLoading === plan.id ? S.loading : S.selectPlan }}
              </AppButton>
            </div>
          </article>
        </div>
      </div>
    </template>

    <AppConfirmDialog
      :open="downgradeOpen"
      variant="confirm"
      :title="S.pricingDowngradeTitle"
      :message="S.pricingDowngradeMessage"
      :confirm-text="S.selectPlan"
      :cancel-text="S.cancel"
      @confirm="confirmDowngrade"
      @cancel="downgradeOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import type { PlanRow } from '~/composables/usePlans'
import { isPlusOrProPlanSlug } from '~/utils/billing-account-access'
import {
  resolvePlanTrialDays,
  subscriptionTrialBadgeLabel,
} from '~/utils/subscription-trial'

const props = withDefaults(
  defineProps<{
    returnBasePath?: string
  }>(),
  {
    returnBasePath: '/cennik',
  },
)

const { config: billingCatalogConfig, load: loadBillingCatalog } = useCatalogBilling()

function planTrialDays(plan: PlanRow): number {
  return resolvePlanTrialDays(plan, billingCatalogConfig.value)
}

const {
  visiblePlans,
  mySub,
  loading,
  loadError,
  actionLoading,
  successFlash,
  downgradeOpen,
  selectPlan,
  confirmDowngrade,
  init,
  applyQueryFlashAndStrip,
} = usePricingPlanCheckout({
  returnBasePath: props.returnBasePath,
  publicMode: true,
  showDowngradeConfirm: true,
})

function planColumnClass(plan: PlanRow): string {
  if (mySub.value?.plan_id === plan.id) {
    return 'bg-[#f0fdf4] ring-2 ring-inset ring-marketing-green/30'
  }
  if (plan.slug === 'plus') {
    return 'bg-[linear-gradient(180deg,rgba(240,253,244,0.9)_0%,rgba(255,255,255,1)_100%)]'
  }
  return ''
}

function planFeatures(plan: PlanRow): string[] {
  const trialDays = planTrialDays(plan)
  const features = [
    ...(trialDays > 0
      ? [subscriptionTrialBadgeLabel(trialDays)]
      : []),
    `${plan.monthly_credits} ${S.credits} / mesiac`,
    `Max. ${plan.max_active_jobs} aktívnych ponúk`,
    S.pricingCvDatabaseTitle,
  ]
  if (isPlusOrProPlanSlug(plan.slug)) {
    features.push(S.pricingCompareApplicantAutoReplies)
  }
  return features
}

const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    void applyQueryFlashAndStrip()
  },
  { immediate: true },
)

onMounted(() => {
  void loadBillingCatalog(true)
  void init()
})
</script>
