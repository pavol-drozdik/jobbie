<script setup lang="ts">
import { computed } from 'vue'
import type { VpsEnvironment } from '../../types/infrastructure'
import {
  barClass,
  fmtBytes,
  fmtLoad,
  fmtUptime,
  memPercent,
} from '../../utils/infrastructure-format'

const props = defineProps<{ env: VpsEnvironment }>()

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
</script>

<template>
  <article class="section-card infra-card">
    <header class="infra-card__header">
      <h2 class="section-title">{{ env.label }}</h2>
      <div class="infra-chips">
        <span
          v-if="env.configured.health"
          class="infra-chip"
          :class="healthOk ? 'infra-chip--ok' : 'infra-chip--bad'"
        >
          API {{ healthOk ? 'OK' : 'chyba' }}
          <template v-if="env.api"> · {{ env.api.latency_ms }} ms</template>
        </span>
        <span
          v-else
          class="infra-chip infra-chip--muted"
        >Health nie je nakonfigurovaný</span>

        <span
          v-if="env.configured.ssh"
          class="infra-chip"
          :class="sshOk ? 'infra-chip--ok' : 'infra-chip--bad'"
        >
          SSH {{ sshOk ? 'OK' : 'chyba' }}
        </span>
        <span
          v-else
          class="infra-chip infra-chip--muted"
        >SSH nie je nakonfigurovaný</span>
      </div>
    </header>

    <p v-if="env.errors.health" class="infra-error">Health: {{ env.errors.health }}</p>
    <p v-if="env.errors.ssh" class="infra-error">SSH: {{ env.errors.ssh }}</p>
    <p v-if="env.errors.metrics" class="infra-error">Metriky: {{ env.errors.metrics }}</p>

    <template v-if="env.host">
      <div class="infra-meta muted">
        <span>{{ env.host.hostname }}</span>
        <span>Uptime {{ fmtUptime(env.host.uptime_seconds) }}</span>
        <span>{{ env.host.cpu_count }} CPU</span>
      </div>

      <div class="infra-section">
        <h3 class="infra-section__title">Zaťaženie CPU</h3>
        <p class="infra-load">
          1m {{ fmtLoad(env.host.load_1, env.host.cpu_count) }}
          · 5m {{ fmtLoad(env.host.load_5, env.host.cpu_count) }}
          · 15m {{ fmtLoad(env.host.load_15, env.host.cpu_count) }}
        </p>
      </div>

      <div class="infra-section">
        <h3 class="infra-section__title">RAM</h3>
        <div class="infra-bar">
          <div
            class="infra-bar__track"
            role="progressbar"
            :aria-valuenow="memPct"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div :class="barClass(memPct)" :style="{ width: `${memPct}%` }" />
          </div>
          <span class="infra-bar__label">
            {{ fmtBytes(env.host.memory_used_bytes) }} / {{ fmtBytes(env.host.memory_total_bytes) }}
            ({{ memPct }} %)
          </span>
        </div>
      </div>

      <div v-if="env.host.disk_root" class="infra-section">
        <h3 class="infra-section__title">Disk (root)</h3>
        <div class="infra-bar">
          <div class="infra-bar__track">
            <div
              :class="barClass(env.host.disk_root.used_percent)"
              :style="{ width: `${env.host.disk_root.used_percent}%` }"
            />
          </div>
          <span class="infra-bar__label">
            {{ fmtBytes(env.host.disk_root.used_bytes) }} /
            {{ fmtBytes(env.host.disk_root.total_bytes) }}
            ({{ env.host.disk_root.used_percent }} %)
          </span>
        </div>
      </div>

      <div v-if="env.host.disk_typesense" class="infra-section">
        <h3 class="infra-section__title">Disk (Typesense)</h3>
        <div class="infra-bar">
          <div class="infra-bar__track">
            <div
              :class="barClass(env.host.disk_typesense.used_percent)"
              :style="{ width: `${env.host.disk_typesense.used_percent}%` }"
            />
          </div>
          <span class="infra-bar__label">
            {{ fmtBytes(env.host.disk_typesense.used_bytes) }} /
            {{ fmtBytes(env.host.disk_typesense.total_bytes) }}
            ({{ env.host.disk_typesense.used_percent }} %)
          </span>
        </div>
      </div>

      <div v-if="env.host.containers.length" class="infra-section">
        <h3 class="infra-section__title">Kontajnery (docker stats)</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Meno</th>
                <th>CPU</th>
                <th>RAM</th>
                <th>RAM %</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(c, i) in env.host.containers" :key="c.ID || c.Name || i">
                <td>{{ c.Name || '—' }}</td>
                <td>{{ c.CPUPerc || '—' }}</td>
                <td>{{ c.MemUsage || '—' }}</td>
                <td>{{ c.MemPerc || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="env.host.compose_ps.length" class="infra-section">
        <h3 class="infra-section__title">Compose stav</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Služba</th>
                <th>Stav</th>
                <th>Health</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in env.host.compose_ps" :key="row.Name || i">
                <td>{{ containerName(row) }}</td>
                <td>{{ row.Status || row.State || '—' }}</td>
                <td>{{ row.Health || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-if="env.app_metrics" class="infra-section">
      <h3 class="infra-section__title">Nest API (Prometheus)</h3>
      <ul class="infra-metrics-list">
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
      class="muted infra-hint"
    >
      Prometheus metriky sa nepodarilo načítať.
    </p>
    <p
      v-else-if="!env.configured.metrics"
      class="muted infra-hint"
    >
      Metriky vypnuté — nastavte <code>VPS_{{ env.id === 'staging' ? 'STAGING' : 'PRODUCTION' }}_METRICS_*</code> v <code>api/.env</code>.
    </p>

    <p v-if="!env.configured.ssh && !env.configured.health" class="muted infra-hint">
      Toto prostredie nie je nakonfigurované. Pridajte premenné <code>VPS_{{ env.id === 'staging' ? 'STAGING' : 'PRODUCTION' }}_*</code> do <code>api/.env</code>.
    </p>
  </article>
</template>

<style scoped>
.infra-card {
  height: 100%;
}

.infra-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.infra-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.infra-chip {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: var(--border);
  color: var(--ink2);
}

.infra-chip--ok {
  background: #d6f2e0;
  color: var(--g700);
}

.infra-chip--bad {
  background: #fee2e2;
  color: var(--danger);
}

.infra-chip--muted {
  background: #f3f4f6;
  color: var(--ink3);
}

.infra-error {
  color: var(--danger);
  font-size: 0.85rem;
  margin: 0.35rem 0;
}

.infra-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.infra-section {
  margin-top: 1rem;
}

.infra-section__title {
  margin: 0 0 0.35rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink2);
}

.infra-load {
  margin: 0;
  font-size: 0.9rem;
  font-family: ui-monospace, monospace;
}

.infra-bar {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.infra-bar__track {
  height: 8px;
  background: var(--border);
  border-radius: 999px;
  overflow: hidden;
}

.infra-bar__fill {
  height: 100%;
  background: var(--g500);
  border-radius: 999px;
  min-width: 2px;
  transition: width 0.2s ease;
}

.infra-bar__fill--warn {
  background: var(--warning);
}

.infra-bar__fill--danger {
  background: var(--danger);
}

.infra-bar__label {
  font-size: 0.8rem;
  color: var(--ink2);
}

.infra-metrics-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
  color: var(--ink2);
}

.infra-hint {
  margin-top: 1rem;
  font-size: 0.85rem;
}

.infra-hint code {
  font-size: 0.78rem;
}
</style>
