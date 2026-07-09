<script setup lang="ts">
import { computed } from 'vue'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import type { VpsEnvironment } from '../../types/infrastructure'
import VpsLoadHistoryChart from './VpsLoadHistoryChart.vue'
import VpsBackendInstancesPanel from './VpsBackendInstancesPanel.vue'
import {
  fmtBytes,
  fmtLoad,
  fmtUptime,
  memPercent,
} from '../../utils/infrastructure-format'

const props = defineProps<{ env: VpsEnvironment }>()

const emit = defineEmits<{
  changed: []
}>()

const memPct = computed(() => {
  const h = props.env.host
  if (!h) return 0
  return memPercent(h.memory_used_bytes, h.memory_total_bytes)
})

const sshOk = computed(
  () => props.env.configured.ssh && !props.env.errors.ssh && props.env.host !== null,
)

const healthOk = computed(() => props.env.api?.health_ok === true)

function containerName(row: { Name?: string; Service?: string }): string {
  return row.Name || row.Service || '—'
}

function barColorClass(percent: number): string {
  if (percent >= 90) return 'bg-red-500'
  if (percent >= 75) return 'bg-amber-500'
  return 'bg-primary-500'
}

function barWidthStyle(percent: number): { width: string } {
  const clamped = Math.min(100, Math.max(0, Number(percent) || 0))
  return { width: `${clamped}%` }
}
</script>

