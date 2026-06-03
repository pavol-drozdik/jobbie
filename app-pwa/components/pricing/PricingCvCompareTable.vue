<template>
  <div class="mt-8 overflow-hidden rounded-[20px] bg-white px-4 py-5 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.12)] sm:px-6 sm:py-6">
    <h3 class="m-0 mb-5 font-dmSans text-[17px] font-extrabold text-black">
      {{ S.pricingCvCompareTitle }}
    </h3>
    <div class="-mx-1 overflow-x-auto px-1">
      <div class="min-w-[640px]">
        <div
          class="grid grid-cols-5 gap-3 border-b border-black/10 pb-4 font-dmSans text-[13px] font-bold text-black/55"
        >
          <div class="pr-2" />
          <div
            v-for="plan in plans"
            :key="plan.slug"
            class="text-center text-[15px] text-black"
          >
            {{ plan.name_sk }}
          </div>
        </div>
        <div
          v-for="row in cvRowsBeforeTier"
          :key="row.key"
          class="grid grid-cols-5 gap-3 border-b border-black/[0.06] py-3.5 font-dmSans text-[14px] last:border-b-0"
        >
          <div class="pr-2 font-medium text-black/70">
            {{ row.label }}
          </div>
          <div
            v-for="plan in plans"
            :key="`${row.key}-${plan.slug}`"
            class="text-center font-semibold"
            :class="cellClass(plan, row)"
          >
            {{ cellValue(plan, row) }}
          </div>
        </div>
        <div
          v-for="row in tierCreditRows"
          :key="row.key"
          class="grid grid-cols-5 gap-3 border-b border-black/[0.06] py-3.5 font-dmSans text-[14px] last:border-b-0"
        >
          <div class="pr-2 font-medium text-black/70">
            {{ row.label }}
          </div>
          <div
            v-for="plan in plans"
            :key="`${row.key}-${plan.slug}`"
            class="text-center font-semibold"
            :class="tierCellClass(plan, row.key)"
          >
            {{ tierCellValue(plan.slug, row.key) }}
          </div>
        </div>
        <div
          v-for="row in cvRowsAfterTier"
          :key="row.key"
          class="grid grid-cols-5 gap-3 border-b border-black/[0.06] py-3.5 font-dmSans text-[14px] last:border-b-0"
        >
          <div class="pr-2 font-medium text-black/70">
            {{ row.label }}
          </div>
          <div
            v-for="plan in plans"
            :key="`${row.key}-${plan.slug}`"
            class="text-center font-semibold"
            :class="cellClass(plan, row)"
          >
            {{ cellValue(plan, row) }}
          </div>
        </div>
        <div
          v-for="row in planFeatureRows"
          :key="row.key"
          class="grid grid-cols-5 gap-3 border-b border-black/[0.06] py-3.5 font-dmSans text-[14px] last:border-b-0"
        >
          <div class="pr-2 font-medium text-black/70">
            {{ row.label }}
          </div>
          <div
            v-for="plan in plans"
            :key="`${row.key}-${plan.slug}`"
            class="text-center font-semibold"
            :class="featureCellClass(plan, row.key)"
          >
            {{ featureCellValue(plan, row.key) }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { S } from '~/utils/strings'
import type { PlanRow } from '~/composables/usePlans'
import { cvMonthlyLimitLabel, type CvLimitKind } from '~/utils/pricing-cv-limits'
import {
  formatPlanTierCreditCostLabel,
  getPlanTierCreditCost,
  parsePlanTierCreditCostsFromConfig,
  PLAN_COMPARE_FEATURE_ROWS,
  PLAN_TIER_COMPARE_ROWS,
  type PlanTierCreditAction,
  type PlanTierCreditCostsMatrix,
} from '~/utils/plan-tier-credit-costs'
import { isPlusOrProPlanSlug } from '~/utils/billing-account-access'

const props = defineProps<{
  plans: PlanRow[]
  planTierCreditCosts?: PlanTierCreditCostsMatrix | null
}>()

type CvCompareRow = {
  key: string
  kind: CvLimitKind | 'browse' | 'credits' | 'jobs'
  label: string
}

const cvRowsBeforeTier: CvCompareRow[] = [
  { key: 'credits', kind: 'credits', label: S.pricingMonthlyCredits },
  { key: 'jobs', kind: 'jobs', label: 'Aktívne ponuky' },
]

const cvRowsAfterTier: CvCompareRow[] = [
  { key: 'browse', kind: 'browse', label: S.pricingCvBrowse },
  { key: 'unlock', kind: 'unlock', label: S.pricingCvUnlock },
  { key: 'contact', kind: 'contact', label: S.pricingCvContact },
  { key: 'pdf', kind: 'pdf', label: S.pricingCvPdf },
]

const tierCreditRows = PLAN_TIER_COMPARE_ROWS
const planFeatureRows = PLAN_COMPARE_FEATURE_ROWS

const plans = computed(() =>
  [...props.plans].sort((a, b) => a.sort_order - b.sort_order),
)

const tierCosts = computed(() =>
  props.planTierCreditCosts ??
    parsePlanTierCreditCostsFromConfig(null),
)

function cellValue(plan: PlanRow, row: CvCompareRow): string {
  if (row.kind === 'credits') return `${plan.monthly_credits} ${S.credits}`
  if (row.kind === 'jobs') return String(plan.max_active_jobs)
  if (row.kind === 'browse') return S.pricingCvFreeLabel
  return cvMonthlyLimitLabel(plan, row.kind)
}

function cellClass(plan: PlanRow, row: CvCompareRow): string {
  const value = cellValue(plan, row)
  if (row.kind === 'browse') return 'text-marketing-green'
  if (row.kind === 'credits' || row.kind === 'jobs') return 'text-black'
  if (value === S.pricingCvUnlimited || value === S.pricingCvFreeLabel) {
    return 'text-marketing-green'
  }
  return 'text-black/65'
}

function tierCellValue(planSlug: string, action: PlanTierCreditAction): string {
  const cost = getPlanTierCreditCost(tierCosts.value, planSlug, action)
  return formatPlanTierCreditCostLabel(cost)
}

function tierCellClass(plan: PlanRow, action: PlanTierCreditAction): string {
  const cost = getPlanTierCreditCost(tierCosts.value, plan.slug, action)
  if (cost < 1) return 'text-marketing-green'
  return 'text-black/65'
}

function featureIncluded(plan: PlanRow, rowKey: string): boolean {
  if (rowKey === 'applicantAutoReplies') {
    return isPlusOrProPlanSlug(plan.slug)
  }
  return false
}

function featureCellValue(plan: PlanRow, rowKey: string): string {
  return featureIncluded(plan, rowKey) ? S.pricingCompareIncluded : S.pricingCompareNotIncluded
}

function featureCellClass(plan: PlanRow, rowKey: string): string {
  return featureIncluded(plan, rowKey) ? 'text-marketing-green' : 'text-black/45'
}
</script>
