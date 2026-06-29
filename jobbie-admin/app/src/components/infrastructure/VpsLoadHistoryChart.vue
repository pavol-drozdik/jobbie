<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { adminApi } from '../../composables/adminApi'
import { useAdminChart } from '../../composables/useAdminChart'
import type { InfraMetricsRange, VpsMetricsHistory } from '../../types/infrastructure'

const props = defineProps<{
  envId: 'staging' | 'production'
  enabled: boolean
  refreshAt?: string | null
}>()

const ranges: Array<{ id: InfraMetricsRange; label: string }> = [
  { id: '1h', label: '1 h' },
  { id: '24h', label: '24 h' },
  { id: '2w', label: '2 týž.' },
  { id: '1m', label: '1 mes.' },
]

const range = ref<InfraMetricsRange>('24h')
const loading = ref(false)
const error = ref<string | null>(null)
const history = ref<VpsMetricsHistory | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const { mountLine, destroyAll } = useAdminChart()

async function loadHistory() {
  if (!props.enabled) {
    history.value = null
    return
  }
  loading.value = true
  error.value = null
  const res = await adminApi<VpsMetricsHistory>(
    `/admin/infrastructure/${props.envId}/history`,
    { query: { range: range.value } },
  )
  loading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 200) || `HTTP ${res.status}`
    history.value = null
    renderChart()
    return
  }
  history.value = res.data ?? null
  renderChart()
}

function formatLabel(iso: string, selected: InfraMetricsRange): string {
  const d = new Date(iso)
  if (selected === '1h' || selected === '24h') {
    return d.toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' })
}

function renderChart() {
  destroyAll()
  const points = history.value?.points ?? []
  if (!canvasRef.value || points.length === 0) {
    return
  }
  const labels = points.map((p) => formatLabel(p.t, range.value))
  mountLine(
    canvasRef.value,
    labels,
    [
      { label: 'CPU load', data: points.map((p) => p.load_pct) },
      { label: 'RAM', data: points.map((p) => p.mem_pct) },
    ],
    { yMax: 100, yTickSuffix: '%' },
  )
}

onMounted(() => {
  void loadHistory()
})

watch([range, () => props.enabled, () => props.refreshAt], () => {
  void loadHistory()
})
</script>

<template>
  <div class="infra-section">
    <div class="infra-history__header">
      <h3 class="infra-section__title">História zaťaženia</h3>
      <div class="infra-range-tabs" role="tablist" aria-label="Časové obdobie">
        <button
          v-for="item in ranges"
          :key="item.id"
          type="button"
          class="infra-range-tab"
          :class="{ 'infra-range-tab--active': range === item.id }"
          role="tab"
          :aria-selected="range === item.id"
          @click="range = item.id"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <p v-if="!enabled" class="muted infra-hint">
      Graf sa zobrazí po úspešnom SSH načítaní host metrík.
    </p>
    <p v-else-if="loading && !history" class="muted infra-hint">Načítavam históriu…</p>
    <p v-else-if="error" class="infra-error">{{ error }}</p>
    <p v-else-if="history && history.points.length === 0" class="muted infra-hint">
      Zatiaľ žiadne dáta. História sa ukladá pri obnove (max. každé 4 min) a na pozadí každých 5 min,
      kým beží admin API.
    </p>
    <div v-else class="chart-box chart-box--sm">
      <canvas ref="canvasRef" />
    </div>
  </div>
</template>

<style scoped>
.infra-history__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}

.infra-range-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.infra-range-tab {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--ink2);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  cursor: pointer;
}

.infra-range-tab--active {
  background: var(--g100);
  border-color: var(--g300);
  color: var(--g700);
}

.infra-hint {
  margin: 0;
  font-size: 0.85rem;
}
</style>
