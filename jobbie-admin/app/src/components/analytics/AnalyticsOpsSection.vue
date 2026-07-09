<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
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
  <section class="admin-section-card">
    <h2 class="admin-section-title">API a prevádzka</h2>
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
    <DataTable
      :value="sortedLatency"
      size="small"
      striped-rows
      class="mt-4 text-sm"
    >
      <template #empty>
        <span class="text-slate-500">Žiadne API logy v období.</span>
      </template>
      <Column header="Path">
        <template #body="{ data: row }">
          <span class="mono">{{ row.path }}</span>
        </template>
      </Column>
      <Column field="n" header="Požiadavky" />
      <Column header="p50">
        <template #body="{ data: row }">{{ row.p50_ms }} ms</template>
      </Column>
      <Column header="p95">
        <template #body="{ data: row }">{{ row.p95_ms }} ms</template>
      </Column>
      <Column header="Priemer">
        <template #body="{ data: row }">{{ row.avg_ms }} ms</template>
      </Column>
    </DataTable>
  </section>
</template>
