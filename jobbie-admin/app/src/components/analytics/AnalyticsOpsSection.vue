<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { AdminAnalyticsSummary } from '../../types/analytics'
import { useAdminChart } from '../../composables/useAdminChart'

const props = defineProps<{ summary: AdminAnalyticsSummary }>()

const latencyCanvas = ref<HTMLCanvasElement | null>(null)
const { mountBar, destroyAll } = useAdminChart()

const sortedLatency = computed(() =>
  [...props.summary.api_latency_by_path].sort((a, b) => b.p95_ms - a.p95_ms),
)

const topLatency = computed(() => sortedLatency.value.slice(0, 8))

function renderChart() {
  destroyAll()
  const canvas = latencyCanvas.value
  const rows = topLatency.value
  if (!canvas || rows.length === 0) return
  mountBar(
    canvas,
    rows.map((r) => r.path.replace(/^\/api\//, '')),
    [{ label: 'p95 (ms)', data: rows.map((r) => r.p95_ms), color: '#f59e0b' }],
  )
}

onMounted(renderChart)
watch(topLatency, renderChart)
</script>

<template>
  <section class="section-card">
    <h2 class="section-title">API a prevádzka</h2>
    <p class="ops-note">
      Latencia vychádza z tabuľky <code>api_request_logs</code> (vzorkované podľa
      <code>AUDIT_API_SAMPLE_RATE</code> na hlavnom API). Pre presné HTTP metriky v produkcii použite
      Prometheus <code>GET /metrics</code> na <code>backend-ts</code>.
    </p>
    <p class="ops-note">
      Produktové webové metriky (PostHog, GA4, Clarity, Search Console) sú v sekcii Web &amp;
      marketing vyššie.
    </p>
    <div v-if="topLatency.length" class="chart-box chart-box--sm">
      <canvas ref="latencyCanvas" />
    </div>
    <div class="table-wrap" style="margin-top: 1rem">
      <table class="data-table">
        <thead>
          <tr>
            <th>Path</th>
            <th>Požiadavky</th>
            <th>p50</th>
            <th>p95</th>
            <th>Priemer</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sortedLatency" :key="row.path">
            <td class="mono">{{ row.path }}</td>
            <td>{{ row.n }}</td>
            <td>{{ row.p50_ms }} ms</td>
            <td>{{ row.p95_ms }} ms</td>
            <td>{{ row.avg_ms }} ms</td>
          </tr>
        </tbody>
      </table>
      <p v-if="sortedLatency.length === 0" class="muted">Žiadne API logy v období.</p>
    </div>
  </section>
</template>
