<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { adminApi } from '../composables/adminApi'
import { useConfirm } from '../composables/useConfirm'
import AdminRichTextEditor from '../components/AdminRichTextEditor.vue'
import AdminCoverUpload from '../components/AdminCoverUpload.vue'
import { buildBlogPublicUrl } from '../utils/pwa-public-url'

const { confirm } = useConfirm()

const route = useRoute()
const router = useRouter()
const isNew = computed(() => route.name === 'blog-new')
const postId = computed(() => (isNew.value ? null : String(route.params.id ?? '')))

const saving = ref(false)
const message = ref<string | null>(null)
const error = ref(false)

const slug = ref('')
const title = ref('')
const excerpt = ref('')
const bodyHtml = ref('')
const coverImageUrl = ref('')
const category = ref('tipy')
const status = ref<'draft' | 'published'>('draft')
const seoTitle = ref('')
const seoDescription = ref('')
const isFeatured = ref(false)
const readingTimeMinutes = ref<number | ''>('')
const slugError = ref<string | null>(null)

const categories = [
  { value: 'tipy', label: 'Tipy' },
  { value: 'kariera', label: 'Kariéra' },
  { value: 'brigady', label: 'Brigády' },
  { value: 'firmy', label: 'Firmy' },
  { value: 'novinky', label: 'Novinky' },
]

function buildBody() {
  return {
    slug: slug.value.trim() || undefined,
    title: title.value.trim(),
    excerpt: excerpt.value.trim() || null,
    body_html: bodyHtml.value,
    cover_image_url: coverImageUrl.value.trim() || null,
    category: category.value,
    status: status.value,
    seo_title: seoTitle.value.trim() || null,
    seo_description: seoDescription.value.trim() || null,
    is_featured: isFeatured.value,
    reading_time_minutes:
      readingTimeMinutes.value === '' ? undefined : Number(readingTimeMinutes.value),
  }
}

async function loadPost() {
  if (!postId.value) return
  const res = await adminApi<Record<string, unknown>>(`/admin/blog/${postId.value}`)
  if (!res.ok || !res.data) {
    message.value = `Chyba načítania: ${res.status}`
    error.value = true
    return
  }
  const p = res.data
  slug.value = String(p.slug ?? '')
  title.value = String(p.title ?? '')
  excerpt.value = String(p.excerpt ?? '')
  bodyHtml.value = String(p.body_html ?? '')
  coverImageUrl.value = String(p.cover_image_url ?? '')
  category.value = String(p.category ?? 'tipy')
  status.value = (p.status === 'published' ? 'published' : 'draft') as 'draft' | 'published'
  seoTitle.value = String(p.seo_title ?? '')
  seoDescription.value = String(p.seo_description ?? '')
  isFeatured.value = Boolean(p.is_featured)
  readingTimeMinutes.value =
    p.reading_time_minutes != null ? Number(p.reading_time_minutes) : ''
}

async function save() {
  message.value = null
  error.value = false
  if (!title.value.trim()) {
    message.value = 'Nadpis je povinný.'
    error.value = true
    return
  }
  if (!bodyHtml.value.replace(/<[^>]+>/g, '').trim()) {
    message.value = 'Telo článku je povinné.'
    error.value = true
    return
  }
  saving.value = true
  const body = buildBody()
  let res: Awaited<ReturnType<typeof adminApi<Record<string, unknown>>>>
  try {
    res = isNew.value
      ? await adminApi<Record<string, unknown>>('/admin/blog', { method: 'POST', body })
      : await adminApi<Record<string, unknown>>(`/admin/blog/${postId.value}`, {
          method: 'PATCH',
          body,
        })
  } finally {
    saving.value = false
  }
  if (res.ok && res.data) {
    message.value = 'Uložené.'
    error.value = false
    if (isNew.value && res.data.id) {
      await router.replace({ name: 'blog-edit', params: { id: String(res.data.id) } })
    }
  } else {
    error.value = true
    const errBody = res.ok ? '' : res.body
    slugError.value = parseApiSlugError(errBody)
    message.value = res.ok ? 'Uloženie zlyhalo.' : formatApiError(res.status, errBody)
  }
}

function parseApiSlugError(body: string): string | null {
  try {
    const j = JSON.parse(body) as { message?: string | string[] }
    const msg = Array.isArray(j.message) ? j.message.join(', ') : j.message
    if (msg && /slug/i.test(msg)) return msg
  } catch {
    if (/slug/i.test(body)) return body.slice(0, 300)
  }
  return null
}

function formatApiError(status: number, body: string): string {
  const slug = parseApiSlugError(body)
  if (slug) return slug
  return `Chyba ${status}: ${body.slice(0, 200)}`
}

function openPreview() {
  const s = slug.value.trim()
  if (!s) {
    message.value = 'Najprv zadajte slug.'
    error.value = true
    return
  }
  window.open(buildBlogPublicUrl(s), '_blank', 'noopener,noreferrer')
}

async function publish() {
  if (!postId.value) {
    await save()
    return
  }
  await save()
  if (error.value) return
  saving.value = true
  const res = await adminApi<Record<string, unknown>>(`/admin/blog/${postId.value}/publish`, {
    method: 'POST',
  })
  saving.value = false
  if (res.ok) {
    status.value = 'published'
    message.value = 'Publikované.'
    error.value = false
  } else {
    error.value = true
    message.value = `Chyba ${res.status}: ${res.body}`
  }
}

async function unpublish() {
  if (!postId.value) return
  saving.value = true
  const res = await adminApi<Record<string, unknown>>(`/admin/blog/${postId.value}/unpublish`, {
    method: 'POST',
  })
  saving.value = false
  if (res.ok) {
    status.value = 'draft'
    message.value = 'Zrušené publikovanie.'
    error.value = false
  } else {
    error.value = true
    message.value = `Chyba ${res.status}: ${res.body}`
  }
}

