<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import { adminApi } from '../composables/adminApi'
import AdminPageHeader from '../components/layout/AdminPageHeader.vue'

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

const statusFilterOptions = [
  { label: 'Všetky', value: 'all' as const },
  { label: 'Koncepty', value: 'draft' as const },
  { label: 'Publikované', value: 'published' as const },
]

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
  <div class="admin-page">
    <AdminPageHeader title="Blog" subtitle="Marketingové články na /blog v PWA.">
      <template #actions>
        <Button label="Nový článok" @click="router.push({ name: 'blog-new' })" />
      </template>
    </AdminPageHeader>

    <section class="admin-section-card">
      <div class="flex flex-wrap items-center gap-3">
        <InputText
          v-model="search"
          type="search"
          class="min-w-48 flex-1 max-w-xs"
          placeholder="Hľadať podľa nadpisu alebo slugu…"
        />
        <SelectButton
          v-model="statusFilter"
          :options="statusFilterOptions"
          option-label="label"
          option-value="value"
        />
      </div>
    </section>

    <Message v-if="message" severity="error" :closable="false">{{ message }}</Message>

    <div v-if="loading" class="flex justify-center py-12">
      <ProgressSpinner />
    </div>

    <section v-else-if="filteredItems.length" class="admin-section-card !p-0">
      <DataTable :value="filteredItems" size="small" striped-rows class="text-sm">
        <Column header="Článok">
          <template #body="{ data: row }">
            <strong>{{ row.title }}</strong>
            <div class="mt-0.5 font-mono text-xs text-slate-500">/blog/{{ row.slug }}</div>
            <Tag v-if="row.is_featured" value="Featured" severity="success" class="mt-1" />
          </template>
        </Column>
        <Column header="Kategória">
          <template #body="{ data: row }">
            {{ categoryLabels[row.category] ?? row.category }}
          </template>
        </Column>
        <Column header="Stav">
          <template #body="{ data: row }">
            <Tag
              :value="row.status === 'published' ? 'Publikovaný' : 'Koncept'"
              :severity="row.status === 'published' ? 'success' : 'secondary'"
            />
          </template>
        </Column>
        <Column header="Publikované">
          <template #body="{ data: row }">{{ formatDate(row.published_at) }}</template>
        </Column>
        <Column header="Upravené">
          <template #body="{ data: row }">{{ formatDate(row.updated_at) }}</template>
        </Column>
        <Column>
          <template #body="{ data: row }">
            <Button label="Upraviť" severity="secondary" text size="small" @click="edit(row.id)" />
          </template>
        </Column>
      </DataTable>
    </section>

    <p v-else class="m-0 text-sm text-slate-500">Žiadne články.</p>
  </div>
</template>
