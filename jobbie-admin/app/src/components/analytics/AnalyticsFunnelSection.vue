<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { AdminAnalyticsSummary } from '../../types/analytics'
import { fmtNum, fmtPct } from '../../utils/analytics-format'
import { useAdminChart } from '../../composables/useAdminChart'

const props = defineProps<{ summary: AdminAnalyticsSummary }>()

const funnelCanvas = ref<HTMLCanvasElement | null>(null)
const { mountHorizontalFunnel, destroyAll } = useAdminChart()

const steps = computed(() => {
  const f = props.summary.funnel
  if (!f) return []
  return [
    { key: 'signup', label: 'Registrácia', count: f.signups, pct: null },
    {
      key: 'credit',
      label: 'Kúpa kreditov',
      count: f.credit_purchases_distinct_users,
      pct: f.conversion_signup_to_credit,
    },
    {
      key: 'apply',
      label: 'Prihlásenie na ponuku',
      count: f.applicants_distinct,
      pct: f.conversion_signup_to_apply,
    },
    {
      key: 'hire',
      label: 'Prijatie',
      count: f.hires_distinct,
      pct: f.conversion_apply_to_hire,
    },
  ]
})

function renderChart() {
  destroyAll()
  const canvas = funnelCanvas.value
  const f = props.summary.funnel
  if (!canvas || !f) return
  mountHorizontalFunnel(
    canvas,
    ['Registrácia', 'Kúpa kreditov', 'Prihlásenie', 'Prijatie'],
    [
      f.signups,
      f.credit_purchases_distinct_users,
      f.applicants_distinct,
      f.hires_distinct,
    ],
  )
}

onMounted(renderChart)
watch(() => props.summary.funnel, renderChart)
</script>

<template>
  <section class="section-card">
    <h2 class="section-title">Funnel</h2>
    <p v-if="!summary.funnel" class="muted">Žiadne dáta funnelu.</p>
    <template v-else>
      <div class="funnel-steps">
        <div v-for="(s, i) in steps" :key="s.key" class="funnel-step">
          <div class="funnel-step-head">
            <span class="funnel-step-num">{{ i + 1 }}</span>
            <span class="funnel-step-label">{{ s.label }}</span>
          </div>
          <span class="funnel-step-count">{{ fmtNum(s.count) }}</span>
          <span v-if="s.pct != null" class="funnel-step-pct">Konverzia: {{ fmtPct(s.pct) }}</span>
        </div>
      </div>
      <div class="chart-box chart-box--sm">
        <canvas ref="funnelCanvas" />
      </div>
    </template>
  </section>
</template>
