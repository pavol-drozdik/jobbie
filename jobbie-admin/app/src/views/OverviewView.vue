<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '../composables/adminApi'
import type { AdminOverview } from '../types/overview'
import { formatAuditTime, shortId } from '../utils/audit-format'
import { fmtNum } from '../utils/analytics-format'

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<AdminOverview | null>(null)

async function load() {
  loading.value = true
  error.value = null
  const res = await adminApi<AdminOverview>('/admin/overview')
  loading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 300) || `HTTP ${res.status}`
    return
  }
  data.value = res.data ?? null
}

onMounted(() => void load())
</script>

<template>
  <div class="overview-page">
    <header>
      <h1 class="page-title">Prehľad</h1>
      <p class="page-subtitle">Operačný dashboard platformy</p>
    </header>

    <p v-if="error" class="error card">{{ error }}</p>
    <p v-else-if="loading" class="muted">Načítavam…</p>

    <template v-else-if="data">
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Otvorené nahlásenia</span>
          <span class="kpi-value">{{ fmtNum(data.open_reports_count) }}</span>
          <RouterLink to="/moderation" class="kpi-link">Moderácia →</RouterLink>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Registrácie dnes</span>
          <span class="kpi-value">{{ fmtNum(data.kpis.signups_today) }}</span>
          <span class="kpi-hint">7 dní: {{ fmtNum(data.kpis.signups_7d) }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Publikované ponuky dnes</span>
          <span class="kpi-value">{{ fmtNum(data.kpis.jobs_published_today) }}</span>
          <span class="kpi-hint">7 dní: {{ fmtNum(data.kpis.jobs_published_7d) }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Zlyhané platby (7 dní)</span>
          <span class="kpi-value">{{ fmtNum(data.failed_payments_count) }}</span>
        </div>
      </div>

      <section class="section-card quick-links">
        <h2 class="section-title">Rýchle odkazy</h2>
        <div class="quick-links-grid">
          <button type="button" class="btn btn-ghost" @click="router.push('/moderation')">
            Moderácia
          </button>
          <button type="button" class="btn btn-ghost" @click="router.push('/audit')">
            Audit
          </button>
          <button
            type="button"
            class="btn btn-ghost"
            @click="router.push({ path: '/analytics', hash: '#external' })"
          >
            Analytics · Web
          </button>
          <button type="button" class="btn btn-ghost" @click="router.push('/users')">
            Účty
          </button>
          <button type="button" class="btn btn-ghost" @click="router.push('/support')">
            Podpora
          </button>
        </div>
      </section>

      <section class="section-card">
        <h2 class="section-title">Posledné audit udalosti</h2>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Čas</th>
                <th>Typ</th>
                <th>Actor</th>
                <th>Subjekt</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in data.recent_audit_events" :key="e.id">
                <td>{{ formatAuditTime(e.occurred_at) }}</td>
                <td>{{ e.event_type }}</td>
                <td>{{ e.actor_label ?? shortId(e.actor_user_id) }}</td>
                <td>
                  <span v-if="e.subject_type">{{ e.subject_type }}</span>
                  <span v-if="e.subject_id" class="mono">{{ shortId(e.subject_id) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="data.recent_audit_events.length === 0" class="muted">Žiadne udalosti.</p>
        <button type="button" class="btn btn-ghost btn-sm" style="margin-top: 0.75rem" @click="router.push('/audit')">
          Celý audit log →
        </button>
      </section>
    </template>
  </div>
</template>

<style scoped>
.overview-page {
  max-width: 1100px;
}

.quick-links {
  margin-top: 1.25rem;
}

.quick-links-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.kpi-link {
  font-size: 0.8rem;
  margin-top: 0.35rem;
  display: inline-block;
}
</style>
