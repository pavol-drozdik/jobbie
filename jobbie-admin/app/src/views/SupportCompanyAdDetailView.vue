<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../composables/adminApi'
import { useConfirm } from '../composables/useConfirm'
import type { AdminCompanyAdDetail } from '../types/support'
import { fmtNum } from '../utils/analytics-format'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const loading = ref(true)
const error = ref<string | null>(null)
const ad = ref<AdminCompanyAdDetail | null>(null)
const message = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  const res = await adminApi<AdminCompanyAdDetail>(`/admin/company-ads/${id.value}`)
  loading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 200) || `HTTP ${res.status}`
    ad.value = null
    return
  }
  ad.value = res.data ?? null
}

async function unpublish() {
  const ok = await confirm({
    title: 'Skryť inzerát',
    message: 'Inzerát bude označený ako skrytý. Pokračovať?',
    confirmLabel: 'Skryť',
    danger: true,
  })
  if (!ok) return
  const res = await adminApi(`/admin/company-ads/${id.value}/unpublish`, { method: 'POST' })
  message.value = res.ok ? 'Inzerát bol skrytý.' : res.body.slice(0, 120)
  if (res.ok) await load()
}

onMounted(() => void load())
</script>

<template>
  <div class="support-detail">
    <header>
      <button type="button" class="btn btn-ghost btn-sm" @click="router.push('/support')">
        ← Podpora
      </button>
      <h1 class="page-title">Firemný inzerát</h1>
      <p class="page-subtitle mono">{{ id }}</p>
    </header>

    <p v-if="error" class="error card">{{ error }}</p>
    <p v-else-if="loading" class="muted">Načítavam…</p>

    <section v-else-if="ad" class="section-card">
      <h2>{{ ad.title || 'Bez názvu' }}</h2>
      <dl class="detail-dl">
        <dt>Stav</dt>
        <dd>{{ ad.status ?? '—' }}</dd>
        <dt>Vlastník</dt>
        <dd>
          <RouterLink
            v-if="ad.owner_id"
            :to="{ name: 'support-user', params: { id: ad.owner_id } }"
          >
            {{ ad.owner_id }}
          </RouterLink>
          <span v-else>—</span>
        </dd>
        <dt>Lokalita</dt>
        <dd>{{ [ad.city, ad.region].filter(Boolean).join(', ') || '—' }}</dd>
        <dt>Kredity</dt>
        <dd>{{ fmtNum(ad.credits_spent) }}</dd>
        <dt>Vytvorené</dt>
        <dd>{{ ad.created_at }}</dd>
      </dl>
      <div class="detail-actions">
        <a
          v-if="ad.public_url"
          :href="ad.public_url"
          class="btn btn-ghost"
          target="_blank"
          rel="noopener noreferrer"
        >
          Verejná URL
        </a>
        <button type="button" class="btn btn-primary" @click="unpublish">Skryť</button>
      </div>
      <p v-if="message" class="muted">{{ message }}</p>
    </section>
  </div>
</template>

<style scoped>
.detail-dl {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 0.35rem 0.75rem;
  font-size: 0.875rem;
  margin: 1rem 0;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
