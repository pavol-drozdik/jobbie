<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { adminApi } from '../../composables/adminApi'
import type { ExternalAnalyticsSummary } from '../../types/analytics-external'
import { fmtNum, fmtPct } from '../../utils/analytics-format'
import { useAdminChart } from '../../composables/useAdminChart'

const props = defineProps<{
  external: ExternalAnalyticsSummary | null
  loading: boolean
}>()

const testing = ref(false)
const testResult = ref<string | null>(null)

function divergenceWarning(
  labelA: string,
  valueA: number,
  labelB: string,
  valueB: number,
  hint: string,
): string | null {
  if (!Number.isFinite(valueA) || !Number.isFinite(valueB) || valueA <= 0 || valueB <= 0) {
    return null
  }
  const ratio = Math.abs(valueA - valueB) / Math.max(valueA, valueB)
  if (ratio <= 0.3) return null
  return `${labelA} (${fmtNum(valueA)}) a ${labelB} (${fmtNum(valueB)}) sa líšia o viac ako 30 % v tom istom období — ${hint}`
}

/** Cross-check PostHog vs GA4 when both are configured (pageviews ≠ platform signups). */
const crossCheckWarnings = computed(() => {
  const warnings: string[] = []
  const ph = props.external?.posthog
  const ga = props.external?.ga4
  if (!ph || !ga) return warnings

  const pageviews = divergenceWarning(
    'PostHog pageviews',
    ph.pageviews,
    'GA4 page views',
    ga.page_views,
    'skontrolujte cookie consent, domény a časové filtre.',
  )
  if (pageviews) warnings.push(pageviews)

  const users = divergenceWarning(
    'PostHog návštevníci',
    ph.users,
    'GA4 active users',
    ga.active_users,
    'PostHog meria len návštevníkov so súhlasom analytiky — rozdiel môže byť očakávaný.',
  )
  if (users) warnings.push(users)

  return warnings
})

async function testConnections() {
  testing.value = true
  testResult.value = null
  const res = await adminApi<{ ok: boolean; providers: Record<string, { ok: boolean; error?: string }> }>(
    '/admin/analytics/external/test',
  )
  testing.value = false
  if (!res.ok) {
    testResult.value = res.body.slice(0, 200)
    return
  }
  const parts = Object.entries(res.data?.providers ?? {}).map(
    ([k, v]) => `${k}: ${v.ok ? 'OK' : v.error ?? 'fail'}`,
  )
  testResult.value = parts.join(' · ')
}

const posthogCanvas = ref<HTMLCanvasElement | null>(null)
const { mountLine, destroyAll } = useAdminChart()

const envHints = {
  posthog: 'POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID',
  ga4: 'GA4_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_JSON',
  clarity: 'CLARITY_API_TOKEN',
  gsc: 'GSC_SITE_URL, GOOGLE_SERVICE_ACCOUNT_JSON',
}

const warnings = computed(() => props.external?.warnings ?? [])

function renderPosthogChart() {
  destroyAll()
  const canvas = posthogCanvas.value
  const daily = props.external?.posthog?.daily_pageviews ?? []
  if (!canvas || daily.length === 0) return
  mountLine(
    canvas,
    daily.map((d) => d.day),
    [{ label: 'Pageviews', data: daily.map((d) => d.value) }],
  )
}

onMounted(renderPosthogChart)
watch(
  () => props.external?.posthog?.daily_pageviews,
  renderPosthogChart,
)
</script>

