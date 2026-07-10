<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { adminApi } from '../composables/adminApi'
import { useAdminAuth } from '../composables/adminAuth'
import { useConfirm } from '../composables/useConfirm'
import {
  ensureAdminRecentLoginConfig,
  useAdminRecentLogin,
} from '../composables/useAdminRecentLogin'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'
import type {
  ContractWithdrawalItem,
  ContractWithdrawalListResponse,
  ContractWithdrawalStatus,
} from '../types/contract-withdrawals'
import {
  auditPresetToRange,
  formatAuditTime,
  formatDateRangeLabel,
} from '../utils/audit-format'
import {
  contractWithdrawalProductLabel,
  contractWithdrawalReasonLabel,
  contractWithdrawalStatusFilterOptions,
  contractWithdrawalStatusLabel,
  contractWithdrawalStatusOptions,
} from '../utils/contract-withdrawal-labels'
import { formatAdminApiError } from '../utils/format-admin-api-error'

const { recentLoginMinutes } = useAdminRecentLogin()
const { confirm } = useConfirm()
const { signOut } = useAdminAuth()
const router = useRouter()

onMounted(() => {
  void ensureAdminRecentLoginConfig()
})

const preset = ref<'7d' | '30d' | '90d' | 'all'>('30d')
const statusFilter = ref('')
const searchQuery = ref('')
const limit = ref(50)

const loading = ref(true)
const loadingMore = ref(false)
const error = ref<string | null>(null)
const actionError = ref<string | null>(null)
const actionSuccess = ref<string | null>(null)
const needsReLogin = ref(false)
const updatingId = ref<string | null>(null)
const items = ref<ContractWithdrawalItem[]>([])
const nextCursor = ref<string | null>(null)
const dateLabel = ref('')

const presetOptions = [
  { label: '7 dní', value: '7d' as const },
  { label: '30 dní', value: '30d' as const },
  { label: '90 dní', value: '90d' as const },
  { label: 'Všetko', value: 'all' as const },
]

const hasMore = computed(() => Boolean(nextCursor.value))

function statusSeverity(
  status: ContractWithdrawalStatus,
): 'warn' | 'success' | 'danger' | 'secondary' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'pending') return 'warn'
  return 'secondary'
}

