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

const DEPLOY_DOC_URL =
  'https://github.com/Pr3vestTheDuck/jobbie/blob/main/websupport-vps-deployment/README-DEPLOYMENT.md#jobbie-admin-infra-history-sampler-optional'

const historySourceHint = computed(() => {
  const source = history.value?.history_source
  if (source === 'mixed') {
    return 'Kombinovaná história (VPS + aktuálna relácia).'
  }
  if (source === 'local') {
    return null
  }
  return null
})

const localOnlyHint = computed(() => {
  if (history.value?.history_source !== 'local') {
    return null
  }
  return 'História len z tejto relácie admin aplikácie. Nasadením VPS sampleru získate kontinuálnu históriu.'
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
  <div>
    <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
      <h3 class="m-0 text-sm font-semibold text-slate-800">História zaťaženia</h3>
      <div class="flex flex-wrap gap-1" role="tablist" aria-label="Časové obdobie">
        <button
          v-for="item in ranges"
          :key="item.id"
          type="button"
          class="rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors"
          :class="
            range === item.id
              ? 'border-primary-300 bg-primary-50 text-primary-800'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          "
          role="tab"
          :aria-selected="range === item.id"
          @click="range = item.id"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <p v-if="!enabled" class="m-0 text-sm text-slate-500">
      Grafy sa zobrazia po úspešnom SSH načítaní host metrík.
    </p>
    <p v-else-if="loading && !history" class="m-0 text-sm text-slate-500">Načítavam históriu…</p>
    <p v-else-if="error" class="m-0 text-sm text-red-600">{{ error }}</p>
    <template v-else>
      <p
        v-if="localOnlyHint"
        class="m-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
      >
        {{ localOnlyHint }}
        <a
          :href="DEPLOY_DOC_URL"
          target="_blank"
          rel="noopener noreferrer"
          class="ml-1 font-semibold text-amber-950 underline"
        >
          Návod na nasadenie
        </a>
      </p>
      <p v-else-if="historySourceHint" class="m-0 text-sm text-slate-500">
        {{ historySourceHint }}
      </p>
      <p v-if="coverageHint" class="m-0 text-sm text-slate-500">{{ coverageHint }}</p>
      <p
        v-if="points.length === 0 && !hasLiveCores"
        class="m-0 text-sm text-slate-500"
      >
        Zatiaľ žiadne dáta. História sa ukladá pri obnove (max. každé 4 min) a na pozadí každých
        5 min, kým beží admin API.
      </p>

      <div
        v-if="points.length > 0 || hasLiveCores"
        class="mt-2 flex flex-col gap-5"
      >
        <div v-if="points.length > 0">
          <h4 class="m-0 mb-1 text-sm font-semibold text-slate-700">CPU a RAM</h4>
          <div class="chart-box chart-box--sm">
            <canvas ref="overviewCanvasRef" />
          </div>
        </div>

        <div v-if="hasCoreHistory || hasLiveCores">
          <h4 class="m-0 mb-1 text-sm font-semibold text-slate-700">Jadrá CPU</h4>
          <p v-if="!hasCoreHistory && hasLiveCores" class="m-0 mb-1 text-xs text-slate-500">
            Okamžitá vzorka — časový graf sa naplní po ďalších obnoveniach.
          </p>
          <p
            v-else-if="!hasCoreHistory && !hasLiveCores"
            class="m-0 mb-1 text-xs text-slate-500"
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