async function removePost() {
  if (!postId.value) return
  const ok = await confirm({
    title: 'Zmazať článok',
    message: 'Zmazať tento článok natrvalo?',
    confirmLabel: 'Zmazať',
    danger: true,
  })
  if (!ok) return
  const res = await adminApi<{ ok: true }>(`/admin/blog/${postId.value}`, { method: 'DELETE' })
  if (res.ok) {
    await router.push({ name: 'blog' })
  } else {
    error.value = true
    message.value = `Chyba ${res.status}: ${res.body}`
  }
}

onMounted(() => {
  if (!isNew.value) void loadPost()
})
</script>

<template>
  <div>
    <button type="button" class="btn btn-ghost" style="margin-bottom: 0.75rem" @click="router.push({ name: 'blog' })">
      ← Späť na zoznam
    </button>
    <h1 class="page-title" style="margin-bottom: 1rem">
      {{ isNew ? 'Nový článok' : 'Upraviť článok' }}
    </h1>

    <div class="blog-edit-layout">
      <div class="card" style="display: flex; flex-direction: column; gap: 1rem">
        <div>
          <label class="field-label">Nadpis *</label>
          <input v-model="title" class="field-input" maxlength="300" />
        </div>

        <div>
          <label class="field-label">Perex</label>
          <p style="margin: 0 0 0.5rem; font-size: 0.75rem; color: var(--ink3)">
            Krátky úvodný text pod nadpisom na stránke článku. Ak necháte prázdne, použije sa SEO popis alebo úryvok z tela.
          </p>
          <textarea v-model="excerpt" class="field-textarea" maxlength="500" rows="3" />
        </div>

        <div>
          <label class="field-label">Telo článku *</label>
          <p style="margin: 0 0 0.5rem; font-size: 0.75rem; color: var(--ink3)">
            Nadpisy H2 sa zobrazia v obsahu článku (TOC). Citát slúži pre tipy.
          </p>
          <AdminRichTextEditor v-model="bodyHtml" :disabled="saving" />
        </div>

        <div>
          <label class="field-label">Titulná fotka</label>
          <p style="margin: 0 0 0.5rem; font-size: 0.75rem; color: var(--ink3)">
            Voliteľná. Ak ju nenahrajete, na webe sa použije prvý obrázok z tela článku.
          </p>
          <AdminCoverUpload v-model="coverImageUrl" />
        </div>
      </div>

      <aside style="display: flex; flex-direction: column; gap: 1rem">
        <div class="card" style="display: flex; flex-direction: column; gap: 0.75rem">
          <div>
            <label class="field-label">Slug</label>
            <input
              v-model="slug"
              class="field-input"
              maxlength="120"
              placeholder="auto z nadpisu"
              style="font-family: ui-monospace, monospace; font-size: 0.85rem"
            />
            <p v-if="slugError" class="error" style="margin: 0.35rem 0 0; font-size: 0.8rem">
              {{ slugError }}
            </p>
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              style="margin-top: 0.35rem"
              @click="openPreview"
            >
              Náhľad na webe
            </button>
          </div>
          <div>
            <label class="field-label">Kategória</label>
            <select v-model="category" class="field-select">
              <option v-for="c in categories" :key="c.value" :value="c.value">{{ c.label }}</option>
            </select>
          </div>
          <div>
            <label class="field-label">Stav</label>
            <select v-model="status" class="field-select">
              <option value="draft">Koncept</option>
              <option value="published">Publikovaný</option>
            </select>
          </div>
          <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600">
            <input v-model="isFeatured" type="checkbox" />
            Zvýrazniť na archive
          </label>
          <div>
            <label class="field-label">Čas čítania (min)</label>
            <input
              v-model.number="readingTimeMinutes"
              type="number"
              min="1"
              max="120"
              class="field-input"
              placeholder="auto"
              style="max-width: 8rem"
            />
          </div>
        </div>

        <div class="card" style="display: flex; flex-direction: column; gap: 0.75rem">
          <div>
            <label class="field-label">SEO nadpis</label>
            <input v-model="seoTitle" class="field-input" maxlength="200" />
          </div>
          <div>
            <label class="field-label">SEO popis</label>
            <textarea v-model="seoDescription" class="field-textarea" maxlength="400" rows="3" />
          </div>
        </div>

        <p style="margin: 0; font-size: 0.8125rem; line-height: 1.45; color: var(--ink3)">
          <strong>Uložiť</strong> uloží koncept (alebo publikuje, ak je stav „Publikovaný“).
          Na webe sa článok zobrazí až po <strong>Publikovať</strong> alebo po uložení so stavom Publikovaný.
        </p>

        <div class="card" style="display: flex; flex-wrap: gap: 0.5rem">
          <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
            {{ saving ? 'Ukladám…' : 'Uložiť' }}
          </button>
          <button
            v-if="postId && status !== 'published'"
            type="button"
            class="btn btn-ghost"
            :disabled="saving"
            @click="publish"
          >
            Publikovať
          </button>
          <button
            v-if="postId && status === 'published'"
            type="button"
            class="btn btn-ghost"
            :disabled="saving"
            @click="unpublish"
          >
            Zrušiť publikovanie
          </button>
          <button
            v-if="postId"
            type="button"
            class="btn btn-danger"
            :disabled="saving"
            @click="removePost"
          >
            Zmazať
          </button>
        </div>

        <p v-if="message" :class="error ? 'error' : 'success'" style="margin: 0">{{ message }}</p>
      </aside>
    </div>
  </div>
</template>
