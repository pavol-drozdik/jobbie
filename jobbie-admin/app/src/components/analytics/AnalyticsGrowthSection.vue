<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import type { AdminAnalyticsSummary } from '../../types/analytics'
import { useAdminChart } from '../../composables/useAdminChart'

const props = defineProps<{ summary: AdminAnalyticsSummary }>()

const growthCanvas = ref<HTMLCanvasElement | null>(null)
const cohortCanvas = ref<HTMLCanvasElement | null>(null)
const { mountLine, mountBar, destroyAll } = useAdminChart()

const ts = computed(() => props.summary.timeseries_daily ?? [])
const cohort = computed(() => [...(props.summary.cohort_weekly ?? [])].reverse())

function renderCharts() {
  destroyAll()
  const rows = ts.value
  if (growthCanvas.value && rows.length > 0) {
    const labels = rows.map((r) => r.day.slice(5))
    mountLine(growthCanvas.value, labels, [
      { label: 'Registrácie', data: rows.map((r) => r.signups) },
      { label: 'Prihlásenia', data: rows.map((r) => r.applications) },
      { label: 'Prijatia', data: rows.map((r) => r.accepted_hires) },
    ])
  }
  const c = cohort.value
  if (cohortCanvas.value && c.length > 0) {
    mountBar(
      cohortCanvas.value,
      c.map((r) => r.week_start),
      [
        { label: 'Signupy', data: c.map((r) => r.signups), color: '#22c55e' },
        { label: 'Apply 30d', data: c.map((r) => r.applied_within_30d), color: '#3b82f6' },
      ],
    )
  }
}

onMounted(renderCharts)
watch([ts, cohort], renderCharts)
</script>

<template>
  <div class="analytics-grid-2">
    <section class="admin-section-card">
      <h2 class="admin-section-title">Rast (denný)</h2>
      <p v-if="ts.length === 0" class="m-0 text-sm text-slate-500">
        Časové rady nie sú k dispozícii. Spustite migráciu
        <code>20260530120000_admin_analytics_extended.sql</code>.
      </p>
      <div v-else class="chart-box">
        <canvas ref="growthCanvas" />
      </div>
    </section>
    <section class="admin-section-card">
      <h2 class="admin-section-title">Kohorty (týždenné)</h2>
      <div v-if="cohort.length" class="chart-box chart-box--sm">
        <canvas ref="cohortCanvas" />
      </div>
      <DataTable
        :value="summary.cohort_weekly"
        size="small"
        striped-rows
        class="mt-4 text-sm"
      >
        <Column field="week_start" header="Týždeň" />
        <Column field="signups" header="Signupy" />
        <Column field="applied_within_30d" header="Apply 30d" />
        <Column header="Retencia">
          <template #body="{ data: row }">
            {{
              row.retention_apply_pct != null
                ? `${row.retention_apply_pct} %`
                : '—'
            }}
          </template>
        </Column>
      </DataTable>
    </section>
  </div>
</template>
