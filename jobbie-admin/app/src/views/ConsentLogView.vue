<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
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
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'

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

const presetOptions = [
  { label: '7 dní', value: '7d' as const },
  { label: '30 dní', value: '30d' as const },
  { label: '90 dní', value: '90d' as const },
]

const actionSelectOptions = [
  { label: 'Všetky', value: '' },
  ...actionOptions.map((a) => ({ label: a, value: a })),
]

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
      try {
        const parsed = JSON.parse(res.body) as { message?: string | string[] }
        const raw = parsed.message
        error.value = Array.isArray(raw) ? raw.join(' ') : (raw ?? res.body.slice(0, 200))
      } catch {
        error.value = res.body.slice(0, 200) || `HTTP ${res.status}`
      }
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
  <div class="admin-page">
    <AdminPageHeader
      title="Cookie súhlas"
      :subtitle="`Auditný záznam CMP (banner, nastavenia, footer). Recent login: ${recentLoginMinutes ?? '—'} min.`"
    />

    <section class="admin-section-card">
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex min-w-32 flex-col gap-1">
          <label class="text-xs font-medium text-slate-500">Obdobie</label>
          <Select
            v-model="preset"
            :options="presetOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
        <div class="flex min-w-32 flex-col gap-1">
          <label class="text-xs font-medium text-slate-500">Akcia</label>
          <Select
            v-model="actionFilter"
            :options="actionSelectOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
        <div class="flex min-w-48 flex-1 flex-col gap-1">
          <label class="text-xs font-medium text-slate-500">User ID</label>
          <InputText v-model="userIdFilter" class="w-full font-mono" placeholder="UUID účtu" />
        </div>
        <div class="flex min-w-48 flex-1 flex-col gap-1">
          <label class="text-xs font-medium text-slate-500">Visitor ID</label>
          <InputText
            v-model="visitorIdFilter"
            class="w-full font-mono"
            placeholder="jb_consent_vid"
          />
        </div>
      </div>
      <p v-if="dateLabel" class="m-0 mt-3 text-sm text-slate-500">{{ dateLabel }}</p>
    </section>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-else-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <section v-else class="admin-section-card">
      <DataTable :value="items" size="small" striped-rows class="text-sm">
        <template #empty>
          <span class="text-slate-500">Žiadne záznamy.</span>
        </template>
        <Column header="Čas">
          <template #body="{ data: row }">
            <span class="mono">{{ formatAuditTime(row.recorded_at) }}</span>
          </template>
        </Column>
        <Column field="action" header="Akcia" />
        <Column header="Kategórie">
          <template #body="{ data: row }">{{ categoriesLabel(row) }}</template>
        </Column>
        <Column header="Zdroj">
          <template #body="{ data: row }">{{ row.source ?? '—' }}</template>
        </Column>
        <Column header="Visitor">
          <template #body="{ data: row }">
            <span class="mono" :title="row.visitor_id">{{ shortId(row.visitor_id) }}</span>
          </template>
        </Column>
        <Column header="Účet">
          <template #body="{ data: row }">
            <Button
              v-if="row.user_id"
              :label="shortId(row.user_id)"
              severity="secondary"
              text
              size="small"
              class="!font-mono"
              @click="openUser(row.user_id)"
            />
            <span v-else class="text-slate-400">—</span>
          </template>
        </Column>
        <Column header="Cesta">
          <template #body="{ data: row }">
            <span class="mono">{{ row.page_path ?? '—' }}</span>
          </template>
        </Column>
      </DataTable>
    </section>

    <div v-if="hasMore && !loading" class="flex justify-center">
      <Button
        :label="loadingMore ? 'Načítavam…' : 'Načítať viac'"
        severity="secondary"
        :loading="loadingMore"
        @click="fetchPage(true)"
      />
    </div>
  </div>
</template>
