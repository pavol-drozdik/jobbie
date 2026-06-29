<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { adminApi } from '../../composables/adminApi'
import { useAdminChart } from '../../composables/useAdminChart'
import type {
  InfraMetricsRange,
  VpsMetricsHistory,
  VpsMetricsHistoryPoint,
} from '../../types/infrastructure'

const props = defineProps<{
  envId: 'staging' | 'production'
  enabled: boolean
  refreshAt?: string | null
  currentCpuPerCore?: number[]
}>()

const ranges: Array<{ id: InfraMetricsRange; label: string }> = [
  { id: '1h', label: '1 h' },
  { id: '24h', label: '24 h' },
  { id: '2w', label: '2 týž.' },
  { id: '1m', label: '1 mes.' },
]

const RANGE_MS: Record<InfraMetricsRange, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '2w': 14 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
}

const range = ref<InfraMetricsRange>('24h')
const loading = ref(false)
const error = ref<string | null>(null)
const history = ref<VpsMetricsHistory | null>(null)
const overviewCanvasRef = ref<HTMLCanvasElement | null>(null)
const coresCanvasRef = ref<HTMLCanvasElement | null>(null)
const { mountLine, mountBar, destroyAll } = useAdminChart()

const points = computed(() => history.value?.points ?? [])

const hasCoreHistory = computed(() =>
  points.value.some((p) => (p.cpu_per_core?.length ?? 0) > 0),
)

const hasLiveCores = computed(() => (props.currentCpuPerCore?.length ?? 0) > 0)

const dataSpanMs = computed(() => {
  const h = history.value
  if (h?.coverage_from && h?.coverage_to) {
    return (
      new Date(h.coverage_to).getTime() - new Date(h.coverage_from).getTime()
    )
  }
  const rows = points.value
  if (rows.length < 2) {
    return 0
  }
  return (
    new Date(rows[rows.length - 1].t).getTime() -
    new Date(rows[0].t).getTime()
  )
})

const coverageHint = computed(() => {
  if (!history.value?.coverage_from || points.value.length < 2) {
    return null
  }
  const requested = RANGE_MS[range.value]
  const span = dataSpanMs.value
  if (span >= requested * 0.9) {
    return null
  }
  const hours = span / (60 * 60 * 1000)
  if (hours < 48) {
    const h = Math.max(1, Math.round(hours))
    return `Dostupná história: ~${h} h — dlhšie obdobie sa naplní postupne pri obnovách.`
  }
  const days = Math.max(1, Math.round(hours / 24))
  return `Dostupná história: ~${days} dní — dlhšie obdobie sa naplní postupne pri obnovách.`
})

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n))
}

function cpuOverviewPct(point: VpsMetricsHistoryPoint): number {
  if (point.max_core_pct != null) {
    return clampPct(point.max_core_pct)
  }
  return clampPct(point.load_pct)
}

async function loadHistory() {
  if (!props.enabled) {
    history.value = null
    renderCharts()
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
    renderCharts()
    return
  }
  history.value = res.data ?? null
  renderCharts()
}

function formatLabel(iso: string, spanMs: number): string {
  const d = new Date(iso)
  const showTime = spanMs < 3 * 24 * 60 * 60 * 1000
  if (showTime) {
    return d.toLocaleString('sk-SK', {
      day: 'numeric',
      month: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return d.toLocaleDateString('sk-SK', { day: 'numeric', month: 'numeric' })
}

function renderCharts() {
  destroyAll()
  void nextTick().then(() => {
    const rows = points.value

    if (overviewCanvasRef.value && rows.length > 0) {
      const spanMs = dataSpanMs.value
      const labels = rows.map((p) => formatLabel(p.t, spanMs))
      const usesCoreCpu = rows.some((p) => p.max_core_pct != null)
      mountLine(
        overviewCanvasRef.value,
        labels,
        [
          {
            label: usesCoreCpu ? 'CPU (max jadro)' : 'CPU load (priemer)',
            data: rows.map(cpuOverviewPct),
          },
          { label: 'RAM', data: rows.map((p) => clampPct(p.mem_pct)) },
        ],
        { yMax: 100, yTickSuffix: '%' },
      )
    }

    if (!coresCanvasRef.value) {
      return
    }

    if (hasCoreHistory.value && rows.length > 0) {
      const spanMs = dataSpanMs.value
      const labels = rows.map((p) => formatLabel(p.t, spanMs))
      const coreCount = Math.max(
        ...rows.map((p) => p.cpu_per_core?.length ?? 0),
      )
      const coreDatasets = Array.from({ length: coreCount }, (_, i) => ({
        label: `CPU ${i}`,
        data: rows.map((p) =>
          Math.min(100, Math.max(0, p.cpu_per_core?.[i] ?? 0)),
        ),
      }))
      mountLine(coresCanvasRef.value, labels, coreDatasets, {
        yMax: 100,
        yTickSuffix: '%',
        fill: false,
      })
      return
    }

    const live = props.currentCpuPerCore ?? []
    if (live.length > 0) {
      mountBar(
        coresCanvasRef.value,
        live.map((_, i) => `CPU ${i}`),
        [
          {
            label: 'Využitie',
            data: live.map((n) => Math.min(100, Math.max(0, Math.round(n)))),
          },
        ],
      )
    }
  })
}

onMounted(() => {
  void loadHistory()
})

watch([range, () => props.enabled, () => props.refreshAt], () => {
  void loadHistory()
})

watch(() => props.currentCpuPerCore, () => {
  renderCharts()
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
      Grafy sa zobrazia po úspešnom SSH načítaní host metrík.
    </p>
    <p v-else-if="loading && !history" class="muted infra-hint">Načítavam históriu…</p>
    <p v-else-if="error" class="infra-error">{{ error }}</p>
    <template v-else>
      <p v-if="coverageHint" class="muted infra-hint">{{ coverageHint }}</p>
      <p
        v-if="points.length === 0 && !hasLiveCores"
        class="muted infra-hint"
      >
        Zatiaľ žiadne dáta. História sa ukladá pri obnove (max. každé 4 min) a na pozadí každých
        5 min, kým beží admin API.
      </p>

      <div
        v-if="points.length > 0 || hasLiveCores"
        class="infra-charts"
      >
        <div v-if="points.length > 0" class="infra-chart-block">
          <h4 class="infra-chart-block__title">CPU a RAM</h4>
          <div class="chart-box chart-box--sm">
            <canvas ref="overviewCanvasRef" />
          </div>
        </div>

        <div v-if="hasCoreHistory || hasLiveCores" class="infra-chart-block">
          <h4 class="infra-chart-block__title">Jadrá CPU</h4>
          <p v-if="!hasCoreHistory && hasLiveCores" class="muted infra-chart-block__hint">
            Okamžitá vzorka — časový graf sa naplní po ďalších obnoveniach.
          </p>
          <p
            v-else-if="!hasCoreHistory && !hasLiveCores"
            class="muted infra-chart-block__hint"
          >
            Per-core dáta zatiaľ nie sú k dispozícii.
          </p>
          <div
            v-if="hasCoreHistory || hasLiveCores"
            class="chart-box chart-box--sm"
          >
            <canvas ref="coresCanvasRef" />
          </div>
        </div>
      </div>
    </template>
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

.infra-charts {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 0.5rem;
}

.infra-chart-block__title {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink2);
}

.infra-chart-block__hint {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
}
</style>
