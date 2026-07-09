<script setup lang="ts">
import { computed } from 'vue'
import type { AdminAnalyticsSummary } from '../../types/analytics'
import { fmtMoneyCents, fmtNum } from '../../utils/analytics-format'

const props = defineProps<{
  summary: AdminAnalyticsSummary
  priorSummary?: AdminAnalyticsSummary | null
}>()

function delta(
  current: number | null | undefined,
  prior: number | null | undefined,
): string | null {
  if (priorSummaryMissing()) return null
  const c = typeof current === 'number' ? current : Number(current)
  const p = typeof prior === 'number' ? prior : Number(prior)
  if (!Number.isFinite(c) || !Number.isFinite(p)) return null
  if (p === 0) return c > 0 ? '+100 %' : null
  const pct = ((c - p) / p) * 100
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)} %`
}

function priorSummaryMissing(): boolean {
  return props.priorSummary === undefined
}

const prior = computed(() => props.priorSummary ?? null)

const cards = computed(() => {
  const f = props.summary.funnel
  const pf = prior.value?.funnel
  const r = props.summary.revenue
  const c = props.summary.churn
  const pc = prior.value?.churn
  return [
    { label: 'Registrácie', value: fmtNum(f?.signups), hint: 'v období', change: delta(f?.signups, pf?.signups) },
    { label: 'Kúpa kreditov', value: fmtNum(f?.credit_purchases_distinct_users), hint: 'unikátnych užívateľov', change: delta(f?.credit_purchases_distinct_users, pf?.credit_purchases_distinct_users) },
    { label: 'Uchádzači', value: fmtNum(f?.applicants_distinct), hint: 'prihlásení na ponuky', change: delta(f?.applicants_distinct, pf?.applicants_distinct) },
    { label: 'Prijatí', value: fmtNum(f?.hires_distinct), hint: 'status accepted', change: delta(f?.hires_distinct, pf?.hires_distinct) },
    { label: 'MRR', value: fmtMoneyCents(r?.mrr_cents), hint: 'mesačne', change: null },
    { label: 'ARR', value: fmtMoneyCents(r?.arr_cents), hint: 'odhad ročne', change: null },
    { label: 'Platiaci predplatitelia', value: fmtNum(r?.active_paying_subscribers), hint: 'aktívne', change: null },
    { label: 'ARPU', value: fmtMoneyCents(r?.arpu_cents), hint: 'na predplatiteľa', change: null },
    { label: 'Zrušené predplatné', value: fmtNum(c?.canceled_subscriptions_in_period), hint: 'v období', change: delta(c?.canceled_subscriptions_in_period, pc?.canceled_subscriptions_in_period) },
  ]
})
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
    <div
      v-for="(card, i) in cards"
      :key="i"
      class="admin-section-card flex flex-col gap-1.5 !py-4"
    >
      <span class="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {{ card.label }}
      </span>
      <div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span class="text-2xl font-bold tabular-nums leading-none text-slate-900">
          {{ card.value }}
        </span>
        <span
          v-if="card.change"
          class="text-xs font-semibold"
          :class="
            card.change.startsWith('+')
              ? 'text-primary-700'
              : card.change.startsWith('-')
                ? 'text-red-600'
                : 'text-slate-500'
          "
        >
          {{ card.change }}
        </span>
      </div>
      <p v-if="card.change" class="m-0 text-xs text-slate-400">vs predch. obdobie</p>
      <p class="m-0 text-xs text-slate-500">{{ card.hint }}</p>
    </div>
  </div>
</template>
