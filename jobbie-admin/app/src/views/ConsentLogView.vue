<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../composables/adminApi'
import {
  ensureAdminRecentLoginConfig,
  useAdminRecentLogin,
} from '../composables/useAdminRecentLogin'
import type { CookieConsentLogItem, CookieConsentLogResponse } from '../types/cookie-consent-log'
import {
  auditPresetToRange,
  formatAuditTime,
  formatDateRangeLabel,
  shortId,
} from '../utils/audit-format'

const { recentLoginMinutes } = useAdminRecentLogin()

onMounted(() => {
  void ensureAdminRecentLoginConfig()
})

const route = useRoute()
const router = useRouter()
const preset = ref<'7d' | '30d' | '90d'>('30d')
const userIdFilter = ref('')
const visitorIdFilter = ref('')
const actionFilter = ref('')
const limit = ref(50)
const dateLabel = ref('')

const loading = ref(true)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const items = ref<CookieConsentLogItem[]>([])
const nextCursor = ref<string | null>(null)

const actionOptions = ['accept_all', 'reject_all', 'save', 'withdraw'] as const

function filterQuery(): Record<string, string> {
  const range = auditPresetToRange(preset.value)
  dateLabel.value = formatDateRangeLabel(range.from, range.to)
  const q: Record<string, string> = {
    from: range.from,
    to: range.to,
    limit: String(limit.value),
  }
  if (userIdFilter.value.trim()) {
    q.user_id = userIdFilter.value.trim()
  }
  if (visitorIdFilter.value.trim()) {
    q.visitor_id = visitorIdFilter.value.trim()
  }
  if (actionFilter.value.trim()) {
    q.action = actionFilter.value.trim()
  }
  return q
}

function categoriesLabel(row: CookieConsentLogItem): string {
  const parts: string[] = []
  if (row.analytics) parts.push('A')
  if (row.marketing) parts.push('M')
  if (row.personalization) parts.push('P')
  return parts.length > 0 ? parts.join(', ') : '—'
}

async function fetchPage(append: boolean) {
  if (append) {
    if (!nextCursor.value || loadingMore.value) return
    loadingMore.value = true
  } else {
    loading.value = true
    error.value = null
    items.value = []
    nextCursor.value = null
  }
  try {
    const query = filterQuery()
    if (append && nextCursor.value) {
      query.cursor = nextCursor.value
    }
    const res = await adminApi<CookieConsentLogResponse>('/admin/consent/cookie-log', { query })
    if (!res.ok) {
      error.value = res.body.slice(0, 200) || `HTTP ${res.status}`
      return
    }
    const page = res.data?.items ?? []
    nextCursor.value = res.data?.next_cursor ?? null
    items.value = append ? [...items.value, ...page] : page
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

function openUser(userId: string | null) {
  if (!userId) return
  void router.push(`/support/users/${userId}`)
}

const hasMore = computed(() => Boolean(nextCursor.value))

watch([preset, userIdFilter, visitorIdFilter, actionFilter, limit], () => {
  void fetchPage(false)
})

onMounted(() => {
  if (typeof route.query.user_id === 'string') {
    userIdFilter.value = route.query.user_id
  }
  void fetchPage(false)
})
</script>

<template>
  <div class="consent-log-page">
    <header class="page-header">
      <h1 class="page-title">Cookie súhlas</h1>
      <p class="page-subtitle muted">
        Auditný záznam CMP (banner, nastavenia, footer). Recent login:
        {{ recentLoginMinutes ?? '—' }} min.
      </p>
    </header>

    <div class="toolbar card">
      <label class="field">
        <span class="field-label">Obdobie</span>
        <select v-model="preset" class="field-input">
          <option value="7d">7 dní</option>
          <option value="30d">30 dní</option>
          <option value="90d">90 dní</option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">Akcia</span>
        <select v-model="actionFilter" class="field-input">
          <option value="">Všetky</option>
          <option v-for="action in actionOptions" :key="action" :value="action">
            {{ action }}
          </option>
        </select>
      </label>
      <label class="field field--grow">
        <span class="field-label">User ID</span>
        <input v-model="userIdFilter" class="field-input mono" placeholder="UUID účtu" />
      </label>
      <label class="field field--grow">
        <span class="field-label">Visitor ID</span>
        <input v-model="visitorIdFilter" class="field-input mono" placeholder="jb_consent_vid" />
      </label>
      <p class="muted toolbar-meta">{{ dateLabel }}</p>
    </div>

    <p v-if="error" class="error card">{{ error }}</p>
    <p v-else-if="loading" class="muted">Načítavam…</p>

    <div v-else class="table-wrap card">
      <table class="data-table">
        <thead>
          <tr>
            <th>Čas</th>
            <th>Akcia</th>
            <th>Kategórie</th>
            <th>Zdroj</th>
            <th>Visitor</th>
            <th>Účet</th>
            <th>Cesta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="items.length === 0">
            <td colspan="7" class="muted">Žiadne záznamy.</td>
          </tr>
          <tr v-for="row in items" :key="row.id">
            <td class="mono">{{ formatAuditTime(row.recorded_at) }}</td>
            <td>{{ row.action }}</td>
            <td>{{ categoriesLabel(row) }}</td>
            <td>{{ row.source ?? '—' }}</td>
            <td class="mono" :title="row.visitor_id">{{ shortId(row.visitor_id) }}</td>
            <td>
              <button
                v-if="row.user_id"
                type="button"
                class="link-btn mono"
                @click="openUser(row.user_id)"
              >
                {{ shortId(row.user_id) }}
              </button>
              <span v-else class="muted">—</span>
            </td>
            <td class="mono">{{ row.page_path ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="hasMore && !loading" class="load-more">
      <button type="button" class="btn btn-ghost" :disabled="loadingMore" @click="fetchPage(true)">
        {{ loadingMore ? 'Načítavam…' : 'Načítať viac' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.consent-log-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: flex-end;
  padding: 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 8rem;
}
.field--grow {
  flex: 1;
  min-width: 12rem;
}
.field-label {
  font-size: 0.75rem;
  color: var(--muted, #666);
}
.toolbar-meta {
  margin: 0;
  width: 100%;
}
.load-more {
  display: flex;
  justify-content: center;
}
.link-btn {
  border: none;
  background: none;
  color: var(--accent, #0b6e4f);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}
</style>
