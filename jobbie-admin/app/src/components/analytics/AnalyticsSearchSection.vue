<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { AdminAnalyticsSummary } from '../../types/analytics'
import { fmtNum, fmtPct } from '../../utils/analytics-format'
import { useAdminChart } from '../../composables/useAdminChart'

const props = defineProps<{ summary: AdminAnalyticsSummary }>()

const searchCanvas = ref<HTMLCanvasElement | null>(null)
const { mountLine, destroyAll } = useAdminChart()

const search = computed(() => props.summary.search)

function renderChart() {
  destroyAll()
  const s = search.value
  const canvas = searchCanvas.value
  if (!s?.daily?.length || !canvas) return
  const rows = s.daily
  mountLine(
    canvas,
    rows.map((r) => r.day.slice(5)),
    [
      { label: 'Vyhľadávania', data: rows.map((r) => r.searches) },
      { label: 'Bez výsledkov', data: rows.map((r) => r.zero_results) },
    ],
  )
}

onMounted(renderChart)
watch(search, renderChart)
</script>

<template>
  <section class="admin-section-card">
    <h2 class="admin-section-title">Vyhľadávanie pracovných ponúk</h2>
    <template v-if="search">
      <div class="search-summary">
        <span><strong>{{ fmtNum(search.total_searches) }}</strong> vyhľadávaní</span>
        <span
          ><strong>{{ fmtNum(search.zero_result_searches) }}</strong> bez výsledku ({{
            fmtPct(search.zero_result_rate)
          }})</span
        >
      </div>
      <div v-if="search.daily.length" class="chart-box chart-box--sm">
        <canvas ref="searchCanvas" />
      </div>
      <div class="analytics-grid-2 mt-4">
        <div>
          <h3 class="detail-block-title">Top dotazy</h3>
          <ul v-if="search.top_queries.length" class="query-list">
            <li v-for="(q, i) in search.top_queries.slice(0, 15)" :key="i">
              <span class="query-text">{{ q.q }}</span>
              <span class="query-count">{{ q.count }}</span>
            </li>
          </ul>
          <p v-else class="m-0 text-sm text-slate-500">
            Zatiaľ žiadne záznamy — otvorte <strong>Nájsť prácu</strong> na webe a vyhľadávajte
            (volá sa <code>GET /api/search</code>). Po oprave logovania spustite backend znova.
          </p>
        </div>
        <div>
          <h3 class="detail-block-title">Bez výsledkov</h3>
          <ul v-if="search.zero_result_queries.length" class="query-list">
            <li v-for="(q, i) in search.zero_result_queries.slice(0, 15)" :key="i">
              <span class="query-text">{{ q.q }}</span>
              <span class="query-count">{{ q.count }}</span>
            </li>
          </ul>
          <p v-else class="m-0 text-sm text-slate-500">Žiadne dotazy s nulovým výsledkom.</p>
        </div>
      </div>
    </template>
    <p v-else class="m-0 text-sm text-slate-500">Vyhľadávacie štatistiky sa nepodarilo načítať.</p>
  </section>
</template>
