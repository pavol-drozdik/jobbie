<script setup lang="ts">
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi, adminApiDownload } from '../composables/adminApi'
import {
  ensureAdminRecentLoginConfig,
  useAdminRecentLogin,
} from '../composables/useAdminRecentLogin'
import {
  auditSubjectPublicUrl,
  auditSubjectUsersRoute,
} from '../utils/audit-subject-links'
import type { AuditChainVerifyResult, AuditEventItem, AuditEventsResponse } from '../types/audit'
import {
  auditPresetToRange,
  eventTypeTagSeverity,
  formatAuditTime,
  formatDateRangeLabel,
  payloadPreview,
  shortId,
} from '../utils/audit-format'
import AuditToolbar from '../components/audit/AuditToolbar.vue'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'

const { recentLoginMinutes } = useAdminRecentLogin()

onMounted(() => {
  void ensureAdminRecentLoginConfig()
})

const route = useRoute()
const router = useRouter()
const preset = ref<'7d' | '30d' | '90d'>('30d')
const eventTypeFilter = ref('')
const actorUserIdFilter = ref('')
const subjectIdFilter = ref('')
const limit = ref(50)
const dateLabel = ref('')

const loading = ref(true)
const loadingMore = ref(false)
const exporting = ref(false)
const error = ref<string | null>(null)
const exportError = ref<string | null>(null)

const events = ref<AuditEventItem[]>([])
const nextCursor = ref<string | null>(null)
const expandedRows = ref<AuditEventItem[]>([])
const eventTypeOptions = ref<string[]>([])

const chainLoading = ref(false)
const chainResult = ref<AuditChainVerifyResult | null>(null)
const chainError = ref<string | null>(null)

function filterQuery(): Record<string, string> {
  const range = auditPresetToRange(preset.value)
  dateLabel.value = formatDateRangeLabel(range.from, range.to)
  const q: Record<string, string> = {
    from: range.from,
    to: range.to,
    limit: String(limit.value),
  }
  if (eventTypeFilter.value.trim()) {
    q.event_type = eventTypeFilter.value.trim()
  }
  if (actorUserIdFilter.value.trim()) {
    q.user_id = actorUserIdFilter.value.trim()
  }
  if (subjectIdFilter.value.trim()) {
    q.subject_id = subjectIdFilter.value.trim()
  }
  return q
}

function filterByActor(userId: string | null) {
  if (!userId) return
  actorUserIdFilter.value = userId
}

function filterBySubject(subjectId: string | null) {
  if (!subjectId) return
  subjectIdFilter.value = subjectId
}

function openSubjectLink(e: { subject_type: string | null; subject_id: string | null }) {
  const url = auditSubjectPublicUrl(e.subject_type, e.subject_id)
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  const usersRoute = auditSubjectUsersRoute(e.subject_id)
  if (usersRoute && (e.subject_type === 'profile' || e.subject_type === 'company_profile')) {
    void router.push(usersRoute)
  }
}

async function loadEventTypes() {
  const res = await adminApi<{ items: string[] }>('/admin/audit/event-types', {
    query: { limit: '50' },
  })
  if (res.ok && res.data?.items) {
    eventTypeOptions.value = res.data.items
  }
}

