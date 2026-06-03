<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../composables/adminApi'
import { useConfirm } from '../composables/useConfirm'
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
  <div class="users-page">
    <header>
      <h1 class="page-title">Účty</h1>
      <p class="page-subtitle">Vyhľadávanie podľa e-mailu, mena alebo UUID</p>
    </header>

    <section class="section-card">
      <label class="field-label" for="user-search">Hľadať</label>
      <div class="users-search-row">
        <input
          id="user-search"
          v-model="query"
          class="field-input"
          placeholder="email, meno, UUID…"
          @keydown.enter="runSearch()"
        />
        <button type="button" class="btn btn-primary" :disabled="searching" @click="runSearch()">
          {{ searching ? 'Hľadám…' : 'Hľadať' }}
        </button>
      </div>
      <p v-if="searchError" class="error">{{ searchError }}</p>
    </section>

    <div class="users-layout">
      <section class="section-card users-results">
        <h2 class="section-title">Výsledky</h2>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Meno / firma</th>
                <th>E-mail</th>
                <th>Stav</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="u in results"
                :key="u.id"
                class="users-row"
                :class="{ 'users-row--active': selectedId === u.id }"
                @click="selectUser(u.id)"
              >
                <td>{{ u.company_name || u.display_name || shortId(u.id) }}</td>
                <td class="mono">{{ u.email ?? '—' }}</td>
                <td>{{ u.account_status ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!searching && results.length === 0" class="muted">Žiadne výsledky.</p>
      </section>

      <section v-if="selectedId" class="section-card users-detail">
        <h2 class="section-title">Detail</h2>
        <p v-if="detailLoading" class="muted">Načítavam detail…</p>
        <template v-else-if="detail">
          <dl class="users-dl">
            <dt class="field-label">ID</dt>
            <dd class="mono">{{ detail.id }}</dd>
            <dt class="field-label">E-mail</dt>
            <dd>{{ detail.email ?? '—' }}</dd>
            <dt class="field-label">Meno</dt>
            <dd>{{ detail.display_name ?? '—' }}</dd>
            <dt class="field-label">Firma</dt>
            <dd>{{ detail.company_name ?? '—' }}</dd>
            <dt class="field-label">Rola / stav</dt>
            <dd>{{ detail.app_role ?? '—' }} · {{ detail.account_status ?? '—' }}</dd>
            <dt class="field-label">Kredity</dt>
            <dd>{{ fmtNum(detail.credits) }}</dd>
            <dt class="field-label">Registrácia</dt>
            <dd>{{ detail.created_at }}</dd>
            <dt class="field-label">Posledné prihlásenie</dt>
            <dd>{{ detail.last_sign_in_at ?? '—' }}</dd>
          </dl>
          <label class="field-label" for="suspend-reason">Dôvod pozastavenia</label>
          <input id="suspend-reason" v-model="suspendReason" class="field-input" />
          <div class="users-actions">
            <button type="button" class="btn btn-primary" @click="suspendUser">Pozastaviť</button>
            <button type="button" class="btn btn-ghost" @click="unsuspendUser">Obnoviť</button>
            <button type="button" class="btn btn-ghost" @click="openInAudit">Zobraziť v audite</button>
            <RouterLink
              :to="{ name: 'support-user', params: { id: selectedId } }"
              class="btn btn-ghost"
            >
              Podpora (billing / GDPR)
            </RouterLink>
          </div>
          <p v-if="actionMessage" class="users-action-msg">{{ actionMessage }}</p>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.users-page {
  max-width: 1200px;
}

.users-search-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

.users-search-row .field-input {
  flex: 1;
}

.users-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 1rem;
}

@media (max-width: 900px) {
  .users-layout {
    grid-template-columns: 1fr;
  }
}

.users-row {
  cursor: pointer;
}

.users-row--active td {
  background: var(--g50);
}

.users-dl {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.35rem 0.75rem;
  margin: 0 0 1rem;
  font-size: 0.875rem;
}

.users-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.users-action-msg {
  margin-top: 0.75rem;
  font-size: 0.875rem;
  color: var(--g700);
}
</style>
