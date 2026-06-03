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
  const pr = prior.value?.revenue
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
  <div class="kpi-grid">
    <div v-for="(card, i) in cards" :key="i" class="kpi-card">
      <span class="kpi-label">{{ card.label }}</span>
      <span class="kpi-value">{{ card.value }}</span>
      <span v-if="card.change" class="kpi-change" :class="{ 'kpi-change--up': card.change.startsWith('+'), 'kpi-change--down': card.change.startsWith('-') }">
        {{ card.change }} vs predch. obdobie
      </span>
      <span class="kpi-hint">{{ card.hint }}</span>
    </div>
  </div>
</template>

<style scoped>
.kpi-change {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink3);
}

.kpi-change--up {
  color: var(--g700);
}

.kpi-change--down {
  color: var(--danger);
}
</style>
