<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { adminApi } from '../../composables/adminApi'
import type { ExternalAnalyticsSummary } from '../../types/analytics-external'
import { fmtNum, fmtPct } from '../../utils/analytics-format'
import { useAdminChart } from '../../composables/useAdminChart'

const props = defineProps<{
  external: ExternalAnalyticsSummary | null
  loading: boolean
  platformSignups?: number | null
}>()

const testing = ref(false)
const testResult = ref<string | null>(null)

const pageviewDivergence = computed(() => {
  const signups = props.platformSignups
  const pv = props.external?.posthog?.pageviews
  if (signups == null || pv == null || !Number.isFinite(signups) || signups <= 0) {
    return null
  }
  const ratio = Math.abs(pv - signups) / signups
  if (ratio <= 0.3) return null
  return `PostHog pageviews (${fmtNum(pv)}) sa líšia o viac ako 30 % od platformových registrácií (${fmtNum(signups)}) v tom istom období — skontrolujte meranie a filtre.`
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
  <section class="section-card">
    <h2 class="section-title">Web &amp; marketing</h2>
    <p class="ops-note">
      Externé zdroje (voliteľné) — credentials v <code>jobbie-admin/api/.env</code>. Platformové KPI
      sú v sekcii vyššie.
    </p>

    <ul v-if="warnings.length" class="external-warnings">
      <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
    </ul>
    <p v-if="pageviewDivergence" class="external-warnings external-divergence">
      {{ pageviewDivergence }}
    </p>
    <div class="external-test-row">
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="testing"
        @click="testConnections"
      >
        {{ testing ? 'Testujem…' : 'Test pripojenia' }}
      </button>
      <span v-if="testResult" class="external-test-result">{{ testResult }}</span>
    </div>

    <p v-if="loading && !external" class="muted">Načítavam externé analytiky…</p>

    <div v-else class="external-grid">
      <!-- PostHog -->
      <article class="external-card">
        <header class="external-card-head">
          <h3>PostHog</h3>
          <a
            v-if="external?.dashboard_links.posthog"
            :href="external.dashboard_links.posthog"
            target="_blank"
            rel="noopener noreferrer"
            class="external-link"
          >
            Otvoriť dashboard
          </a>
        </header>
        <template v-if="external?.configured.posthog && external.posthog">
          <div class="external-kpis">
            <div>
              <span class="external-kpi-label">Používatelia</span>
              <strong>{{ fmtNum(external.posthog.users) }}</strong>
            </div>
            <div>
              <span class="external-kpi-label">Pageviews</span>
              <strong>{{ fmtNum(external.posthog.pageviews) }}</strong>
            </div>
          </div>
          <div
            v-if="external.posthog.daily_pageviews.length"
            class="chart-box chart-box--sm"
          >
            <canvas ref="posthogCanvas" />
          </div>
        </template>
        <p v-else-if="external?.errors.posthog" class="external-error">
          {{ external.errors.posthog }}
        </p>
        <p v-else class="muted external-unconfigured">
          Nenakonfigurované — {{ envHints.posthog }}
        </p>
      </article>

      <!-- GA4 -->
      <article class="external-card">
        <header class="external-card-head">
          <h3>Google Analytics 4</h3>
          <a
            v-if="external?.dashboard_links.ga4"
            :href="external.dashboard_links.ga4"
            target="_blank"
            rel="noopener noreferrer"
            class="external-link"
          >
            Otvoriť dashboard
          </a>
        </header>
        <template v-if="external?.configured.ga4 && external.ga4">
          <div class="external-kpis">
            <div>
              <span class="external-kpi-label">Active users</span>
              <strong>{{ fmtNum(external.ga4.active_users) }}</strong>
            </div>
            <div>
              <span class="external-kpi-label">Sessions</span>
              <strong>{{ fmtNum(external.ga4.sessions) }}</strong>
            </div>
            <div>
              <span class="external-kpi-label">Page views</span>
              <strong>{{ fmtNum(external.ga4.page_views) }}</strong>
            </div>
            <div>
              <span class="external-kpi-label">Engagement</span>
              <strong>{{ fmtPct(external.ga4.engagement_rate) }}</strong>
            </div>
          </div>
        </template>
        <p v-else-if="external?.errors.ga4" class="external-error">{{ external.errors.ga4 }}</p>
        <p v-else class="muted external-unconfigured">
          Nenakonfigurované — {{ envHints.ga4 }}
        </p>
      </article>

      <!-- Clarity -->
      <article class="external-card">
        <header class="external-card-head">
          <h3>Microsoft Clarity</h3>
          <a
            v-if="external?.dashboard_links.clarity"
            :href="external.dashboard_links.clarity"
            target="_blank"
            rel="noopener noreferrer"
            class="external-link"
          >
            Otvoriť dashboard
          </a>
        </header>
        <template v-if="external?.configured.clarity && external.clarity">
          <p class="external-meta">
            API okno: posledných {{ external.clarity.api_days_covered }}
            {{ external.clarity.api_days_covered === 1 ? 'deň' : 'dni' }}
          </p>
          <div class="external-kpis">
            <div>
              <span class="external-kpi-label">Sessions</span>
              <strong>{{ fmtNum(external.clarity.sessions) }}</strong>
            </div>
            <div v-if="external.clarity.engagement_seconds != null">
              <span class="external-kpi-label">Engagement (s)</span>
              <strong>{{ fmtNum(Math.round(external.clarity.engagement_seconds)) }}</strong>
            </div>
            <div v-if="external.clarity.rage_clicks != null">
              <span class="external-kpi-label">Rage clicks</span>
              <strong>{{ fmtNum(external.clarity.rage_clicks) }}</strong>
            </div>
          </div>
        </template>
        <p v-else-if="external?.errors.clarity" class="external-error">
          {{ external.errors.clarity }}
        </p>
        <p v-else class="muted external-unconfigured">
          Nenakonfigurované — {{ envHints.clarity }}
        </p>
      </article>

      <!-- GSC -->
      <article class="external-card external-card--wide">
        <header class="external-card-head">
          <h3>Google Search Console</h3>
          <a
            v-if="external?.dashboard_links.gsc"
            :href="external.dashboard_links.gsc"
            target="_blank"
            rel="noopener noreferrer"
            class="external-link"
          >
            Otvoriť dashboard
          </a>
        </header>
        <template v-if="external?.configured.gsc && external.gsc">
          <div class="external-kpis">
            <div>
              <span class="external-kpi-label">Clicks</span>
              <strong>{{ fmtNum(external.gsc.clicks) }}</strong>
            </div>
            <div>
              <span class="external-kpi-label">Impressions</span>
              <strong>{{ fmtNum(external.gsc.impressions) }}</strong>
            </div>
            <div>
              <span class="external-kpi-label">CTR</span>
              <strong>{{ fmtPct(external.gsc.ctr) }}</strong>
            </div>
            <div>
              <span class="external-kpi-label">Position</span>
              <strong>{{
                external.gsc.position != null ? external.gsc.position.toFixed(1) : '—'
              }}</strong>
            </div>
          </div>
          <div v-if="external.gsc.top_queries.length" class="table-wrap" style="margin-top: 0.75rem">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Dotaz</th>
                  <th>Clicks</th>
                  <th>Impressions</th>
                  <th>CTR</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in external.gsc.top_queries" :key="row.query">
                  <td>{{ row.query }}</td>
                  <td>{{ fmtNum(row.clicks) }}</td>
                  <td>{{ fmtNum(row.impressions) }}</td>
                  <td>{{ fmtPct(row.ctr) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <p v-else-if="external?.errors.gsc" class="external-error">{{ external.errors.gsc }}</p>
        <p v-else class="muted external-unconfigured">
          Nenakonfigurované — {{ envHints.gsc }}
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.external-warnings {
  margin: 0.75rem 0 0;
  padding-left: 1.25rem;
  color: var(--warning);
  font-size: 0.9rem;
}

.external-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.external-card {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 1rem;
  background: var(--sand);
}

.external-card--wide {
  grid-column: 1 / -1;
}

.external-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.external-card-head h3 {
  margin: 0;
  font-size: 1rem;
}

.external-link {
  font-size: 0.8rem;
  white-space: nowrap;
}

.external-kpis {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
}

.external-kpi-label {
  display: block;
  font-size: 0.75rem;
  color: var(--ink3);
  margin-bottom: 0.15rem;
}

.external-kpis strong {
  font-size: 1.15rem;
}

.external-error {
  color: var(--danger);
  font-size: 0.85rem;
  margin: 0;
}

.external-unconfigured {
  font-size: 0.85rem;
  margin: 0;
}

.external-meta {
  font-size: 0.8rem;
  color: var(--ink2);
  margin: 0 0 0.5rem;
}

.external-divergence {
  list-style: none;
  padding: 0.65rem 0.75rem;
  background: #fef3c7;
  border-radius: 8px;
  color: #92400e;
}

.external-test-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.external-test-result {
  font-size: 0.8rem;
  color: var(--ink2);
}
</style>
