<script setup lang="ts">
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
  eventTypeBadgeClass,
  formatAuditTime,
  formatDateRangeLabel,
  payloadPreview,
  shortId,
} from '../utils/audit-format'
import AuditToolbar from '../components/audit/AuditToolbar.vue'

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
const expandedId = ref<string | null>(null)
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
  expandedId.value = null
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

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
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
  <div class="audit-page">
    <header class="audit-header">
      <div>
        <h1 class="page-title">Audit log</h1>
        <p v-if="dateLabel" class="page-subtitle">{{ dateLabel }}</p>
      </div>
      <p class="page-subtitle audit-count">
        Zobrazených {{ events.length }} udalostí
        <span v-if="nextCursor"> · ďalšie dostupné</span>
      </p>
    </header>

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

    <p v-if="exportError" class="error card" style="margin-top: 1rem">{{ exportError }}</p>
    <p v-if="error" class="error card" style="margin-top: 1rem">
      {{ error }}
      <button type="button" class="btn btn-sm" style="margin-top: 0.5rem" @click="refresh">
        Skúsiť znova
      </button>
    </p>

    <div v-else-if="loading && events.length === 0" class="muted" style="margin-top: 1.5rem">
      Načítavam…
    </div>

    <section v-else class="section-card audit-table-wrap">
      <div class="table-wrap">
        <table class="data-table audit-table">
          <thead>
            <tr>
              <th>Čas</th>
              <th>Typ</th>
              <th>Actor</th>
              <th>Subjekt</th>
              <th>IP</th>
              <th>Detail</th>
              <th>Akcie</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="e in events" :key="e.id">
              <tr
                class="audit-row"
                :class="{ 'audit-row--expanded': expandedId === e.id }"
              >
                <td class="audit-time">{{ formatAuditTime(e.occurred_at) }}</td>
                <td>
                  <span class="badge" :class="eventTypeBadgeClass(e.event_type)">
                    {{ e.event_type }}
                  </span>
                </td>
                <td class="audit-actor">
                  <span class="audit-actor-label">{{ e.actor_label ?? '—' }}</span>
                  <span v-if="e.actor_user_id" class="mono audit-actor-id">{{
                    shortId(e.actor_user_id)
                  }}</span>
                </td>
                <td class="audit-subject">
                  <span v-if="e.subject_type">{{ e.subject_type }}</span>
                  <span v-else class="muted">—</span>
                  <span v-if="e.subject_id" class="mono">{{ shortId(e.subject_id) }}</span>
                </td>
                <td class="mono audit-ip">{{ e.actor_ip ?? '—' }}</td>
                <td class="audit-payload-preview" @click="toggleExpand(e.id)">
                  {{ payloadPreview(e.payload) }}
                </td>
                <td class="audit-row-actions" @click.stop>
                  <button
                    v-if="e.actor_user_id"
                    type="button"
                    class="btn btn-ghost btn-sm"
                    title="Filter actor"
                    @click="filterByActor(e.actor_user_id)"
                  >
                    Actor
                  </button>
                  <button
                    v-if="e.subject_id"
                    type="button"
                    class="btn btn-ghost btn-sm"
                    title="Filter subject"
                    @click="filterBySubject(e.subject_id)"
                  >
                    Subjekt
                  </button>
                  <button
                    v-if="auditSubjectPublicUrl(e.subject_type, e.subject_id)"
                    type="button"
                    class="btn btn-ghost btn-sm"
                    @click="openSubjectLink(e)"
                  >
                    Odkaz
                  </button>
                  <button type="button" class="btn btn-ghost btn-sm" @click="toggleExpand(e.id)">
                    Detail
                  </button>
                </td>
              </tr>
              <tr v-if="expandedId === e.id" class="audit-detail-row">
                <td colspan="7">
                  <div class="audit-detail">
                    <div><strong>ID:</strong> <span class="mono">{{ e.id }}</span></div>
                    <div v-if="e.session_id">
                      <strong>Session:</strong> <span class="mono">{{ e.session_id }}</span>
                    </div>
                    <div v-if="e.device_id">
                      <strong>Device:</strong> <span class="mono">{{ e.device_id }}</span>
                    </div>
                    <div v-if="e.actor_user_agent">
                      <strong>User-Agent:</strong> {{ e.actor_user_agent }}
                    </div>
                    <div>
                      <strong>Row hash:</strong>
                      <span class="mono audit-hash">{{ e.row_hash }}</span>
                    </div>
                    <pre class="audit-payload-json">{{ JSON.stringify(e.payload, null, 2) }}</pre>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <p v-if="events.length === 0 && !loading" class="muted" style="padding: 1rem 0 0">
        Žiadne udalosti pre zvolené filtre.
      </p>
      <div v-if="nextCursor" class="audit-load-more">
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="loadingMore"
          @click="fetchPage(true)"
        >
          {{ loadingMore ? 'Načítavam…' : 'Načítať ďalšie' }}
        </button>
      </div>
    </section>

    <section class="section-card audit-chain-section">
      <h2 class="section-title">Integrita reťazca</h2>
      <p class="muted audit-chain-hint">
        Overí HMAC reťazec audit záznamov v zvolenom období (max. 50 000 riadkov).
      </p>
      <button
        type="button"
        class="btn btn-ghost btn-sm"
        :disabled="chainLoading"
        @click="verifyChain"
      >
        {{ chainLoading ? 'Overujem…' : 'Overiť reťazec' }}
      </button>
      <p v-if="chainError" class="error" style="margin-top: 0.75rem">{{ chainError }}</p>
      <div
        v-else-if="chainResult"
        class="audit-chain-result"
        :class="chainResult.valid ? 'audit-chain-result--ok' : 'audit-chain-result--fail'"
      >
        <template v-if="chainResult.valid">
          Reťazec je v poriadku ({{ chainResult.checked }} záznamov).
        </template>
        <template v-else>
          Porušenie reťazca po {{ chainResult.checked }} záznamoch:
          {{ chainResult.detail ?? 'neznáma chyba' }}
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.audit-page {
  max-width: 1280px;
}