<template>
  <section class="admin-section-card">
    <h2 class="admin-section-title">Web &amp; marketing</h2>
    <p class="ops-note">
      Externé zdroje (voliteľné) — credentials v <code>jobbie-admin/api/.env</code>. Platformové KPI
      sú v sekcii vyššie.
    </p>

    <ul
      v-if="warnings.length || crossCheckWarnings.length"
      class="m-3 list-disc pl-5 text-sm text-amber-700"
    >
      <li v-for="(w, i) in warnings" :key="`api-${i}`">{{ w }}</li>
      <li v-for="(w, i) in crossCheckWarnings" :key="`xcheck-${i}`">{{ w }}</li>
    </ul>

    <div class="mt-3 flex flex-wrap items-center gap-2">
      <Button
        :label="testing ? 'Testujem…' : 'Test pripojenia'"
        severity="secondary"
        size="small"
        :loading="testing"
        @click="testConnections"
      />
      <span v-if="testResult" class="text-xs text-slate-600">{{ testResult }}</span>
    </div>

    <div v-if="loading && !external" class="flex justify-center py-8">
      <ProgressSpinner />
    </div>

    <div v-else class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      <!-- PostHog -->
      <article class="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <header class="mb-3 flex items-start justify-between gap-2">
          <h3 class="m-0 text-base font-semibold text-slate-900">PostHog</h3>
          <a
            v-if="external?.dashboard_links.posthog"
            :href="external.dashboard_links.posthog"
            target="_blank"
            rel="noopener noreferrer"
            class="whitespace-nowrap text-xs text-primary-600 hover:underline"
          >
            Otvoriť dashboard
          </a>
        </header>
        <template v-if="external?.configured.posthog && external.posthog">
          <div class="flex flex-wrap gap-4">
            <div>
              <span class="block text-xs text-slate-500">Používatelia</span>
              <strong class="text-lg">{{ fmtNum(external.posthog.users) }}</strong>
            </div>
            <div>
              <span class="block text-xs text-slate-500">Pageviews</span>
              <strong class="text-lg">{{ fmtNum(external.posthog.pageviews) }}</strong>
            </div>
          </div>
          <div
            v-if="external.posthog.daily_pageviews.length"
            class="chart-box chart-box--sm"
          >
            <canvas ref="posthogCanvas" />
          </div>
        </template>
        <Message v-else-if="external?.errors.posthog" severity="error" :closable="false">
          {{ external.errors.posthog }}
        </Message>
        <p v-else class="m-0 text-sm text-slate-500">
          Nenakonfigurované — {{ envHints.posthog }}
        </p>
      </article>

      <!-- GA4 -->
      <article class="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <header class="mb-3 flex items-start justify-between gap-2">
          <h3 class="m-0 text-base font-semibold text-slate-900">Google Analytics 4</h3>
          <a
            v-if="external?.dashboard_links.ga4"
            :href="external.dashboard_links.ga4"
            target="_blank"
            rel="noopener noreferrer"
            class="whitespace-nowrap text-xs text-primary-600 hover:underline"
          >
            Otvoriť dashboard
          </a>
        </header>
        <template v-if="external?.configured.ga4 && external.ga4">
          <div class="flex flex-wrap gap-4">
            <div>
              <span class="block text-xs text-slate-500">Active users</span>
              <strong class="text-lg">{{ fmtNum(external.ga4.active_users) }}</strong>
            </div>
            <div>
              <span class="block text-xs text-slate-500">Sessions</span>
              <strong class="text-lg">{{ fmtNum(external.ga4.sessions) }}</strong>
            </div>
            <div>
              <span class="block text-xs text-slate-500">Page views</span>
              <strong class="text-lg">{{ fmtNum(external.ga4.page_views) }}</strong>
            </div>
            <div>
              <span class="block text-xs text-slate-500">Engagement</span>
              <strong class="text-lg">{{ fmtPct(external.ga4.engagement_rate) }}</strong>
            </div>
          </div>
        </template>
        <Message v-else-if="external?.errors.ga4" severity="error" :closable="false">
          {{ external.errors.ga4 }}
        </Message>
        <p v-else class="m-0 text-sm text-slate-500">
          Nenakonfigurované — {{ envHints.ga4 }}
        </p>
      </article>

      <!-- Clarity -->
      <article class="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <header class="mb-3 flex items-start justify-between gap-2">
          <h3 class="m-0 text-base font-semibold text-slate-900">Microsoft Clarity</h3>
          <a
            v-if="external?.dashboard_links.clarity"
            :href="external.dashboard_links.clarity"
            target="_blank"
            rel="noopener noreferrer"
            class="whitespace-nowrap text-xs text-primary-600 hover:underline"
          >
            Otvoriť dashboard
          </a>
        </header>
        <template v-if="external?.configured.clarity && external.clarity">
          <p class="m-0 mb-2 text-sm text-slate-600">
            API okno: posledných {{ external.clarity.api_days_covered }}
            {{ external.clarity.api_days_covered === 1 ? 'deň' : 'dni' }}
          </p>
          <div class="flex flex-wrap gap-4">
            <div>
              <span class="block text-xs text-slate-500">Sessions</span>
              <strong class="text-lg">{{ fmtNum(external.clarity.sessions) }}</strong>
            </div>
            <div v-if="external.clarity.engagement_seconds != null">
              <span class="block text-xs text-slate-500">Engagement (s)</span>
              <strong class="text-lg">{{ fmtNum(Math.round(external.clarity.engagement_seconds)) }}</strong>
            </div>
            <div v-if="external.clarity.rage_clicks != null">
              <span class="block text-xs text-slate-500">Rage clicks</span>
              <strong class="text-lg">{{ fmtNum(external.clarity.rage_clicks) }}</strong>
            </div>
          </div>
        </template>
        <Message v-else-if="external?.errors.clarity" severity="error" :closable="false">
          {{ external.errors.clarity }}
        </Message>
        <p v-else class="m-0 text-sm text-slate-500">
          Nenakonfigurované — {{ envHints.clarity }}
        </p>
      </article>

      <!-- GSC -->
      <article class="col-span-full rounded-lg border border-slate-200 bg-slate-50 p-4">
        <header class="mb-3 flex items-start justify-between gap-2">
          <h3 class="m-0 text-base font-semibold text-slate-900">Google Search Console</h3>
          <a
            v-if="external?.dashboard_links.gsc"
            :href="external.dashboard_links.gsc"
            target="_blank"
            rel="noopener noreferrer"
            class="whitespace-nowrap text-xs text-primary-600 hover:underline"
          >
            Otvoriť dashboard
          </a>
        </header>
        <template v-if="external?.configured.gsc && external.gsc">
          <div class="flex flex-wrap gap-4">
            <div>
              <span class="block text-xs text-slate-500">Clicks</span>
              <strong class="text-lg">{{ fmtNum(external.gsc.clicks) }}</strong>
            </div>
            <div>
              <span class="block text-xs text-slate-500">Impressions</span>
              <strong class="text-lg">{{ fmtNum(external.gsc.impressions) }}</strong>
            </div>
            <div>
              <span class="block text-xs text-slate-500">CTR</span>
              <strong class="text-lg">{{ fmtPct(external.gsc.ctr) }}</strong>
            </div>
            <div>
              <span class="block text-xs text-slate-500">Position</span>
              <strong class="text-lg">{{
                external.gsc.position != null ? external.gsc.position.toFixed(1) : '—'
              }}</strong>
            </div>
          </div>
          <DataTable
            v-if="external.gsc.top_queries.length"
            :value="external.gsc.top_queries"
            size="small"
            striped-rows
            class="mt-3 text-sm"
          >
            <Column field="query" header="Dotaz" />
            <Column header="Clicks">
              <template #body="{ data: row }">{{ fmtNum(row.clicks) }}</template>
            </Column>
            <Column header="Impressions">
              <template #body="{ data: row }">{{ fmtNum(row.impressions) }}</template>
            </Column>
            <Column header="CTR">
              <template #body="{ data: row }">{{ fmtPct(row.ctr) }}</template>
            </Column>
          </DataTable>
        </template>
        <Message v-else-if="external?.errors.gsc" severity="error" :closable="false">
          {{ external.errors.gsc }}
        </Message>
        <p v-else class="m-0 text-sm text-slate-500">
          Nenakonfigurované — {{ envHints.gsc }}
        </p>
      </article>
    </div>
  </section>
</template>