async function fetchPage(append: boolean) {
  if (append) {
    if (!nextCursor.value || loadingMore.value) return
    loadingMore.value = true
  } else {
    loading.value = true
    error.value = null
    events.value = []
    nextCursor.value = null
    expandedRows.value = []
  }
  try {
    const query = filterQuery()
    if (append && nextCursor.value) {
      query.cursor = nextCursor.value
    }
    const res = await adminApi<AuditEventsResponse>('/admin/audit/events', { query })
    if (!res.ok) {
      if (!append) {
        error.value = res.body.slice(0, 300) || `HTTP ${res.status}`
      }
      return
    }
    const batch = res.data?.items ?? []
    events.value = append ? [...events.value, ...batch] : batch
    nextCursor.value = res.data?.next_cursor ?? null
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function refresh() {
  chainResult.value = null
  chainError.value = null
  void fetchPage(false)
}

async function exportFile(format: 'csv' | 'jsonl') {
  exporting.value = true
  exportError.value = null
  const stamp = new Date().toISOString().slice(0, 10)
  const ext = format === 'csv' ? 'csv' : 'jsonl'
  const res = await adminApiDownload('/admin/audit/export', {
    query: { ...filterQuery(), format },
    filename: `jobbie-audit-${stamp}.${ext}`,
  })
  if (!res.ok) {
    exportError.value =
      res.status === 403
        ? `Export vyžaduje čerstvé prihlásenie (do ${recentLoginMinutes.value} min). Odhláste sa a prihláste znova.`
        : res.body || `HTTP ${res.status}`
  }
  exporting.value = false
}

async function verifyChain() {
  chainLoading.value = true
  chainError.value = null
  chainResult.value = null
  const range = auditPresetToRange(preset.value)
  const res = await adminApi<AuditChainVerifyResult>('/admin/audit/verify-chain', {
    method: 'POST',
    body: { from: range.from, to: range.to },
  })
  if (!res.ok) {
    chainError.value = res.body.slice(0, 300) || `HTTP ${res.status}`
  } else {
    chainResult.value = res.data ?? null
  }
  chainLoading.value = false
}

watch(
  [preset, eventTypeFilter, actorUserIdFilter, subjectIdFilter, limit],
  () => {
    void fetchPage(false)
  },
  { immediate: true },
)

watch(
  () => route.query.user_id,
  (id) => {
    if (typeof id === 'string' && id.trim()) {
      actorUserIdFilter.value = id.trim()
    }
  },
  { immediate: true },
)

void loadEventTypes()
</script>

<template>
  <div class="admin-page">
    <AdminPageHeader
      title="Audit log"
      :subtitle="
        dateLabel
          ? `${dateLabel} · Zobrazených ${events.length} udalostí${nextCursor ? ' · ďalšie dostupné' : ''}`
          : undefined
      "
    />

    <AuditToolbar
      :preset="preset"
      :event-type="eventTypeFilter"
      :actor-user-id="actorUserIdFilter"
      :subject-id="subjectIdFilter"
      :limit="limit"
      :loading="loading"
      :exporting="exporting"
      :event-type-options="eventTypeOptions"
      @update:preset="preset = $event as '7d' | '30d' | '90d'"
      @update:event-type="eventTypeFilter = $event"
      @update:actor-user-id="actorUserIdFilter = $event"
      @update:subject-id="subjectIdFilter = $event"
      @update:limit="limit = $event"
      @refresh="refresh"
      @export-csv="exportFile('csv')"
      @export-jsonl="exportFile('jsonl')"
    />

    <Message v-if="exportError" severity="error" :closable="false">{{ exportError }}</Message>

    <Message v-if="error" severity="error" :closable="false">
      <div class="space-y-2">
        <p class="m-0">{{ error }}</p>
        <Button label="Skúsiť znova" size="small" severity="secondary" @click="refresh" />
      </div>
    </Message>

    <div v-else-if="loading && events.length === 0" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <section v-else class="admin-section-card">
      <DataTable
        v-model:expanded-rows="expandedRows"
        :value="events"
        data-key="id"
        size="small"
        striped-rows
        class="text-sm"
      >
        <Column expander style="width: 3rem" />
        <Column header="Čas">
          <template #body="{ data: row }">
            <span class="whitespace-nowrap text-xs">{{ formatAuditTime(row.occurred_at) }}</span>
          </template>
        </Column>
        <Column header="Typ">
          <template #body="{ data: row }">
            <Tag :value="row.event_type" :severity="eventTypeTagSeverity(row.event_type)" />
          </template>
        </Column>
        <Column header="Actor">
          <template #body="{ data: row }">
            <span class="block text-sm font-medium">{{ row.actor_label ?? '—' }}</span>
            <span v-if="row.actor_user_id" class="mono text-slate-500">
              {{ shortId(row.actor_user_id) }}
            </span>
          </template>
        </Column>
        <Column header="Subjekt">
          <template #body="{ data: row }">
            <span v-if="row.subject_type">{{ row.subject_type }}</span>
            <span v-else class="text-slate-400">—</span>
            <span v-if="row.subject_id" class="mono block">{{ shortId(row.subject_id) }}</span>
          </template>
        </Column>
        <Column header="IP">
          <template #body="{ data: row }">
            <span class="mono text-xs">{{ row.actor_ip ?? '—' }}</span>
          </template>
        </Column>
        <Column header="Detail">
          <template #body="{ data: row }">
            <span class="block max-w-[200px] truncate text-xs text-slate-600">
              {{ payloadPreview(row.payload) }}
            </span>
          </template>
        </Column>
        <Column header="Akcie">
          <template #body="{ data: row }">
            <div class="flex flex-wrap gap-1">
              <Button
                v-if="row.actor_user_id"
                label="Actor"
                size="small"
                severity="secondary"
                text
                @click="filterByActor(row.actor_user_id)"
              />
              <Button
                v-if="row.subject_id"
                label="Subjekt"
                size="small"
                severity="secondary"
                text
                @click="filterBySubject(row.subject_id)"
              />
              <Button
                v-if="auditSubjectPublicUrl(row.subject_type, row.subject_id)"
                label="Odkaz"
                size="small"
                severity="secondary"
                text
                @click="openSubjectLink(row)"
              />
            </div>
          </template>
        </Column>
        <template #expansion="{ data: row }">
          <div class="space-y-1 bg-slate-50 p-4 text-xs text-slate-700">
            <div><strong>ID:</strong> <span class="mono">{{ row.id }}</span></div>
            <div v-if="row.session_id">
              <strong>Session:</strong> <span class="mono">{{ row.session_id }}</span>
            </div>
            <div v-if="row.device_id">
              <strong>Device:</strong> <span class="mono">{{ row.device_id }}</span>
            </div>
            <div v-if="row.actor_user_agent">
              <strong>User-Agent:</strong> {{ row.actor_user_agent }}
            </div>
            <div>
              <strong>Row hash:</strong>
              <span class="mono break-all">{{ row.row_hash }}</span>
            </div>
            <pre class="mt-2 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-[0.7rem]">{{ JSON.stringify(row.payload, null, 2) }}</pre>
          </div>
        </template>
      </DataTable>

      <p v-if="events.length === 0 && !loading" class="m-0 mt-3 text-sm text-slate-500">
        Žiadne udalosti pre zvolené filtre.
      </p>

      <div v-if="nextCursor" class="mt-4 text-center">
        <Button
          :label="loadingMore ? 'Načítavam…' : 'Načítať ďalšie'"
          severity="secondary"
          :loading="loadingMore"
          @click="fetchPage(true)"
        />
      </div>
    </section>

    <section class="admin-section-card">
      <h2 class="admin-section-title">Integrita reťazca</h2>
      <p class="m-0 mb-3 text-sm text-slate-500">
        Overí HMAC reťazec audit záznamov v zvolenom období (max. 50 000 riadkov).
      </p>
      <Button
        :label="chainLoading ? 'Overujem…' : 'Overiť reťazec'"
        size="small"
        severity="secondary"
        :loading="chainLoading"
        @click="verifyChain"
      />
      <Message v-if="chainError" severity="error" :closable="false" class="mt-3">
        {{ chainError }}
      </Message>
      <Message
        v-else-if="chainResult"
        :severity="chainResult.valid ? 'success' : 'error'"
        :closable="false"
        class="mt-3"
      >
        <template v-if="chainResult.valid">
          Reťazec je v poriadku ({{ chainResult.checked }} záznamov).
        </template>
        <template v-else>
          Porušenie reťazca po {{ chainResult.checked }} záznamoch:
          {{ chainResult.detail ?? 'neznáma chyba' }}
        </template>
      </Message>
    </section>
  </div>
</template>