.audit-header {
  margin-bottom: 1rem;
}

.audit-count {
  margin-top: 0.35rem;
}

.audit-table-wrap {
  margin-top: 1.25rem;
}

.audit-row {
  cursor: pointer;
}

.audit-row:hover td {
  background: var(--g50);
}

.audit-time {
  white-space: nowrap;
  font-size: 0.8rem;
}

.audit-actor {
  max-width: 160px;
}

.audit-actor-label {
  display: block;
  font-weight: 600;
  font-size: 0.85rem;
}

.audit-actor-id {
  font-size: 0.7rem;
  color: var(--ink3);
}

.audit-subject {
  font-size: 0.8rem;
  max-width: 140px;
}

.audit-ip {
  font-size: 0.75rem;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.audit-payload-preview {
  font-size: 0.75rem;
  color: var(--ink2);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.audit-detail-row td {
  background: var(--g50);
  padding: 0 !important;
}

.audit-detail {
  padding: 1rem 1.25rem;
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.audit-payload-json {
  margin: 0.5rem 0 0;
  padding: 0.75rem;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 0.72rem;
  overflow-x: auto;
  max-height: 240px;
}

.audit-hash {
  word-break: break-all;
  font-size: 0.7rem;
}

.audit-load-more {
  margin-top: 1rem;
  text-align: center;
}

.audit-chain-section {
  margin-top: 1.25rem;
}

.audit-chain-hint {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
}

.audit-chain-result {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
}

.audit-chain-result--ok {
  background: var(--g50);
  color: var(--g700);
  border: 1px solid var(--g100);
}

.audit-chain-result--fail {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.audit-row-actions {
  white-space: nowrap;
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
}
</style>
