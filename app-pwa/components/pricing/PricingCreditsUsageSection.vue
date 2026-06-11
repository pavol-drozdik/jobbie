<template>
  <section
    class="overflow-hidden rounded-[20px] bg-white px-5 py-5 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.12)] sm:px-8 sm:py-6"
    aria-labelledby="pricing-credits-usage-heading"
  >
    <h2
      id="pricing-credits-usage-heading"
      class="m-0 font-dmSans text-[17px] font-extrabold text-black"
    >
      {{ S.pricingUsageTitle }}
    </h2>
    <p class="m-0 mt-2 font-dmSans text-[15px] leading-relaxed text-black/60">
      {{ S.pricingCreditsCardDesc }}
    </p>
    <p
      v-if="planNameSk"
      class="m-0 mt-3 font-dmSans text-sm font-semibold text-black/55"
    >
      {{ S.pricingCreditsYourPlan.replace('{plan}', planNameSk) }}
    </p>
    <ul class="m-0 mt-4 list-none divide-y divide-black/[0.06] p-0">
      <li
        v-for="row in usageRows"
        :key="row.key"
        class="flex items-center justify-between gap-4 py-3 font-dmSans text-[15px] first:pt-0 last:pb-0"
      >
        <span class="min-w-0 font-medium text-black/75">{{ row.label }}</span>
        <span
          class="shrink-0 font-bold tabular-nums"
          :class="row.cost < 1 ? 'text-marketing-green' : 'text-black'"
        >
          {{ row.costLabel }}
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import {
  getPayableCreditUsageRows,
  type PlanTierCreditCostsMatrix,
} from '~/utils/plan-tier-credit-costs'
import { S } from '~/utils/strings'

const props = withDefaults(
  defineProps<{
    planSlug?: string | null
    planNameSk?: string | null
    planTierCreditCosts: PlanTierCreditCostsMatrix
  }>(),
  {
    planSlug: null,
    planNameSk: null,
  },
)

const usageRows = computed(() =>
  getPayableCreditUsageRows(
    props.planTierCreditCosts,
    props.planSlug?.trim() || 'zadarmo',
  ),
)
</script>