function filterQuery(): Record<string, string> {
  const q: Record<string, string> = {
    limit: String(limit.value),
  }
  if (statusFilter.value) {
    q.status = statusFilter.value
  }
  const term = searchQuery.value.trim()
  if (term) {
    q.q = term
  }
  if (preset.value !== 'all') {
    const range = auditPresetToRange(preset.value)
    dateLabel.value = formatDateRangeLabel(range.from, range.to)
    q.from = range.from
    q.to = range.to
  } else {
    dateLabel.value = 'Všetky záznamy'
  }
  return q
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
    const res = await adminApi<ContractWithdrawalListResponse>(
      '/admin/contract-withdrawals',
      { query },
    )
    if (!res.ok) {
      const { message } = formatAdminApiError(res.status, res.body)
      error.value = message
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

async function goReLogin() {
  await signOut()
  await router.push({
    name: 'login',
    query: { redirect: '/contract-withdrawals' },
  })
}

async function onStatusChange(
  row: ContractWithdrawalItem,
  nextStatus: ContractWithdrawalStatus,
) {
  if (nextStatus === row.status) return

  if (nextStatus === 'rejected') {
    const ok = await confirm({
      title: 'Zamietnuť žiadosť?',
      message: `Zamietnuť žiadosť od ${row.name} (faktúra ${row.invoice_number})?`,
      confirmLabel: 'Zamietnuť',
      cancelLabel: 'Zrušiť',
      destructive: true,
    })
    if (!ok) return
  }

  actionError.value = null
  actionSuccess.value = null
  needsReLogin.value = false
  updatingId.value = row.id

  try {
    const res = await adminApi<ContractWithdrawalItem>(
      `/admin/contract-withdrawals/${row.id}`,
      {
        method: 'PATCH',
        body: { status: nextStatus },
      },
    )
    if (!res.ok) {
      const { message, hints } = formatAdminApiError(res.status, res.body)
      actionError.value = message
      needsReLogin.value = hints.needsReLogin
      await fetchPage(false)
      return
    }
    actionSuccess.value = `Stav žiadosti ${row.invoice_number} bol aktualizovaný.`
    const updated = res.data
    if (updated) {
      const idx = items.value.findIndex((item) => item.id === row.id)
      if (idx >= 0) {
        items.value[idx] = updated
      }
    }
  } finally {
    updatingId.value = null
  }
}

watch([preset, statusFilter, searchQuery, limit], () => {
  void fetchPage(false)
})

onMounted(() => {
  void fetchPage(false)
})
</script>

<template>
  <div class="admin-page">
    <AdminPageHeader
      title="Odstúpenie od zmluvy"
      :subtitle="`Žiadosti z verejného formulára. Recent login: ${recentLoginMinutes ?? '—'} min.`"
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
        <div class="flex min-w-40 flex-col gap-1">
          <label class="text-xs font-medium text-slate-500">Stav</label>
          <Select
            v-model="statusFilter"
            :options="contractWithdrawalStatusFilterOptions"
            option-label="label"
            option-value="value"
            class="w-full"
          />
        </div>
        <div class="flex min-w-56 flex-1 flex-col gap-1">
          <label class="text-xs font-medium text-slate-500">Hľadať</label>
          <InputText
            v-model="searchQuery"
            class="w-full"
            placeholder="E-mail alebo číslo faktúry"
          />
        </div>
      </div>
      <p v-if="dateLabel" class="m-0 mt-3 text-sm text-slate-500">{{ dateLabel }}</p>
    </section>

    <Message v-if="needsReLogin" severity="warn" :closable="false" class="w-full">
      <div class="flex flex-wrap items-center gap-3">
        <span>Pre zmenu stavu sa znova prihláste (recent login).</span>
        <Button label="Prihlásiť sa" size="small" @click="goReLogin" />
      </div>
    </Message>

    <Message v-if="actionError" severity="error" :closable="false">{{ actionError }}</Message>
    <Message v-if="actionSuccess" severity="success" :closable="false">{{ actionSuccess }}</Message>
    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <section v-else class="admin-section-card">
      <DataTable :value="items" size="small" striped-rows class="text-sm">
        <template #empty>
          <span class="text-slate-500">Žiadne žiadosti.</span>
        </template>
        <Column header="Odoslané">
          <template #body="{ data: row }">
            <span class="mono">{{ formatAuditTime(row.submitted_at) }}</span>
          </template>
        </Column>
        <Column field="name" header="Meno" />
        <Column field="email" header="E-mail" />
        <Column header="Produkt">
          <template #body="{ data: row }">
            {{ contractWithdrawalProductLabel(row.product) }}
          </template>
        </Column>
        <Column field="invoice_number" header="Faktúra" />
        <Column header="Nákup">
          <template #body="{ data: row }">{{ row.purchase_date }}</template>
        </Column>
        <Column header="Dôvod">
          <template #body="{ data: row }">
            {{ contractWithdrawalReasonLabel(row.reason, row.reason_other) }}
          </template>
        </Column>
        <Column header="Stav">
          <template #body="{ data: row }">
            <div class="flex min-w-44 flex-col gap-2">
              <Tag
                :value="contractWithdrawalStatusLabel(row.status)"
                :severity="statusSeverity(row.status)"
              />
              <Select
                :model-value="row.status"
                :options="contractWithdrawalStatusOptions"
                option-label="label"
                option-value="value"
                class="w-full"
                :disabled="updatingId === row.id"
                @update:model-value="onStatusChange(row, $event)"
              />
            </div>
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
