<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi } from '../composables/adminApi'

type BlogRow = {
  id: string
  slug: string
  title: string
  category: string
  status: string
  published_at: string | null
  is_featured: boolean
  created_at: string
  updated_at: string
}

const router = useRouter()
const items = ref<BlogRow[]>([])
const loading = ref(true)
const message = ref<string | null>(null)
const statusFilter = ref<'all' | 'draft' | 'published'>('all')
const search = ref('')

const categoryLabels: Record<string, string> = {
  tipy: 'Tipy',
  kariera: 'Kariéra',
  brigady: 'Brigády',
  firmy: 'Firmy',
  novinky: 'Novinky',
}

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(
    (r) => r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q),
  )
})

async function load() {
  loading.value = true
  message.value = null
  try {
    const res = await adminApi<{ items: BlogRow[] }>('/admin/blog', {
      query: {
        status: statusFilter.value,
        ...(search.value.trim() ? { q: search.value.trim() } : {}),
      },
    })
    if (res.ok && res.data) {
      items.value = res.data.items
    } else {
      message.value = res.ok ? 'Načítanie zlyhalo.' : `Chyba ${res.status}: ${res.body}`
    }
  } finally {
    loading.value = false
  }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('sk-SK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(() => {
  void load()
})

watch(statusFilter, () => {
  void load()
})

let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => void load(), 300)
})

function edit(id: string) {
  void router.push({ name: 'blog-edit', params: { id } })
}
</script>

<template>
  <div>
    <div style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.25rem">
      <div>
        <h1 class="page-title">Blog</h1>
        <p class="page-subtitle">
          Marketingové články na <strong>/blog</strong> v PWA.
        </p>
      </div>
      <button type="button" class="btn btn-primary" @click="router.push({ name: 'blog-new' })">
        Nový článok
      </button>
    </div>

    <div class="card" style="margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center">
      <input
        v-model="search"
        type="search"
        class="field-input"
        placeholder="Hľadať podľa nadpisu alebo slugu…"
        style="max-width: 280px; flex: 1; min-width: 180px"
      >
      <div style="display: flex; gap: 0.35rem">
        <button
          v-for="s in ['all', 'draft', 'published'] as const"
          :key="s"
          type="button"
          class="btn"
          :class="statusFilter === s ? 'btn-primary' : 'btn-ghost'"
          @click="statusFilter = s"
        >
          {{ s === 'all' ? 'Všetky' : s === 'draft' ? 'Koncepty' : 'Publikované' }}
        </button>
      </div>
    </div>

    <p v-if="message" class="error">{{ message }}</p>
    <p v-if="loading" style="color: var(--ink3)">Načítavam…</p>

    <div v-else-if="filteredItems.length" class="card" style="padding: 0; overflow: hidden">
      <table class="data-table">
        <thead>
          <tr>
            <th>Článok</th>
            <th>Kategória</th>
            <th>Stav</th>
            <th>Publikované</th>
            <th>Upravené</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredItems" :key="row.id">
            <td>
              <strong>{{ row.title }}</strong>
              <div style="color: var(--ink3); font-family: ui-monospace, monospace; font-size: 0.75rem">
                /blog/{{ row.slug }}
              </div>
              <span v-if="row.is_featured" class="badge badge-published" style="margin-top: 0.35rem">Featured</span>
            </td>
            <td>{{ categoryLabels[row.category] ?? row.category }}</td>
            <td>
              <span
                class="badge"
                :class="row.status === 'published' ? 'badge-published' : 'badge-draft'"
              >
                {{ row.status === 'published' ? 'Publikovaný' : 'Koncept' }}
              </span>
            </td>
            <td>{{ formatDate(row.published_at) }}</td>
            <td>{{ formatDate(row.updated_at) }}</td>
            <td>
              <button type="button" class="btn btn-ghost" @click="edit(row.id)">Upraviť</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="card" style="color: var(--ink3); margin: 0">Žiadne články.</p>
  </div>
</template>
