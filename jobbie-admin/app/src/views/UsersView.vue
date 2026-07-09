<script setup lang="ts">
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../composables/adminApi'
import { useConfirm } from '../composables/useConfirm'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'
import type { AdminUserDetail, AdminUserListItem } from '../types/users'
import { fmtNum } from '../utils/analytics-format'
import { shortId } from '../utils/audit-format'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()

const query = ref('')
const searching = ref(false)
const searchError = ref<string | null>(null)
const results = ref<AdminUserListItem[]>([])
const selectedId = ref<string | null>(null)
const detail = ref<AdminUserDetail | null>(null)
const detailLoading = ref(false)
const actionMessage = ref<string | null>(null)
const suspendReason = ref('')

async function runSearch() {
  const q = query.value.trim()
  if (!q) {
    results.value = []
    return
  }
  searching.value = true
  searchError.value = null
  const res = await adminApi<{ items: AdminUserListItem[] }>('/admin/users/search', {
    query: { q, limit: '20' },
  })
  searching.value = false
  if (!res.ok) {
    searchError.value = res.body.slice(0, 200) || `HTTP ${res.status}`
    results.value = []
    return
  }
  results.value = res.data?.items ?? []
  if (results.value.length === 1) {
    await selectUser(results.value[0]!.id)
  }
}

async function selectUser(id: string) {
  selectedId.value = id
  detailLoading.value = true
  actionMessage.value = null
  const res = await adminApi<AdminUserDetail>(`/admin/users/${id}`)
  detailLoading.value = false
  detail.value = res.ok ? (res.data ?? null) : null
  if (!res.ok) {
    actionMessage.value = 'Detail sa nepodarilo načítať.'
  }
  void router.replace({ name: 'users', query: { id } })
}

async function suspendUser() {
  if (!selectedId.value) return
  const ok = await confirm({
    title: 'Pozastaviť účet',
    message: `Naozaj pozastaviť účet ${selectedId.value}?`,
    confirmLabel: 'Pozastaviť',
    danger: true,
  })
  if (!ok) return
  const res = await adminApi(`/admin/users/${selectedId.value}/suspend`, {
    method: 'POST',
    body: { reason: suspendReason.value.trim() || undefined },
  })
  actionMessage.value = res.ok ? 'Účet bol pozastavený.' : `Chyba: ${res.body.slice(0, 120)}`
  if (res.ok) await selectUser(selectedId.value)
}

async function unsuspendUser() {
  if (!selectedId.value) return
  const ok = await confirm({
    title: 'Obnoviť účet',
    message: 'Zrušiť pozastavenie tohto účtu?',
    confirmLabel: 'Obnoviť',
  })
  if (!ok) return
  const res = await adminApi(`/admin/users/${selectedId.value}/unsuspend`, { method: 'POST' })
  actionMessage.value = res.ok ? 'Pozastavenie bolo zrušené.' : `Chyba: ${res.body.slice(0, 120)}`
  if (res.ok) await selectUser(selectedId.value)
}

function openInAudit() {
  if (!selectedId.value) return
  void router.push({ name: 'audit', query: { user_id: selectedId.value } })
}

watch(
  () => route.query.id,
  (id) => {
    if (typeof id === 'string' && id.trim()) {
      query.value = id
      void selectUser(id.trim())
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="admin-page">
    <AdminPageHeader
      title="Účty"
      subtitle="Vyhľadávanie podľa e-mailu, mena alebo UUID"
    />

    <section class="admin-section-card">
      <label for="user-search" class="mb-2 block text-sm font-medium text-slate-700">Hľadať</label>
      <div class="flex flex-wrap gap-2">
        <InputText
          id="user-search"
          v-model="query"
          placeholder="email, meno, UUID…"
          class="min-w-0 flex-1"
          @keydown.enter="runSearch()"
        />
        <Button
          :label="searching ? 'Hľadám…' : 'Hľadať'"
          :loading="searching"
          @click="runSearch()"
        />
      </div>
      <Message v-if="searchError" severity="error" :closable="false" class="mt-3">
        {{ searchError }}
      </Message>
    </section>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="admin-section-card">
        <h2 class="admin-section-title">Výsledky</h2>
        <DataTable
          :value="results"
          size="small"
          striped-rows
          selection-mode="single"
          :selection="results.find((u) => u.id === selectedId) ?? null"
          data-key="id"
          class="text-sm"
          @row-select="(e) => selectUser((e.data as AdminUserListItem).id)"
        >
          <Column header="Meno / firma">
            <template #body="{ data: row }">
              {{ row.company_name || row.display_name || shortId(row.id) }}
            </template>
          </Column>
          <Column header="E-mail">
            <template #body="{ data: row }">
              <span class="mono">{{ row.email ?? '—' }}</span>
            </template>
          </Column>
          <Column field="account_status" header="Stav" />
        </DataTable>
        <p v-if="!searching && results.length === 0" class="m-0 mt-2 text-sm text-slate-500">
          Žiadne výsledky.
        </p>
      </section>

      <section v-if="selectedId" class="admin-section-card">
        <h2 class="admin-section-title">Detail</h2>
        <div v-if="detailLoading" class="flex justify-center py-8">
          <ProgressSpinner />
        </div>
        <template v-else-if="detail">
          <dl class="mb-4 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
            <dt class="font-medium text-slate-600">ID</dt>
            <dd class="mono m-0">{{ detail.id }}</dd>
            <dt class="font-medium text-slate-600">E-mail</dt>
            <dd class="m-0">{{ detail.email ?? '—' }}</dd>
            <dt class="font-medium text-slate-600">Meno</dt>
            <dd class="m-0">{{ detail.display_name ?? '—' }}</dd>
            <dt class="font-medium text-slate-600">Firma</dt>
            <dd class="m-0">{{ detail.company_name ?? '—' }}</dd>
            <dt class="font-medium text-slate-600">Rola / stav</dt>
            <dd class="m-0">{{ detail.app_role ?? '—' }} · {{ detail.account_status ?? '—' }}</dd>
            <dt class="font-medium text-slate-600">Kredity</dt>
            <dd class="m-0">{{ fmtNum(detail.credits) }}</dd>
            <dt class="font-medium text-slate-600">Registrácia</dt>
            <dd class="m-0">{{ detail.created_at }}</dd>
            <dt class="font-medium text-slate-600">Posledné prihlásenie</dt>
            <dd class="m-0">{{ detail.last_sign_in_at ?? '—' }}</dd>
          </dl>
          <label for="suspend-reason-users" class="mb-2 block text-sm font-medium text-slate-700">
            Dôvod pozastavenia
          </label>
          <InputText id="suspend-reason-users" v-model="suspendReason" class="mb-4 w-full" />
          <div class="flex flex-wrap gap-2">
            <Button label="Pozastaviť" severity="danger" @click="suspendUser" />
            <Button label="Obnoviť" severity="secondary" @click="unsuspendUser" />
            <Button label="Zobraziť v audite" severity="secondary" @click="openInAudit" />
            <Button
              label="Podpora (billing / GDPR)"
              severity="secondary"
              @click="router.push({ name: 'support-user', params: { id: selectedId } })"
            />
          </div>
          <Message v-if="actionMessage" severity="info" :closable="false" class="mt-3">
            {{ actionMessage }}
          </Message>
        </template>
      </section>
    </div>
  </div>
</template>
