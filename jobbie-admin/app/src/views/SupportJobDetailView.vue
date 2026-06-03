<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../composables/adminApi'
import { useConfirm } from '../composables/useConfirm'
import type { AdminJobDetail } from '../types/support'
import { fmtNum } from '../utils/analytics-format'

const route = useRoute()
const router = useRouter()
const { confirm } = useConfirm()

const id = computed(() => String(route.params.id ?? ''))
const loading = ref(true)
const error = ref<string | null>(null)
const job = ref<AdminJobDetail | null>(null)
const message = ref<string | null>(null)

async function load() {
  loading.value = true
  error.value = null
  const res = await adminApi<AdminJobDetail>(`/admin/jobs/${id.value}`)
  loading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 200) || `HTTP ${res.status}`
    job.value = null
    return
  }
  job.value = res.data ?? null
}

async function unpublish() {
  const ok = await confirm({
    title: 'Stiahnuť ponuku',
    message: 'Ponuka bude označená ako neaktívna / koncept. Pokračovať?',
    confirmLabel: 'Stiahnuť',
    danger: true,
  })
  if (!ok) return
  const res = await adminApi(`/admin/jobs/${id.value}/unpublish`, { method: 'POST' })
  message.value = res.ok ? 'Ponuka bola stiahnutá.' : res.body.slice(0, 120)
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
      <h1 class="page-title">Ponuka</h1>
      <p class="page-subtitle mono">{{ id }}</p>
    </header>

    <p v-if="error" class="error card">{{ error }}</p>
    <p v-else-if="loading" class="muted">Načítavam…</p>

    <section v-else-if="job" class="section-card">
      <h2>{{ job.title || 'Bez názvu' }}</h2>
      <dl class="detail-dl">
        <dt>Stav</dt>
        <dd>{{ job.status_label }}</dd>
        <dt>Vlastník</dt>
        <dd>
          <RouterLink
            v-if="job.owner_id"
            :to="{ name: 'support-user', params: { id: job.owner_id } }"
          >
            {{ job.owner_id }}
          </RouterLink>
          <span v-else>—</span>
        </dd>
        <dt>Kredity (publish)</dt>
        <dd>{{ fmtNum(job.credits_spent) }}</dd>
        <dt>Vytvorené</dt>
        <dd>{{ job.created_at }}</dd>
        <dt>Publikované</dt>
        <dd>{{ job.published_at ?? '—' }}</dd>
      </dl>
      <div class="detail-actions">
        <a
          v-if="job.public_url"
          :href="job.public_url"
          class="btn btn-ghost"
          target="_blank"
          rel="noopener noreferrer"
        >
          Verejná URL
        </a>
        <button type="button" class="btn btn-primary" @click="unpublish">Stiahnuť</button>
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
