<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import { adminApi } from '../composables/adminApi'
import type { AdminOverview } from '../types/overview'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'
import { formatAuditTime, shortId } from '../utils/audit-format'
import { fmtNum } from '../utils/analytics-format'

const router = useRouter()
const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<AdminOverview | null>(null)

const quickLinks = [
  { label: 'Moderácia', to: '/moderation' },
  { label: 'Audit', to: '/audit' },
  { label: 'Analytics · Web', to: { path: '/analytics', hash: '#external' } },
  { label: 'Účty', to: '/users' },
  { label: 'Podpora', to: '/support' },
]

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
  <div class="admin-page">
    <AdminPageHeader title="Prehľad" subtitle="Operačný dashboard platformy" />

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-else-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Skeleton v-for="i in 4" :key="i" height="7rem" class="!rounded-xl" />
    </div>

    <template v-else-if="data">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="admin-section-card">
          <p class="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Otvorené nahlásenia
          </p>
          <p class="m-0 mt-2 text-3xl font-bold text-slate-900">
            {{ fmtNum(data.open_reports_count) }}
          </p>
          <RouterLink to="/moderation" class="mt-2 inline-block text-sm text-primary-600 hover:underline">
            Moderácia →
          </RouterLink>
        </div>
        <div class="admin-section-card">
          <p class="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Registrácie dnes
          </p>
          <p class="m-0 mt-2 text-3xl font-bold text-slate-900">
            {{ fmtNum(data.kpis.signups_today) }}
          </p>
          <p class="m-0 mt-1 text-xs text-slate-500">7 dní: {{ fmtNum(data.kpis.signups_7d) }}</p>
        </div>
        <div class="admin-section-card">
          <p class="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Publikované ponuky dnes
          </p>
          <p class="m-0 mt-2 text-3xl font-bold text-slate-900">
            {{ fmtNum(data.kpis.jobs_published_today) }}
          </p>
          <p class="m-0 mt-1 text-xs text-slate-500">7 dní: {{ fmtNum(data.kpis.jobs_published_7d) }}</p>
        </div>
        <div class="admin-section-card">
          <p class="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Zlyhané platby (7 dní)
          </p>
          <p class="m-0 mt-2 text-3xl font-bold text-slate-900">
            {{ fmtNum(data.failed_payments_count) }}
          </p>
        </div>
      </div>

      <section class="admin-section-card">
        <h2 class="admin-section-title">Rýchle odkazy</h2>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="link in quickLinks"
            :key="link.label"
            :label="link.label"
            severity="secondary"
            size="small"
            @click="router.push(link.to)"
          />
        </div>
      </section>

      <section class="admin-section-card">
        <h2 class="admin-section-title">Posledné audit udalosti</h2>
        <DataTable
          v-if="data.recent_audit_events.length > 0"
          :value="data.recent_audit_events"
          size="small"
          striped-rows
          class="text-sm"
        >
          <Column field="occurred_at" header="Čas">
            <template #body="{ data: row }">
              {{ formatAuditTime(row.occurred_at) }}
            </template>
          </Column>
          <Column field="event_type" header="Typ" />
          <Column header="Actor">
            <template #body="{ data: row }">
              {{ row.actor_label ?? shortId(row.actor_user_id) }}
            </template>
          </Column>
          <Column header="Subjekt">
            <template #body="{ data: row }">
              <span v-if="row.subject_type">{{ row.subject_type }} </span>
              <span v-if="row.subject_id" class="mono">{{ shortId(row.subject_id) }}</span>
            </template>
          </Column>
        </DataTable>
        <p v-else class="m-0 text-sm text-slate-500">Žiadne udalosti.</p>
        <Button
          label="Celý audit log →"
          severity="secondary"
          size="small"
          class="mt-3"
          @click="router.push('/audit')"
        />
      </section>
    </template>
  </div>
</template>
