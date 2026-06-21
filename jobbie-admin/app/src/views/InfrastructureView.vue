<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { adminApi } from '../composables/adminApi'
import type { AdminInfrastructure } from '../types/infrastructure'
import VpsEnvironmentCard from '../components/infrastructure/VpsEnvironmentCard.vue'

const AUTO_REFRESH_MS = 60_000

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<AdminInfrastructure | null>(null)
const lastUpdated = ref<string | null>(null)
const autoRefresh = ref(true)

let refreshTimer: ReturnType<typeof setInterval> | null = null

async function load() {
  loading.value = true
  error.value = null
  const res = await adminApi<AdminInfrastructure>('/admin/infrastructure')
  loading.value = false
  if (!res.ok) {
    error.value = res.body.slice(0, 400) || `HTTP ${res.status}`
    return
  }
  data.value = res.data ?? null
  lastUpdated.value = new Date().toLocaleString('sk-SK')
}

function startAutoRefresh() {
  stopAutoRefresh()
  if (!autoRefresh.value) return
  refreshTimer = setInterval(() => {
    void load()
  }, AUTO_REFRESH_MS)
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value
  if (autoRefresh.value) startAutoRefresh()
  else stopAutoRefresh()
}

onMounted(() => {
  void load()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<template>
  <div class="infra-page">
    <header class="infra-page__header">
      <div>
        <h1 class="page-title">Infra</h1>
        <p class="page-subtitle">Prevádzka VPS — staging a production</p>
      </div>
      <div class="infra-page__actions">
        <label class="infra-auto">
          <input
            type="checkbox"
            :checked="autoRefresh"
            @change="toggleAutoRefresh"
          />
          Auto 60s
        </label>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="loading"
          @click="load()"
        >
          {{ loading ? 'Načítavam…' : 'Obnoviť' }}
        </button>
      </div>
    </header>

    <p v-if="lastUpdated" class="muted infra-updated">
      Posledná aktualizácia: {{ lastUpdated }}
    </p>

    <p v-if="error" class="error card">{{ error }}</p>
    <p v-else-if="loading && !data" class="muted">Načítavam metriky VPS…</p>

    <div v-if="data" class="infra-grid">
      <VpsEnvironmentCard
        v-for="env in data.environments"
        :key="env.id"
        :env="env"
      />
    </div>
  </div>
</template>

<style scoped>
.infra-page {
  max-width: 1200px;
}

.infra-page__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.infra-page__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.infra-auto {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--ink2);
  cursor: pointer;
}

.infra-updated {
  font-size: 0.85rem;
  margin: 0 0 1rem;
}

.infra-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
}

@media (max-width: 900px) {
  .infra-grid {
    grid-template-columns: 1fr;
  }
}
</style>