<template>
  <article class="admin-section-card h-full">
    <header class="mb-2 flex flex-wrap items-start justify-between gap-3">
      <h2 class="admin-section-title !mb-0">{{ env.label }}</h2>
      <div class="flex flex-wrap gap-1.5">
        <Tag
          v-if="env.configured.health"
          :value="`API ${healthOk ? 'OK' : 'chyba'}${env.api ? ` · ${env.api.latency_ms} ms` : ''}`"
          :severity="healthOk ? 'success' : 'danger'"
        />
        <Tag
          v-else
          value="Health nie je nakonfigurovaný"
          severity="secondary"
        />

        <Tag
          v-if="env.configured.ssh"
          :value="`SSH ${sshOk ? 'OK' : 'chyba'}`"
          :severity="sshOk ? 'success' : 'danger'"
        />
        <Tag
          v-else
          value="SSH nie je nakonfigurovaný"
          severity="secondary"
        />
      </div>
    </header>

    <Message v-if="env.errors.health" severity="error" :closable="false" class="mb-2">
      Health: {{ env.errors.health }}
    </Message>
    <Message v-if="env.errors.ssh" severity="error" :closable="false" class="mb-2">
      SSH: {{ env.errors.ssh }}
    </Message>
    <Message v-if="env.errors.metrics" severity="error" :closable="false" class="mb-2">
      Metriky: {{ env.errors.metrics }}
    </Message>

    <template v-if="env.host">
      <div class="mb-4 flex flex-wrap gap-3 text-sm text-slate-500">
        <span>{{ env.host.hostname }}</span>
        <span>Uptime {{ fmtUptime(env.host.uptime_seconds) }}</span>
        <span>{{ env.host.cpu_count }} CPU</span>
      </div>

      <div class="mt-4">
        <h3 class="m-0 mb-1 text-sm font-semibold text-slate-600">Zaťaženie CPU</h3>
        <p class="m-0 font-mono text-sm">
          1m {{ fmtLoad(env.host.load_1, env.host.cpu_count) }}
          · 5m {{ fmtLoad(env.host.load_5, env.host.cpu_count) }}
          · 15m {{ fmtLoad(env.host.load_15, env.host.cpu_count) }}
        </p>
      </div>

      <VpsLoadHistoryChart
        :env-id="env.id"
        :enabled="sshOk"
        :refresh-at="env.collected_at"
        :current-cpu-per-core="env.host.cpu_per_core"
      />

      <VpsBackendInstancesPanel
        :env-id="env.id"
        :enabled="sshOk"
        :refresh-at="env.collected_at"
        @changed="emit('changed')"
      />

      <div class="mt-4">
        <h3 class="m-0 mb-1 text-sm font-semibold text-slate-600">RAM</h3>
        <div class="flex flex-col gap-1">
          <div
            class="h-2 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            :aria-valuenow="memPct"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="h-full min-w-0.5 rounded-full transition-all duration-200"
              :class="barColorClass(memPct)"
              :style="barWidthStyle(memPct)"
            />
          </div>
          <span class="text-xs text-slate-600">
            {{ fmtBytes(env.host.memory_used_bytes) }} / {{ fmtBytes(env.host.memory_total_bytes) }}
            ({{ memPct }} %)
          </span>
        </div>
      </div>

      <div v-if="env.host.disk_root" class="mt-4">
        <h3 class="m-0 mb-1 text-sm font-semibold text-slate-600">Disk (root)</h3>
        <div class="flex flex-col gap-1">
          <div class="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full min-w-0.5 rounded-full transition-all duration-200"
              :class="barColorClass(env.host.disk_root.used_percent)"
              :style="barWidthStyle(env.host.disk_root.used_percent)"
            />
          </div>
          <span class="text-xs text-slate-600">
            {{ fmtBytes(env.host.disk_root.used_bytes) }} /
            {{ fmtBytes(env.host.disk_root.total_bytes) }}
            ({{ env.host.disk_root.used_percent }} %)
          </span>
        </div>
      </div>

      <div v-if="env.host.disk_typesense" class="mt-4">
        <h3 class="m-0 mb-1 text-sm font-semibold text-slate-600">Disk (Typesense)</h3>
        <div class="flex flex-col gap-1">
          <div class="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              class="h-full min-w-0.5 rounded-full transition-all duration-200"
              :class="barColorClass(env.host.disk_typesense.used_percent)"
              :style="barWidthStyle(env.host.disk_typesense.used_percent)"
            />
          </div>
          <span class="text-xs text-slate-600">
            {{ fmtBytes(env.host.disk_typesense.used_bytes) }} /
            {{ fmtBytes(env.host.disk_typesense.total_bytes) }}
            ({{ env.host.disk_typesense.used_percent }} %)
          </span>
        </div>
      </div>

      <div v-if="env.host.containers.length" class="mt-4">
        <h3 class="m-0 mb-3 text-sm font-semibold text-slate-600">Kontajnery (docker stats)</h3>
        <DataTable :value="env.host.containers" size="small" striped-rows class="text-sm">
          <Column header="Meno">
            <template #body="{ data: row }">{{ row.Name || '—' }}</template>
          </Column>
          <Column header="CPU">
            <template #body="{ data: row }">{{ row.CPUPerc || '—' }}</template>
          </Column>
          <Column header="RAM">
            <template #body="{ data: row }">{{ row.MemUsage || '—' }}</template>
          </Column>
          <Column header="RAM %">
            <template #body="{ data: row }">{{ row.MemPerc || '—' }}</template>
          </Column>
        </DataTable>
      </div>

      <div v-if="env.host.compose_ps.length" class="mt-4">
        <h3 class="m-0 mb-3 text-sm font-semibold text-slate-600">Compose stav</h3>
        <DataTable :value="env.host.compose_ps" size="small" striped-rows class="text-sm">
          <Column header="Služba">
            <template #body="{ data: row }">{{ containerName(row) }}</template>
          </Column>
          <Column header="Stav">
            <template #body="{ data: row }">{{ row.Status || row.State || '—' }}</template>
          </Column>
          <Column header="Health">
            <template #body="{ data: row }">{{ row.Health || '—' }}</template>
          </Column>
        </DataTable>
      </div>
    </template>

    <div v-if="env.app_metrics" class="mt-4">
      <h3 class="m-0 mb-2 text-sm font-semibold text-slate-600">Nest API (Prometheus)</h3>
      <ul class="m-0 list-disc pl-5 text-sm text-slate-600">
        <li v-if="env.app_metrics.rss_bytes != null">
          RSS {{ fmtBytes(env.app_metrics.rss_bytes) }}
        </li>
        <li v-if="env.app_metrics.heap_used_bytes != null">
          Heap {{ fmtBytes(env.app_metrics.heap_used_bytes) }}
        </li>
        <li v-if="env.app_metrics.eventloop_lag_s != null">
          Event loop {{ (env.app_metrics.eventloop_lag_s * 1000).toFixed(1) }} ms
        </li>
        <li v-if="env.app_metrics.http_requests_total != null">
          HTTP požiadavky {{ env.app_metrics.http_requests_total.toLocaleString('sk-SK') }}
        </li>
      </ul>
    </div>
    <p
      v-else-if="env.configured.metrics"
      class="m-0 mt-4 text-sm text-slate-500"
    >
      Prometheus metriky sa nepodarilo načítať.
    </p>
    <p
      v-else-if="!env.configured.metrics"
      class="m-0 mt-4 text-sm text-slate-500"
    >
      Metriky vypnuté — nastavte <code>VPS_{{ env.id === 'staging' ? 'STAGING' : 'PRODUCTION' }}_METRICS_*</code> v <code>api/.env</code>.
    </p>

    <p v-if="!env.configured.ssh && !env.configured.health" class="m-0 mt-4 text-sm text-slate-500">
      Toto prostredie nie je nakonfigurované. Pridajte premenné <code>VPS_{{ env.id === 'staging' ? 'STAGING' : 'PRODUCTION' }}_*</code> do <code>api/.env</code>.
    </p>
  </article>
</template>
